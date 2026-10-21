import { useState, useEffect, useCallback, useRef } from 'react';
import { syncHub } from './syncHub';

const INSTANCE_ID = Math.random().toString(36).substring(2, 9);

function deepMerge(target: any, source: any): any {
  if (source === null || source === undefined) return target;
  if (target === null || target === undefined) return source;
  if (typeof target !== 'object' || Array.isArray(target)) {
    return source;
  }
  if (typeof source !== 'object' || Array.isArray(source)) {
    return source;
  }

  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (key in target) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// Ensure stale legacy demo cache is purged once
if (typeof window !== 'undefined') {
  try {
    const ver = localStorage.getItem('smart_menu_cache_ver_2026');
    if (ver !== 'v4_real_menu') {
      localStorage.removeItem('smart_menu_sync_categories');
      localStorage.removeItem('smart_menu_sync_menu_items');
      localStorage.setItem('smart_menu_cache_ver_2026', 'v4_real_menu');
    }
  } catch (e) {}
}

function sanitizeSyncData(key: string, data: any): any {
  if (Array.isArray(data) && (key === 'tables' || key === 'bill_requests')) {
    return data.filter((item: any) => item && Number(item.tableNumber) !== 0);
  }
  return data;
}

export function useSyncState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    // 1. SSR / Server Injected Bootstrap (Instant 0ms, matches current DB state exactly, zero flash)
    if (typeof window !== 'undefined' && (window as any).__INITIAL_DATA__) {
      const serverData = (window as any).__INITIAL_DATA__[key];
      if (serverData !== undefined && serverData !== null) {
        const clean = sanitizeSyncData(key, serverData);
        try {
          localStorage.setItem(`smart_menu_sync_${key}`, JSON.stringify({ data: clean, senderId: 'ssr-init', t: Date.now() }));
        } catch (e) {}
        return clean;
      }
    }

    // 2. Try reading local storage first for offline-first instant render
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`smart_menu_sync_${key}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          const rawData = (parsed && parsed.data !== undefined) ? parsed.data : parsed;
          if (rawData !== null && rawData !== undefined) {
            return sanitizeSyncData(key, rawData);
          }
        }
        const legacyCached = localStorage.getItem(`smart_menu_${key}`);
        if (legacyCached) {
          const parsed = JSON.parse(legacyCached);
          if (parsed !== null && parsed !== undefined) {
            return sanitizeSyncData(key, parsed);
          }
        }
      } catch (e) {}
    }
    return sanitizeSyncData(key, initialValue);
  });

  const [loaded, setLoaded] = useState(() => {
    if (typeof window !== 'undefined' && (window as any).__INITIAL_DATA__ && (window as any).__INITIAL_DATA__[key] !== undefined) {
      return true;
    }
    return false;
  });
  const stateRef = useRef<T>(state);
  const lastWriteTimeRef = useRef<number>(0);
  const initialValueRef = useRef<T>(initialValue);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep stateRef and initialValueRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    initialValueRef.current = initialValue;
  }, [initialValue]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Helper to safely replace local state with canonical remote data
  const applyRemoteData = useCallback((incomingData: any, meta?: { senderId?: string }) => {
    if (incomingData === undefined || incomingData === null) return;

    // Safety guard: Don't wipe menu/categories on accidental empty remote sync unless sent by server API
    if (Array.isArray(incomingData) && incomingData.length === 0 && meta?.senderId !== 'server-api') {
      if ((key === 'categories' || key === 'menu_items') && Array.isArray(stateRef.current) && stateRef.current.length > 0) {
        return;
      }
    }

    // Strict self-echo protection: never overwrite with our own echo
    if (meta && meta.senderId === INSTANCE_ID) {
      return;
    }

    // Ignore remote data if a local write occurred less than 2500ms ago to prevent race condition echoes
    if (Date.now() - lastWriteTimeRef.current < 2500) {
      return;
    }

    let dataToApply = sanitizeSyncData(key, incomingData);

    if (JSON.stringify(dataToApply) !== JSON.stringify(stateRef.current)) {
      stateRef.current = dataToApply;
      setState(dataToApply);

      // Cache locally for offline resilience
      try {
        localStorage.setItem(`smart_menu_sync_${key}`, JSON.stringify({ data: dataToApply, senderId: 'remote', t: Date.now() }));
      } catch (e) {}
    }
  }, [key]);

  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // 1. Local BroadcastChannel for instant 0ms cross-tab sync
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(`smart_menu_sync_${key}`);
        channelRef.current = channel;
        channel.onmessage = (event) => {
          if (event.data && event.data.senderId !== INSTANCE_ID && event.data.data !== undefined) {
            applyRemoteData(event.data.data, { senderId: event.data.senderId });
          }
        };
      }
    } catch (e) {}

    // Local storage event listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `smart_menu_sync_${key}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.senderId !== INSTANCE_ID && parsed.data !== undefined) {
            applyRemoteData(parsed.data, { senderId: parsed.senderId });
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // 2. Load initial state via unified bootstrap (1 single network call for all keys)
    const loadInitialData = async () => {
      // Check if syncHub already holds bootstrap in memory
      const cachedBoot = syncHub.getCachedBootstrap(key);
      if (cachedBoot !== undefined && cachedBoot !== null) {
        const cleanData = sanitizeSyncData(key, cachedBoot);
        if (JSON.stringify(cleanData) !== JSON.stringify(stateRef.current)) {
          stateRef.current = cleanData;
          setState(cleanData);
        }
        setLoaded(true);
      }

      // Await shared bootstrap promise to ensure freshest server data
      try {
        const bootStore = await syncHub.fetchBootstrap(true);
        if (bootStore && bootStore[key] !== undefined) {
          const entry = bootStore[key];
          const rawData = (entry && typeof entry === 'object' && 'data' in entry && entry.data !== undefined) ? entry.data : entry;
          if (rawData !== null && rawData !== undefined) {
            const cleanData = sanitizeSyncData(key, rawData);
            if (JSON.stringify(cleanData) !== JSON.stringify(stateRef.current)) {
              stateRef.current = cleanData;
              setState(cleanData);
            }
            setLoaded(true);
            return;
          }
        }
      } catch (err) {}

      // Fallback to individual /api/sync/:key only if bootstrap is unavailable
      try {
        const res = await fetch(`/api/sync/${encodeURIComponent(key)}`);
        if (res.ok) {
          const json = await res.json();
          const rawData = (json && typeof json === 'object' && 'data' in json && json.data !== undefined) ? json.data : json;
          if (rawData !== null && rawData !== undefined) {
            const cleanData = sanitizeSyncData(key, rawData);
            stateRef.current = cleanData;
            setState(cleanData);
          }
        }
      } catch (e) {
        console.warn(`[Sync Engine] Fallback fetch error for [${key}]:`, e);
      }

      setLoaded(true);
    };

    loadInitialData();

    // 3. Subscribe to Real-Time WebSocket stream via Socket.IO (SyncHub)
    const unsubSocket = syncHub.subscribe(key, (incomingData, meta) => {
      applyRemoteData(incomingData, meta);
    });

    // 4. Offline / Online recovery listener
    const handleOnline = () => {
      loadInitialData();
      syncHub.requestSyncKey(key);
    };
    window.addEventListener('online', handleOnline);

    return () => {
      unsubSocket();
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('online', handleOnline);
    };
  }, [key, applyRemoteData]);

  const updateState = useCallback((newValue: T | ((prev: T) => T)) => {
    let nextState: T;
    if (typeof newValue === 'function') {
      nextState = (newValue as any)(stateRef.current);
    } else {
      nextState = newValue;
    }

    let cleanState = JSON.parse(JSON.stringify(nextState));

    // Optimize orders payload by stripping heavy base64 strings if any
    if (key === 'orders' && Array.isArray(cleanState)) {
      cleanState = cleanState.map((ord: any) => ({
        ...ord,
        items: Array.isArray(ord.items)
          ? ord.items.map((ci: any) => ({
              ...ci,
              menuItem: {
                ...ci.menuItem,
                image: ''
              }
            }))
          : ord.items
      }));
    }

    // Record write timestamp to ignore stale incoming polls and echoes
    lastWriteTimeRef.current = Date.now();

    // Update in-memory state immediately (0ms UI latency)
    stateRef.current = cleanState;
    setState(cleanState);

    // Broadcast 1: Real-time WebSocket emission via Socket.IO (0ms)
    syncHub.emitSyncWrite(key, cleanState, INSTANCE_ID);

    // Broadcast 2: Local BroadcastChannel (0ms cross-tab)
    try {
      if (channelRef.current) {
        channelRef.current.postMessage({ data: cleanState, senderId: INSTANCE_ID });
      }
    } catch (e) {}

    // Broadcast 3: LocalStorage event (0ms & offline persistence) - Instant 0ms write
    try {
      localStorage.setItem(`smart_menu_sync_${key}`, JSON.stringify({ data: cleanState, senderId: INSTANCE_ID, t: Date.now() }));
      localStorage.setItem(`smart_menu_${key}`, JSON.stringify(cleanState));
      if (typeof window !== 'undefined') {
        if (!(window as any).__INITIAL_DATA__) (window as any).__INITIAL_DATA__ = {};
        (window as any).__INITIAL_DATA__[key] = cleanState;
      }
    } catch (e) {}

    // Broadcast 4: Write to Express Server API (persists to MongoDB Atlas & disk)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const isAdminSession = localStorage.getItem('smart_menu_admin_session');
      if (isAdminSession === 'true') {
        headers['x-admin-session'] = 'true';
      }
    } catch {}

    fetch(`/api/sync/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ data: cleanState, senderId: INSTANCE_ID })
    }).catch(() => {
      // Offline fallback: state is already saved in localStorage and will be synced upon reconnection
    });

  }, [key]);

  return [state, updateState, loaded] as const;
}







