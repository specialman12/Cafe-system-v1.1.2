/// <reference lib="webworker" />

/**
 * Smart Menu System - Order Sync Background Worker
 * File: public/order-sync.worker.ts
 *
 * Runs in a separate background thread (Web Worker) to query server order status
 * every 5 seconds (configurable) and instantly synchronize application state.
 * Prevents UI latency, tab throttling issues, and data conflicts.
 */

export interface SyncWorkerMessage {
  type: 'START' | 'STOP' | 'SYNC_NOW' | 'SET_INTERVAL' | 'CONFIG';
  intervalMs?: number;
  facilityId?: string;
  endpoints?: {
    orders?: string;
    bills?: string;
    status?: string;
  };
}

export interface WorkerResponsePayload {
  type: 'ORDERS_SYNCED' | 'BILLS_SYNCED' | 'SYNC_STATUS' | 'ERROR' | 'PONG';
  orders?: any[];
  bills?: any[];
  timestamp: number;
  source: 'worker-poll' | 'worker-manual' | 'worker-init';
  changed?: boolean;
  status?: string;
  intervalMs?: number;
  error?: string;
}

let syncTimer: any = null;
let pollInterval = 3000; // 3 seconds default as requested
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

// Fast fingerprint hash to detect changes without heavy operations
function computeFingerprint(data: any[]): string {
  if (!Array.isArray(data)) return '';
  if (data.length === 0) return 'empty_0';
  
  // Hash relevant order fields (id, status, updatedAt, total, items length)
  return data
    .map((item: any) => {
      const id = item.id || '';
      const status = item.status || 'pending';
      const updated = item.updatedAt || item.createdAt || item.timestamp || '';
      const total = item.total || 0;
      const itemsCount = Array.isArray(item.items) ? item.items.length : 0;
      const billReq = item.billRequested ? '1' : '0';
      return `${id}_${status}_${updated}_${total}_${itemsCount}_${billReq}`;
    })
    .join('|');
}

function computeBillsFingerprint(data: any[]): string {
  if (!Array.isArray(data)) return '';
  if (data.length === 0) return 'empty_bills_0';

  return data
    .map((item: any) => {
      const id = item.id || '';
      const table = item.tableNumber || '';
      const status = item.status || 'pending';
      const requestedAt = item.requestedAt || '';
      const settledAt = item.settledAt || '';
      return `${id}_${table}_${status}_${requestedAt}_${settledAt}`;
    })
    .join('|');
}

async function fetchOrdersAndBills(source: 'worker-poll' | 'worker-manual' | 'worker-init' = 'worker-poll') {
  if (isFetching) return;
  isFetching = true;

  try {
    // 1. Fetch Orders with cache-busting headers to guarantee freshest database state
    const ordersPromise = fetch(ENDPOINTS.orders, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    // 2. Fetch Bill Requests
    const billsPromise = fetch(ENDPOINTS.bills, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    const [ordersRes, billsRes] = await Promise.allSettled([ordersPromise, billsPromise]);

    // Handle Orders response
    if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
      const orders = await ordersRes.value.json();
      if (Array.isArray(orders)) {
        const currentHash = computeFingerprint(orders);
        const hasChanged = currentHash !== lastOrdersHash;

        // Post message to main React thread
        const responsePayload: WorkerResponsePayload = {
          type: 'ORDERS_SYNCED',
          orders,
          timestamp: Date.now(),
          source,
          changed: hasChanged
        };
        self.postMessage(responsePayload);

        lastOrdersHash = currentHash;
        failedAttempts = 0;
      }
    } else {
      failedAttempts++;
    }

    // Handle Bills response
    if (billsRes.status === 'fulfilled' && billsRes.value.ok) {
      const bills = await billsRes.value.json();
      if (Array.isArray(bills)) {
        const currentBillsHash = computeBillsFingerprint(bills);
        const hasChanged = currentBillsHash !== lastBillsHash;

        const responsePayload: WorkerResponsePayload = {
          type: 'BILLS_SYNCED',
          bills,
          timestamp: Date.now(),
          source,
          changed: hasChanged
        };
        self.postMessage(responsePayload);

        lastBillsHash = currentBillsHash;
      }
    }
  } catch (err: any) {
    failedAttempts++;
    const errorPayload: WorkerResponsePayload = {
      type: 'ERROR',
      error: err?.message || 'Network error in order sync worker',
      timestamp: Date.now(),
      source
    };
    self.postMessage(errorPayload);
  } finally {
    isFetching = false;
  }
}

function startSync() {
  if (isRunning) return;
  isRunning = true;

  // Immediate initial sync
  fetchOrdersAndBills('worker-init');

  // Set recurring 5-second background interval
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
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

// Listen for commands from the main React application
self.onmessage = (event: MessageEvent<SyncWorkerMessage>) => {
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
          syncTimer = setInterval(() => {
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

// Start background task immediately
startSync();

export {};
