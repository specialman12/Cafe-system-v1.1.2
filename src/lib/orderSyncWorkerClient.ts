/**
 * Smart Menu System - Order Sync Worker Client & Manager
 * Bridges the background order-sync.worker.ts with React State & useOrdersVault
 */

import { syncHub } from './syncHub';

export interface WorkerOrderEvent {
  orders: any[];
  timestamp: number;
  source: string;
  changed: boolean;
}

export interface WorkerBillEvent {
  bills: any[];
  timestamp: number;
  source: string;
  changed: boolean;
}

type OrderCallback = (data: WorkerOrderEvent) => void;
type BillCallback = (data: WorkerBillEvent) => void;
type StatusCallback = (status: { isRunning: boolean; intervalMs: number; lastSyncedAt?: number }) => void;

class OrderSyncWorkerManager {
  private static instance: OrderSyncWorkerManager | null = null;
  private worker: Worker | null = null;
  private isRunning = false;
  private intervalMs = 3000;
  private orderListeners: Set<OrderCallback> = new Set();
  private billListeners: Set<BillCallback> = new Set();
  private statusListeners: Set<StatusCallback> = new Set();
  private fallbackInterval: any = null;
  private lastSyncedAt: number = 0;
  private isInitialized = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWorker();
    }
  }

  public static getInstance(): OrderSyncWorkerManager {
    if (!OrderSyncWorkerManager.instance) {
      OrderSyncWorkerManager.instance = new OrderSyncWorkerManager();
    }
    return OrderSyncWorkerManager.instance;
  }

  private initializeWorker() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    try {
      if (typeof Worker !== 'undefined') {
        // Try creating standard web worker from public directory
        this.worker = new Worker('/order-sync.worker.js');

        this.worker.onmessage = (event: MessageEvent) => {
          this.handleWorkerMessage(event.data);
        };

        this.worker.onerror = (err) => {
          console.warn('[OrderSyncWorker] Worker error, switching to fallback background timer:', err);
          this.startFallbackPolling();
        };

        this.isRunning = true;
        this.notifyStatus();
      } else {
        this.startFallbackPolling();
      }
    } catch (e) {
      console.warn('[OrderSyncWorker] Could not initialize Web Worker, using fallback loop:', e);
      this.startFallbackPolling();
    }
  }

  private handleWorkerMessage(data: any) {
    if (!data || !data.type) return;

    this.lastSyncedAt = data.timestamp || Date.now();

    if (data.type === 'ORDERS_SYNCED' && Array.isArray(data.orders)) {
      const event: WorkerOrderEvent = {
        orders: data.orders,
        timestamp: data.timestamp || Date.now(),
        source: data.source || 'worker-poll',
        changed: Boolean(data.changed)
      };

      this.orderListeners.forEach(cb => {
        try { cb(event); } catch (err) {}
      });
    } else if (data.type === 'BILLS_SYNCED' && Array.isArray(data.bills)) {
      const event: WorkerBillEvent = {
        bills: data.bills,
        timestamp: data.timestamp || Date.now(),
        source: data.source || 'worker-poll',
        changed: Boolean(data.changed)
      };

      this.billListeners.forEach(cb => {
        try { cb(event); } catch (err) {}
      });
    } else if (data.type === 'SYNC_STATUS') {
      this.isRunning = data.status === 'running';
      if (data.intervalMs) this.intervalMs = data.intervalMs;
      this.notifyStatus();
    }
  }

  private startFallbackPolling() {
    if (this.fallbackInterval) return;
    this.isRunning = true;
    this.notifyStatus();

    const doPoll = async () => {
      try {
        const [ordersRes, billsRes] = await Promise.allSettled([
          fetch('/api/orders', { cache: 'no-store' }),
          fetch('/api/bills', { cache: 'no-store' })
        ]);

        const now = Date.now();
        this.lastSyncedAt = now;

        if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
          const orders = await ordersRes.value.json();
          if (Array.isArray(orders)) {
            const event: WorkerOrderEvent = {
              orders,
              timestamp: now,
              source: 'fallback-poll',
              changed: true
            };
            this.orderListeners.forEach(cb => {
              try { cb(event); } catch (e) {}
            });
          }
        }

        if (billsRes.status === 'fulfilled' && billsRes.value.ok) {
          const bills = await billsRes.value.json();
          if (Array.isArray(bills)) {
            const event: WorkerBillEvent = {
              bills,
              timestamp: now,
              source: 'fallback-poll',
              changed: true
            };
            this.billListeners.forEach(cb => {
              try { cb(event); } catch (e) {}
            });
          }
        }
      } catch (err) {}
    };

    doPoll();
    this.fallbackInterval = setInterval(doPoll, this.intervalMs);
  }

  public onOrdersSync(callback: OrderCallback): () => void {
    this.orderListeners.add(callback);
    return () => {
      this.orderListeners.delete(callback);
    };
  }

  public onBillsSync(callback: BillCallback): () => void {
    this.billListeners.add(callback);
    return () => {
      this.billListeners.delete(callback);
    };
  }

  public onStatusChange(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);
    callback({
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
      lastSyncedAt: this.lastSyncedAt
    });
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  private notifyStatus() {
    this.statusListeners.forEach(cb => {
      try {
        cb({
          isRunning: this.isRunning,
          intervalMs: this.intervalMs,
          lastSyncedAt: this.lastSyncedAt
        });
      } catch (e) {}
    });
  }

  /**
   * Triggers an immediate 0ms sync on the background worker thread.
   * Useful when an order is submitted, approved, or changed.
   */
  public triggerInstantSync() {
    if (this.worker) {
      try {
        this.worker.postMessage({ type: 'SYNC_NOW' });
      } catch (e) {
        this.directFetchSync();
      }
    } else {
      this.directFetchSync();
    }
  }

  private async directFetchSync() {
    try {
      const ordersRes = await fetch('/api/orders', { cache: 'no-store' });
      if (ordersRes.ok) {
        const orders = await ordersRes.json();
        if (Array.isArray(orders)) {
          const event: WorkerOrderEvent = {
            orders,
            timestamp: Date.now(),
            source: 'instant-manual',
            changed: true
          };
          this.orderListeners.forEach(cb => {
            try { cb(event); } catch (e) {}
          });
        }
      }
    } catch (e) {}
  }

  public setInterval(intervalMs: number) {
    if (intervalMs < 1000) intervalMs = 1000;
    this.intervalMs = intervalMs;

    if (this.worker) {
      try {
        this.worker.postMessage({ type: 'SET_INTERVAL', intervalMs });
      } catch (e) {}
    }

    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
      this.startFallbackPolling();
    }

    this.notifyStatus();
  }

  public isWorkerRunning(): boolean {
    return this.isRunning;
  }

  public destroy() {
    if (this.worker) {
      try {
        this.worker.postMessage({ type: 'STOP' });
        this.worker.terminate();
      } catch (e) {}
      this.worker = null;
    }
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
    this.isRunning = false;
    this.orderListeners.clear();
    this.billListeners.clear();
    this.statusListeners.clear();
  }
}

export const orderSyncWorker = OrderSyncWorkerManager.getInstance();
