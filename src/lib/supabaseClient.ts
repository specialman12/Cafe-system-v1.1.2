import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://iafigcrjlhrwwlxugjgi.supabase.co';
const DEFAULT_KEY = 'sb_publishable_-a_e68uRsrNxg3Pl0jUAvw_xV2IxLeY';

function resolveUrl(urlEnv: string | undefined): string {
  if (!urlEnv) return DEFAULT_URL;
  const trimmed = urlEnv.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return DEFAULT_URL;
}

function resolveKey(keyEnv: string | undefined): string {
  if (!keyEnv) return DEFAULT_KEY;
  const trimmed = keyEnv.trim();
  if (trimmed && !trimmed.startsWith('MY_')) {
    return trimmed;
  }
  return DEFAULT_KEY;
}

const supabaseUrl = resolveUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = resolveKey(import.meta.env.VITE_SUPABASE_ANON_KEY);

let supabaseClient: any;

try {
  console.log('Initializing Supabase client with URL:', supabaseUrl);
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} catch (e) {
  console.error('Supabase initialization failed:', e);
  supabaseClient = getMockClient();
}

function getMockClient() {
  console.warn('Using mock Supabase client');
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: new Error('Supabase not initialized') })
        })
      }),
      upsert: () => Promise.resolve({ error: new Error('Supabase not initialized') }),
    }),
    channel: () => ({
      on: () => ({
        subscribe: () => ({ unsubscribe: () => {} })
      }),
      subscribe: () => ({ unsubscribe: () => {} }),
    }),
  };
}

export const supabase = supabaseClient;


