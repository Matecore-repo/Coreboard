import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-initialize Supabase client to avoid calling createClient during Next.js server build
let _client: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase env vars NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are required at runtime');
  }
  _client = createClient(url, key, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  return _client;
}

function getClient(): SupabaseClient {
  if (_client) return _client;
  // Only create client in browser/runtime where env vars are available
  if (typeof window === 'undefined') {
    // During SSR/build we return a lightweight stub that prevents crashes
    const stub: any = {
      auth: {
        onAuthStateChange: (_cb: any) => ({ subscription: { unsubscribe: () => {} } }),
        setSession: async () => ({}),
        signInWithPassword: async () => ({ data: null, error: new Error('Supabase not initialized') }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({ select: async () => ({ data: null, error: new Error('Supabase not initialized') }) }),
    };
    return stub as SupabaseClient;
  }

  return createSupabaseClient();
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop: string) {
    const client = getClient();
    // @ts-ignore
    return client[prop];
  },
  set(_target, prop: string, value) {
    const client = getClient();
    // @ts-ignore
    client[prop] = value;
    return true;
  },
});

export default supabase;


