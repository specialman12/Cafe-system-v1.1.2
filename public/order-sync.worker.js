/**
 * Smart Menu System - Order Sync Background Worker (JavaScript Bundle)
 * File: public/order-sync.worker.js
 *
 * Runs in a separate background thread (Web Worker) to query server order status
 * every 5 seconds (configurable) and instantly synchronize application state.
 */

(function () {
  let syncTimer = null;
  let pollInterval = 3000; // 3s fallback interval so real-time SSE handles immediate pushes without thread lag
  let isRunning = false;
  let lastOrdersHash = '';
  let lastBillsHash = '';
  let isFetching = false;
  let failedAttempts = 0;

  const ENDPOINTS = {
    orders: '/api/orders',
    bills: '/api/bills',
    status: '/api/orders/status'
  };

  function computeFingerprint(data) {
    if (!Array.isArray(data)) return '';
    if (data.length === 0) return 'empty_0';
    return data
      .map(function (item) {
        const id = item.id || '';
        const status = item.status || 'pending';
        const updated = item.updatedAt || item.createdAt || item.timestamp || '';
        const total = item.total || 0;
        const itemsCount = Array.isArray(item.items) ? item.items.length : 0;
        const billReq = item.billRequested ? '1' : '0';
        return id + '_' + status + '_' + updated + '_' + total + '_' + itemsCount + '_' + billReq;
      })
      .join('|');
  }

  function computeBillsFingerprint(data) {
    if (!Array.isArray(data)) return '';
    if (data.length === 0) return 'empty_bills_0';
    return data
      .map(function (item) {
        const id = item.id || '';
        const table = item.tableNumber || '';
        const status = item.status || 'pending';
        const requestedAt = item.requestedAt || '';
        const settledAt = item.settledAt || '';
        return id + '_' + table + '_' + status + '_' + requestedAt + '_' + settledAt;
      })
      .join('|');
  }

  async function fetchOrdersAndBills(source) {
    source = source || 'worker-poll';
    if (isFetching) return;
    isFetching = true;

    try {
      const ordersPromise = fetch(ENDPOINTS.orders, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      const billsPromise = fetch(ENDPOINTS.bills, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      const results = await Promise.allSettled([ordersPromise, billsPromise]);
      const ordersRes = results[0];
      const billsRes = results[1];

      if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
        const orders = await ordersRes.value.json();
        if (Array.isArray(orders)) {
          const currentHash = computeFingerprint(orders);
          const hasChanged = currentHash !== lastOrdersHash;

          self.postMessage({
            type: 'ORDERS_SYNCED',
            orders: orders,
            timestamp: Date.now(),
            source: source,
            changed: hasChanged
          });

          lastOrdersHash = currentHash;
          failedAttempts = 0;
        }
      } else {
        failedAttempts++;
      }

      if (billsRes.status === 'fulfilled' && billsRes.value.ok) {
        const bills = await billsRes.value.json();
        if (Array.isArray(bills)) {
          const currentBillsHash = computeBillsFingerprint(bills);
          const hasChanged = currentBillsHash !== lastBillsHash;

          self.postMessage({
            type: 'BILLS_SYNCED',
            bills: bills,
            timestamp: Date.now(),
            source: source,
            changed: hasChanged
          });

          lastBillsHash = currentBillsHash;
        }
      }
    } catch (err) {
      failedAttempts++;
      self.postMessage({
        type: 'ERROR',
        error: err && err.message ? err.message : 'Network error in order sync worker',
        timestamp: Date.now(),
        source: source
      });
    } finally {
      isFetching = false;
    }
  }

  function startSync() {
    if (isRunning) return;
    isRunning = true;

    fetchOrdersAndBills('worker-init');

    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(function () {
      fetchOrdersAndBills('worker-poll');
    }, pollInterval);

    self.postMessage({
      type: 'SYNC_STATUS',
      status: 'running',
      intervalMs: pollInterval,
      timestamp: Date.now(),
      source: 'worker-init'
    });
  }

  function stopSync() {
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
    isRunning = false;
    self.postMessage({
      type: 'SYNC_STATUS',
      status: 'stopped',
      timestamp: Date.now(),
      source: 'worker-manual'
    });
  }

  self.onmessage = function (event) {
    const data = event.data;
    if (!data || !data.type) return;

    switch (data.type) {
      case 'START':
        if (data.intervalMs && data.intervalMs >= 1000) {
          pollInterval = data.intervalMs;
        }
        startSync();
        break;

      case 'STOP':
        stopSync();
        break;

      case 'SYNC_NOW':
        fetchOrdersAndBills('worker-manual');
        break;

      case 'SET_INTERVAL':
        if (data.intervalMs && data.intervalMs >= 1000) {
          pollInterval = data.intervalMs;
          if (isRunning) {
            if (syncTimer) clearInterval(syncTimer);
            syncTimer = setInterval(function () {
              fetchOrdersAndBills('worker-poll');
            }, pollInterval);
          }
        }
        break;

      case 'CONFIG':
        if (data.endpoints) {
          Object.assign(ENDPOINTS, data.endpoints);
        }
        if (data.intervalMs && data.intervalMs >= 1000) {
          pollInterval = data.intervalMs;
        }
        break;

      default:
        break;
    }
  };

  startSync();
})();
