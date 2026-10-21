import { useState, useEffect, useCallback, useRef } from 'react';
import { Order, OrderStatus, BillRequest, MenuItem } from '../types';
import { syncHub } from './syncHub';
import { normalizeOrders } from '../utils/orderUtils';
import { orderSyncWorker } from './orderSyncWorkerClient';
import { firebaseScriptClient } from './firebaseScriptClient';

const ORDERS_STORAGE_KEY = 'smart_menu_orders_vault_v1';
const VAULT_INSTANCE_ID = `vault_${Math.random().toString(36).substring(2, 9)}`;
const BILLS_STORAGE_KEY = 'smart_menu_bills_vault_v1';
const BILLS_BROADCAST_CHANNEL = 'smart_menu_bills_channel_v1';

export function useOrdersVault(fallbackMenuItems?: MenuItem[]) {
  // 1. Orders State
  const [orders, setOrdersState] = useState<Order[]>(() => {
    if (typeof window !== 'undefined') {
      if ((window as any).__INITIAL_DATA__?.orders && Array.isArray((window as any).__INITIAL_DATA__.orders)) {
        return normalizeOrders((window as any).__INITIAL_DATA__.orders, fallbackMenuItems);
      }
      try {
        const cached = localStorage.getItem(ORDERS_STORAGE_KEY) || localStorage.getItem('smart_menu_sync_orders');
        if (cached) {
          const parsed = JSON.parse(cached);
          const raw = parsed && parsed.data !== undefined ? parsed.data : parsed;
          if (Array.isArray(raw)) {
            return normalizeOrders(raw, fallbackMenuItems);
          }
        }
      } catch (e) {}
    }
    return [];
  });

  const ordersRef = useRef<Order[]>(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // Set of order IDs currently undergoing an in-flight API update (for UI spinners & disabling buttons)
  const [updatingOrderIds, setUpdatingOrderIds] = useState<Set<string>>(new Set());

  // Optimistic lock map to prevent background polls/SSE from reverting statuses in flight
  // Maps orderId -> { status, expiresAt }
  const pendingStatusUpdatesRef = useRef<Map<string, { status: OrderStatus; expiresAt: number }>>(new Map());

  // 2. Bill Requests State
  const [billRequests, setBillRequestsState] = useState<BillRequest[]>(() => {
    if (typeof window !== 'undefined') {
      if ((window as any).__INITIAL_DATA__?.bill_requests && Array.isArray((window as any).__INITIAL_DATA__.bill_requests)) {
        return (window as any).__INITIAL_DATA__.bill_requests.filter((b: any) => Number(b.tableNumber) !== 0);
      }
      try {
        const cachedVault = localStorage.getItem(BILLS_STORAGE_KEY);
        if (cachedVault) {
          const parsed = JSON.parse(cachedVault);
          if (Array.isArray(parsed)) {
            return parsed.filter((b: any) => Number(b.tableNumber) !== 0);
          }
        }
      } catch (e) {}
    }
    return [];
  });

  const billRequestsRef = useRef<BillRequest[]>(billRequests);
  useEffect(() => {
    billRequestsRef.current = billRequests;
  }, [billRequests]);

  const ordersChannelRef = useRef<BroadcastChannel | null>(null);
  const billsChannelRef = useRef<BroadcastChannel | null>(null);

  // Persistence helpers
  const persistBillsLocally = useCallback((newBills: BillRequest[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(newBills));
        localStorage.setItem('smart_menu_sync_bill_requests', JSON.stringify({ data: newBills, senderId: VAULT_INSTANCE_ID, t: Date.now() }));
      } catch (e) {}
    }
  }, []);

  const persistOrdersLocally = useCallback((newOrders: Order[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(newOrders));
        localStorage.setItem('smart_menu_sync_orders', JSON.stringify({ data: newOrders, senderId: VAULT_INSTANCE_ID, t: Date.now() }));
      } catch (e) {}
    }
  }, []);

  // Server-authoritative merge for incoming orders from API / WebSockets / Polls
  const mergeIncomingOrders = useCallback((incomingRaw: any[], meta?: { senderId?: string }) => {
    if (!Array.isArray(incomingRaw)) return;
    if (meta && meta.senderId === VAULT_INSTANCE_ID) return;

    if (incomingRaw.length === 0) {
      if (ordersRef.current.length > 0 && pendingStatusUpdatesRef.current.size === 0) {
        ordersRef.current = [];
        setOrdersState([]);
        try {
          localStorage.removeItem(ORDERS_STORAGE_KEY);
          localStorage.setItem('smart_menu_sync_orders', JSON.stringify({ data: [], senderId: VAULT_INSTANCE_ID, t: Date.now() }));
        } catch (e) {}
      }
      return;
    }

    const now = Date.now();
    // Clean up expired pending locks (older than 6 seconds)
    for (const [id, lock] of pendingStatusUpdatesRef.current.entries()) {
      if (now > lock.expiresAt) {
        pendingStatusUpdatesRef.current.delete(id);
      }
    }

    const normalizedIncoming = normalizeOrders(incomingRaw, fallbackMenuItems);

    // Apply any in-flight optimistic locks to prevent background poll glitches
    const protectedIncoming = normalizedIncoming.map(ord => {
      const lock = pendingStatusUpdatesRef.current.get(ord.id);
      if (lock) {
        if (ord.status !== lock.status) {
          // Keep user's clicked status while request is in flight!
          return {
            ...ord,
            status: lock.status,
            deliveredAt: lock.status === 'delivered' ? (ord.deliveredAt || new Date().toISOString()) : ord.deliveredAt,
            checkSent: lock.status === 'completed' ? true : ord.checkSent
          };
        } else {
          // Server has already updated to the new status, release lock
          pendingStatusUpdatesRef.current.delete(ord.id);
        }
      }
      return ord;
    });

    const sorted = [...protectedIncoming].sort((a, b) => {
      const timeA = new Date(a.createdAt || (a as any).timestamp || 0).getTime();
      const timeB = new Date(b.createdAt || (b as any).timestamp || 0).getTime();
      return timeB - timeA;
    });

    const hasDiff = JSON.stringify(sorted) !== JSON.stringify(ordersRef.current);
    if (hasDiff) {
      ordersRef.current = sorted;
      setOrdersState(sorted);
      persistOrdersLocally(sorted);
    }
  }, [fallbackMenuItems, persistOrdersLocally]);

  // Server-authoritative merge for incoming bill requests
  const mergeIncomingBills = useCallback((incomingRaw: any[], meta?: { senderId?: string }) => {
    if (!Array.isArray(incomingRaw)) return;
    if (meta && meta.senderId === VAULT_INSTANCE_ID) return;

    if (incomingRaw.length === 0) {
      const pendingLocal = billRequestsRef.current.filter(b => b && b.status === 'pending');
      if (pendingLocal.length > 0) return;

      if (billRequestsRef.current.length > 0) {
        billRequestsRef.current = [];
        setBillRequestsState([]);
        persistBillsLocally([]);
      }
      return;
    }

    const currentBills = billRequestsRef.current;
    const serverMap = new Map<string, BillRequest>();

    for (const inB of incomingRaw) {
      if (!inB || !inB.id || Number(inB.tableNumber) === 0) continue;
      const key = String(inB.id);
      const local = currentBills.find(cb => String(cb.id) === key);
      if (local && local.status === 'settled' && inB.status !== 'settled') {
        serverMap.set(key, { ...inB, status: 'settled', settledAt: local.settledAt || new Date().toISOString() });
      } else {
        serverMap.set(key, inB);
      }
    }

    for (const b of currentBills) {
      if (!b || !b.id || Number(b.tableNumber) === 0) continue;
      const key = String(b.id);
      if (!serverMap.has(key)) {
        serverMap.set(key, b);
      }
    }

    const mergedList = Array.from(serverMap.values()).sort((a, b) => {
      const timeA = new Date(a.requestedAt || 0).getTime();
      const timeB = new Date(b.requestedAt || 0).getTime();
      return timeB - timeA;
    });

    const hasDiff = JSON.stringify(mergedList) !== JSON.stringify(currentBills);
    if (hasDiff) {
      billRequestsRef.current = mergedList;
      setBillRequestsState(mergedList);
      persistBillsLocally(mergedList);
    }
  }, [persistBillsLocally]);

  // PRIMARY: Real-time and background synchronization setup
  useEffect(() => {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const ordChan = new BroadcastChannel('smart_menu_orders_vault_channel');
        ordersChannelRef.current = ordChan;
        ordChan.onmessage = (event) => {
          if (event.data && event.data.senderId !== VAULT_INSTANCE_ID && Array.isArray(event.data.data)) {
            mergeIncomingOrders(event.data.data, { senderId: event.data.senderId });
          }
        };

        const billChan = new BroadcastChannel(BILLS_BROADCAST_CHANNEL);
        billsChannelRef.current = billChan;
        billChan.onmessage = (event) => {
          if (event.data && event.data.senderId !== VAULT_INSTANCE_ID && Array.isArray(event.data.data)) {
            mergeIncomingBills(event.data.data, { senderId: event.data.senderId });
          }
        };
      }
    } catch (e) {}

    // Storage event listener (Cross-tab sync)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === ORDERS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            mergeIncomingOrders(parsed, { senderId: 'storage' });
          }
        } catch (err) {}
      } else if (e.key === BILLS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            mergeIncomingBills(parsed, { senderId: 'storage' });
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // Initial Server Fetch via GET /api/orders
    const fetchInitialData = async () => {
      try {
        const [ordersRes, billsRes] = await Promise.allSettled([
          fetch('/api/orders'),
          fetch('/api/bills')
        ]);

        if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
          const serverOrders = await ordersRes.value.json();
          if (Array.isArray(serverOrders)) {
            mergeIncomingOrders(serverOrders, { senderId: 'server-init' });
          }
        }

        if (billsRes.status === 'fulfilled' && billsRes.value.ok) {
          const serverBills = await billsRes.value.json();
          if (Array.isArray(serverBills)) {
            mergeIncomingBills(serverBills, { senderId: 'server-init' });
          }
        }
      } catch (err) {
        console.warn('[OrdersVault] Initial server fetch warning:', err);
      }
    };

    fetchInitialData();

    // SSE / Socket Subscriptions
    const unsubOrdersSSE = syncHub.subscribe('orders', (data, meta) => {
      if (Array.isArray(data)) {
        mergeIncomingOrders(data, meta);
      }
    });

    const unsubBillsSSE = syncHub.subscribe('bill_requests', (data, meta) => {
      if (Array.isArray(data)) {
        mergeIncomingBills(data, meta);
      }
    });

    // Web Worker Sync Subscriptions
    const unsubWorkerOrders = orderSyncWorker.onOrdersSync((event) => {
      if (Array.isArray(event.orders)) {
        mergeIncomingOrders(event.orders, { senderId: event.source || 'worker' });
      }
    });

    const unsubWorkerBills = orderSyncWorker.onBillsSync((event) => {
      if (Array.isArray(event.bills)) {
        mergeIncomingBills(event.bills, { senderId: event.source || 'worker' });
      }
    });

    // Native Firebase Script Real-time Listeners (via HTML CDN script)
    let unsubFirebaseOrders = () => {};
    let unsubFirebaseBills = () => {};

    const setupFirebaseSync = () => {
      unsubFirebaseOrders = firebaseScriptClient.onOrdersSnapshot((fbOrders) => {
        if (Array.isArray(fbOrders) && fbOrders.length > 0) {
          mergeIncomingOrders(fbOrders, { senderId: 'firebase-script' });
        }
      });
      unsubFirebaseBills = firebaseScriptClient.onBillsSnapshot((fbBills) => {
        if (Array.isArray(fbBills) && fbBills.length > 0) {
          mergeIncomingBills(fbBills, { senderId: 'firebase-script' });
        }
      });
    };

    if (firebaseScriptClient.isReady) {
      setupFirebaseSync();
    } else if (typeof window !== 'undefined') {
      window.addEventListener('firebase:ready', setupFirebaseSync, { once: true });
    }

    return () => {
      unsubFirebaseOrders();
      unsubFirebaseBills();
      unsubWorkerOrders();
      unsubWorkerBills();
      unsubOrdersSSE();
      unsubBillsSSE();
      if (ordersChannelRef.current) {
        ordersChannelRef.current.close();
        ordersChannelRef.current = null;
      }
      if (billsChannelRef.current) {
        billsChannelRef.current.close();
        billsChannelRef.current = null;
      }
      window.removeEventListener('storage', handleStorage);
    };
  }, [mergeIncomingOrders, mergeIncomingBills]);

  // Set / Update Orders Mutation (Local setter)
  const setOrders = useCallback((updater: Order[] | ((prev: Order[]) => Order[])) => {
    let nextList: Order[];
    if (typeof updater === 'function') {
      nextList = updater(ordersRef.current);
    } else {
      nextList = updater;
    }

    const normalized = normalizeOrders(nextList, fallbackMenuItems);
    if (JSON.stringify(normalized) === JSON.stringify(ordersRef.current)) {
      return;
    }

    ordersRef.current = normalized;
    setOrdersState(normalized);
    persistOrdersLocally(normalized);

    try {
      if (ordersChannelRef.current) {
        ordersChannelRef.current.postMessage({ data: normalized, senderId: VAULT_INSTANCE_ID });
      }
    } catch (e) {}

    syncHub.emitSyncWrite('orders', normalized, VAULT_INSTANCE_ID);
  }, [fallbackMenuItems, persistOrdersLocally]);

  // Dedicated API Method: Update Order Status with Optimistic Lock (Zero Lag & Anti-Glitch)
  const updateOrderStatus = useCallback(async (orderId: string, newStatus: OrderStatus): Promise<boolean> => {
    if (!orderId) return false;

    const nowIso = new Date().toISOString();

    // 1. Lock this order status for 6000ms so no background sync or poll can revert it
    pendingStatusUpdatesRef.current.set(orderId, {
      status: newStatus,
      expiresAt: Date.now() + 6000
    });

    // 2. Mark this order as in-flight
    setUpdatingOrderIds(prev => new Set(prev).add(orderId));

    // 3. Instant optimistic local UI update (0ms latency)
    const updatedLocally = ordersRef.current.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: newStatus,
          deliveredAt: newStatus === 'delivered' ? (o.deliveredAt || nowIso) : o.deliveredAt,
          checkSent: newStatus === 'completed' ? true : o.checkSent,
          updatedAt: nowIso
        };
      }
      return o;
    });

    ordersRef.current = updatedLocally;
    setOrdersState(updatedLocally);
    persistOrdersLocally(updatedLocally);

    // Sync status change directly to Firebase Firestore via script
    firebaseScriptClient.updateOrderStatus(orderId, newStatus).catch(() => {});

    // Broadcast optimistic change locally
    try {
      if (ordersChannelRef.current) {
        ordersChannelRef.current.postMessage({ data: updatedLocally, senderId: VAULT_INSTANCE_ID });
      }
    } catch (e) {}

    // 4. Send API PATCH request
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.orders)) {
          // Reconcile with server response
          mergeIncomingOrders(json.orders, { senderId: 'api-patch' });
        }
        return true;
      } else {
        console.warn('[OrdersVault] Server returned non-ok for PATCH order status:', res.status);
        return false;
      }
    } catch (err) {
      console.warn('[OrdersVault] Error patching order status:', err);
      return false;
    } finally {
      // Remove loading indicator after a minimum smooth delay
      setTimeout(() => {
        setUpdatingOrderIds(prev => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
      }, 300);
    }
  }, [mergeIncomingOrders, persistOrdersLocally]);

  // Dedicated API Method: Place New Order
  const placeOrder = useCallback(async (newOrder: Order): Promise<boolean> => {
    // 1. Optimistic local add
    const updated = [newOrder, ...ordersRef.current.filter(o => o.id !== newOrder.id)];
    ordersRef.current = updated;
    setOrdersState(updated);
    persistOrdersLocally(updated);

    // Sync new order to Firebase Firestore via script
    firebaseScriptClient.saveOrder(newOrder).catch(() => {});

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.orders)) {
          mergeIncomingOrders(json.orders, { senderId: 'api-post' });
        }
        return true;
      }
    } catch (err) {
      console.warn('[OrdersVault] Error posting new order to API:', err);
    }
    return false;
  }, [mergeIncomingOrders, persistOrdersLocally]);

  // Dedicated API Method: Delete Order
  const deleteOrderPermanently = useCallback(async (orderId: string): Promise<boolean> => {
    if (!orderId) return false;

    // Optimistic local deletion
    const remaining = ordersRef.current.filter(o => o.id !== orderId);
    ordersRef.current = remaining;
    setOrdersState(remaining);
    persistOrdersLocally(remaining);

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.orders)) {
          mergeIncomingOrders(json.orders, { senderId: 'api-delete' });
        }
        orderSyncWorker.triggerInstantSync();
        return true;
      }
    } catch (err) {
      console.warn('[OrdersVault] Error deleting order via API:', err);
    }
    return false;
  }, [mergeIncomingOrders, persistOrdersLocally]);

  // Dedicated API Method: Clear All Orders
  const clearAllOrders = useCallback(async (): Promise<boolean> => {
    ordersRef.current = [];
    setOrdersState([]);
    billRequestsRef.current = [];
    setBillRequestsState([]);
    pendingStatusUpdatesRef.current.clear();

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(ORDERS_STORAGE_KEY);
        localStorage.removeItem(BILLS_STORAGE_KEY);
        localStorage.removeItem('smart_menu_orders');
        localStorage.removeItem('smart_menu_sync_orders');
        localStorage.removeItem('smart_orders_vault');
        localStorage.removeItem('smart_menu_sync_bill_requests');
      } catch (e) {}
    }

    try {
      await fetch('/api/orders/clear', { method: 'POST' });
      await fetch('/api/bills/clear', { method: 'POST' });
      orderSyncWorker.triggerInstantSync();
      return true;
    } catch (e) {
      console.warn('[OrdersVault] Error clearing orders:', e);
      return false;
    }
  }, []);

  // Bill Requests Mutation
  const setBillRequests = useCallback((updater: BillRequest[] | ((prev: BillRequest[]) => BillRequest[])) => {
    let nextList: BillRequest[];
    if (typeof updater === 'function') {
      nextList = updater(billRequestsRef.current);
    } else {
      nextList = updater;
    }

    const cleanList = Array.isArray(nextList) ? nextList.filter((b: any) => b && Number(b.tableNumber) !== 0) : [];
    if (JSON.stringify(cleanList) === JSON.stringify(billRequestsRef.current)) {
      return;
    }

    billRequestsRef.current = cleanList;
    setBillRequestsState(cleanList);
    persistBillsLocally(cleanList);

    try {
      if (billsChannelRef.current) {
        billsChannelRef.current.postMessage({ data: cleanList, senderId: VAULT_INSTANCE_ID });
      }
    } catch (e) {}

    syncHub.emitSyncWrite('bill_requests', cleanList, VAULT_INSTANCE_ID);

    fetch('/api/sync/bill_requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: cleanList, senderId: VAULT_INSTANCE_ID })
    }).catch(() => {});
  }, [persistBillsLocally]);

  // Helper: Request Bill
  const requestBillForTable = useCallback((tableNum: number, customerName?: string, deviceId?: string, explicitTotal?: number) => {
    const tableNumVal = Number(tableNum);
    if (tableNumVal === 0 || isNaN(tableNumVal)) return;

    const tableActiveOrders = ordersRef.current.filter(
      o => Number(o.tableNumber) === tableNumVal && o.status !== 'cancelled' && !(o as any).settled
    );

    const calculatedTotal = tableActiveOrders.reduce((sum, o) => {
      let ordTotal = typeof o.total === 'number' ? o.total : parseFloat(o.total as any);
      if (isNaN(ordTotal) || ordTotal <= 0) {
        if (Array.isArray(o.items)) {
          ordTotal = o.items.reduce((s: number, i: any) => {
            const rawP = i?.menuItem?.price ?? i?.price ?? 0;
            const itemPrice = typeof rawP === 'number' ? rawP : (parseFloat(String(rawP)) || 0);
            const qty = typeof i.quantity === 'number' ? i.quantity : (parseInt(String(i.quantity), 10) || 1);
            return s + (itemPrice * qty);
          }, 0);
        } else {
          ordTotal = 0;
        }
      }
      return sum + ordTotal;
    }, 0);

    const passedTotal = typeof explicitTotal === 'number' ? explicitTotal : parseFloat(explicitTotal as any);
    const totalAmount = (!isNaN(passedTotal) && passedTotal > 0) ? passedTotal : calculatedTotal;
    const itemsCount = tableActiveOrders.reduce((sum, o) => sum + (Array.isArray(o.items) ? o.items.length : 1), 0);
    const nowIso = new Date().toISOString();

    const newBill: BillRequest = {
      id: `bill_${tableNumVal}_${Date.now()}`,
      tableNumber: tableNumVal,
      customerName,
      deviceId,
      requestedAt: nowIso,
      status: 'pending',
      totalAmount,
      itemsCount
    };

    const updatedBills = [newBill, ...billRequestsRef.current.filter(b => !(Number(b.tableNumber) === tableNumVal && b.status === 'pending'))];
    billRequestsRef.current = updatedBills;
    setBillRequestsState(updatedBills);
    persistBillsLocally(updatedBills);

    try {
      if (billsChannelRef.current) {
        billsChannelRef.current.postMessage({ data: updatedBills, senderId: VAULT_INSTANCE_ID });
      }
    } catch (e) {}

    syncHub.emitSyncWrite('bill_requests', updatedBills, VAULT_INSTANCE_ID);

    fetch('/api/sync/bill_requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: updatedBills, senderId: VAULT_INSTANCE_ID })
    }).catch(() => {});

    fetch('/api/tables/request-bill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableNumber: tableNumVal, customerName, deviceId })
    }).then(() => {
      orderSyncWorker.triggerInstantSync();
    }).catch(() => {});
  }, [persistBillsLocally]);

  // Helper: Settle / Clear Bill Request for Table
  const settleBillForTable = useCallback((tableNum: number) => {
    const nowIso = new Date().toISOString();
    setBillRequests(prev => prev.map(b => {
      if (Number(b.tableNumber) === Number(tableNum) && b.status !== 'settled') {
        return { ...b, status: 'settled', settledAt: nowIso };
      }
      return b;
    }));
  }, [setBillRequests]);

  return {
    orders,
    setOrders,
    updateOrderStatus,
    updatingOrderIds,
    placeOrder,
    billRequests,
    setBillRequests,
    mergeIncomingOrders,
    mergeIncomingBills,
    requestBillForTable,
    settleBillForTable,
    deleteOrderPermanently,
    clearAllOrders,
    triggerWorkerSync: () => orderSyncWorker.triggerInstantSync()
  };
}
