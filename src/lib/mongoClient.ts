export interface MongoStatusResponse {
  connected: boolean;
  uriConfigured: boolean;
  dbName: string;
  host?: string;
  error?: string | null;
  lastSync?: string | null;
  mode: 'mongodb_atlas' | 'hybrid_fallback';
  collections?: Record<string, number>;
  latencyMs?: number;
}

export async function fetchMongoStatus(): Promise<MongoStatusResponse> {
  try {
    const res = await fetch('/api/mongodb-status');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {}

  return {
    connected: false,
    uriConfigured: false,
    dbName: 'smart_menu_db',
    mode: 'hybrid_fallback'
  };
}

export async function triggerMongoSync(): Promise<{ success: boolean; message: string; keysSynced?: number }> {
  try {
    const res = await fetch('/api/mongodb-sync-now', { method: 'POST' });
    const data = await res.json();
    return data;
  } catch (e: any) {
    return { success: false, message: e?.message || 'فشل الاتصال بالخادم' };
  }
}

export async function configureMongoUri(uri: string, dbName?: string): Promise<{ success: boolean; message: string; status?: MongoStatusResponse }> {
  try {
    const res = await fetch('/api/mongodb-configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri, dbName })
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e?.message || 'فشل الاتصال بالخادم' };
  }
}

export async function testMongoConnection(uri: string, dbName?: string): Promise<{ success: boolean; latencyMs?: number; host?: string; error?: string }> {
  try {
    const res = await fetch('/api/mongodb-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri, dbName })
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e?.message || 'فشل اختبار الاتصال' };
  }
}
