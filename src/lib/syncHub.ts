import { io, Socket } from 'socket.io-client';

type ListenerCallback = (data: any, meta?: { senderId?: string; timestamp?: number }) => void;
type ConnectionStatusCallback = (status: 'connected' | 'connecting' | 'disconnected') => void;

class SyncHub {
  private static instance: SyncHub | null = null;
  private socket: Socket | null = null;
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<ListenerCallback>> = new Map();
  private statusListeners: Set<ConnectionStatusCallback> = new Set();
  private status: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
  private bootstrapData: Record<string, any> | null = null;
  private bootstrapPromise: Promise<Record<string, any> | null> | null = null;
  private lastDispatchedMap: Map<string, { timestamp: number; json: string }> = new Map();

  private constructor() {
    if (typeof window !== 'undefined') {
      if ((window as any).__INITIAL_DATA__) {
        this.bootstrapData = (window as any).__INITIAL_DATA__;
      }
      this.initSocket();
      this.initSSE();
      this.fetchBootstrap();
    }
  }

  public static getInstance(): SyncHub {
    if (!SyncHub.instance) {
      SyncHub.instance = new SyncHub();
    }
    return SyncHub.instance;
  }

  private dispatchSyncUpdate(payload: { key: string; data: any; senderId?: string; timestamp?: number }) {
    if (!payload || !payload.key) return;
    const key = payload.key;
    const subscribers = this.listeners.get(key);
    if (!subscribers || subscribers.size === 0) return;

    const rawData = (payload.data && payload.data.data !== undefined) ? payload.data.data : payload.data;
    const senderId = payload.senderId || payload.data?.senderId;

    // Fast deduplication: avoid duplicate callback execution within 60ms for the exact same payload
    const dataStr = JSON.stringify(rawData);
    const lastDispatched = this.lastDispatchedMap.get(key);
    const now = Date.now();
    if (lastDispatched && (now - lastDispatched.timestamp < 60) && lastDispatched.json === dataStr) {
      return;
    }
    this.lastDispatchedMap.set(key, { timestamp: now, json: dataStr });

    subscribers.forEach(cb => {
      try {
        cb(rawData, { senderId, timestamp: payload.timestamp });
      } catch (e) {
        console.error('[SyncHub] Error in listener callback:', e);
      }
    });
  }

  private initSSE() {
    if (typeof window === 'undefined' || this.eventSource || typeof EventSource === 'undefined') return;

    try {
      this.eventSource = new EventSource('/api/sync-stream');
      this.eventSource.onopen = () => {
        console.log('[SyncHub] SSE Stream connected');
        this.setStatus('connected');
      };

      this.eventSource.onmessage = (event) => {
        try {
          if (!event.data || event.data.startsWith(':')) return;
          const payload = JSON.parse(event.data);
          this.dispatchSyncUpdate(payload);
        } catch (e) {}
      };

      this.eventSource.onerror = () => {
        if (this.status === 'connected' && (!this.socket || !this.socket.connected)) {
          this.setStatus('connecting');
        }
      };
    } catch (e) {
      console.warn('[SyncHub] SSE init warning:', e);
    }
  }

  private initSocket() {
    if (typeof window === 'undefined' || this.socket) return;

    this.setStatus('connecting');

    try {
      this.socket = io({
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      this.socket.on('connect', () => {
        console.log('[SyncHub] WebSocket connected via Socket.IO:', this.socket?.id);
        this.setStatus('connected');
        this.requestSyncAll();
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('[SyncHub] WebSocket disconnected:', reason);
        if (!this.eventSource || this.eventSource.readyState !== EventSource.OPEN) {
          this.setStatus('disconnected');
        }
      });

      this.socket.on('connect_error', (error) => {
        console.warn('[SyncHub] WebSocket connection error:', error?.message);
        if (!this.eventSource || this.eventSource.readyState !== EventSource.OPEN) {
          this.setStatus('connecting');
        }
      });

      this.socket.on('sync_update', (payload: { key: string; data: any; senderId?: string; timestamp?: number }) => {
        this.dispatchSyncUpdate(payload);
      });
    } catch (err) {
      console.error('[SyncHub] Failed to initialize socket:', err);
      if (!this.eventSource) {
        this.setStatus('disconnected');
      }
    }
  }

  public requestSyncAll() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('sync_request', 'all');
    }
  }

  public requestSyncKey(key: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('sync_request', key);
    }
  }

  public emitSyncWrite(key: string, data: any, senderId: string) {
    if (this.bootstrapData) {
      this.bootstrapData[key] = data;
    }
    if (typeof window !== 'undefined') {
      if (!(window as any).__INITIAL_DATA__) (window as any).__INITIAL_DATA__ = {};
      (window as any).__INITIAL_DATA__[key] = data;
    }
    if (this.socket && this.socket.connected) {
      this.socket.emit('sync_write', { key, data, senderId });
    }
  }

  public async fetchBootstrap(forceRefresh: boolean = false): Promise<Record<string, any> | null> {
    if (!forceRefresh && this.bootstrapData) {
      if (!this.bootstrapPromise) {
        this.fetchBootstrap(true).catch(() => {});
      }
      return this.bootstrapData;
    }
    if (this.bootstrapPromise) return this.bootstrapPromise;

    this.bootstrapPromise = fetch('/api/bootstrap', { cache: 'no-store' })
      .then(res => res.json())
      .then(json => {
        if (json && json.success && json.store) {
          const remoteStore = json.store;
          this.bootstrapData = remoteStore;
          if (typeof window !== 'undefined') {
            (window as any).__INITIAL_DATA__ = remoteStore;
          }
          for (const [key, value] of Object.entries(remoteStore)) {
            const subscribers = this.listeners.get(key);
            if (subscribers && subscribers.size > 0) {
              const rawData = (value && typeof value === 'object' && 'data' in value) ? (value as any).data : value;
              subscribers.forEach(cb => {
                try { cb(rawData, { senderId: 'server-bootstrap', timestamp: json.timestamp }); } catch (e) {}
              });
            }
          }
          return remoteStore;
        }
        return null;
      })
      .catch(err => {
        console.warn('[SyncHub] Bootstrap fetch warning:', err);
        return null;
      })
      .finally(() => {
        this.bootstrapPromise = null;
      });

    return this.bootstrapPromise;
  }

  public getCachedBootstrap(key: string): any {
    if (!this.bootstrapData && typeof window !== 'undefined' && (window as any).__INITIAL_DATA__) {
      this.bootstrapData = (window as any).__INITIAL_DATA__;
    }
    if (!this.bootstrapData) return undefined;
    const entry = this.bootstrapData[key];
    if (entry && typeof entry === 'object' && 'data' in entry) {
      return entry.data;
    }
    return entry;
  }

  public getStatus(): 'connected' | 'connecting' | 'disconnected' {
    return this.status;
  }

  private setStatus(newStatus: 'connected' | 'connecting' | 'disconnected') {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach(cb => {
        try { cb(newStatus); } catch (e) {}
      });
    }
  }

  public onStatusChange(callback: ConnectionStatusCallback): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public subscribe(key: string, callback: ListenerCallback): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    const keySet = this.listeners.get(key)!;
    keySet.add(callback);

    if (!this.socket) {
      this.initSocket();
    } else if (this.socket.connected) {
      this.requestSyncKey(key);
    }

    return () => {
      keySet.delete(callback);
      if (keySet.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  public destroy() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.statusListeners.clear();
    this.setStatus('disconnected');
  }
}

export const syncHub = SyncHub.getInstance();
