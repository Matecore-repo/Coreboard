import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Demo mode: si está activado, no hacer requests reales
// PERO: los usuarios reales (iangel.oned@gmail.com, nachoangelone@gmail.com) SIEMPRE usan datos reales
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

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
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
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
      rpc: async () => ({ data: null, error: new Error('Supabase not initialized') }),
    };
    return stub as SupabaseClient;
  }

  // En modo demo, devolver stub que no hace requests reales
  if (isDemoMode) {
    const demoStub: any = {
      auth: {
        onAuthStateChange: (_cb: any) => ({ subscription: { unsubscribe: () => {} } }),
        setSession: async () => ({}),
        signInWithPassword: async () => ({ data: null, error: new Error('Demo mode: no real auth') }),
        signOut: async () => ({ error: null }),
        signUp: async () => ({ data: null, error: new Error('Demo mode: no real auth') }),
        resetPasswordForEmail: async () => ({ error: new Error('Demo mode: no real auth') }),
        updateUser: async () => ({ error: new Error('Demo mode: no real auth') }),
        signInWithOtp: async () => ({ data: null, error: new Error('Demo mode: no real auth') }),
        getSession: async () => ({ data: { session: null }, error: null }),
      },
      from: () => ({
        select: async () => ({ data: null, error: new Error('Demo mode: no real DB queries') }),
        insert: async () => ({ data: null, error: new Error('Demo mode: no real DB queries') }),
        update: async () => ({ data: null, error: new Error('Demo mode: no real DB queries') }),
        delete: async () => ({ data: null, error: new Error('Demo mode: no real DB queries') }),
      }),
      rpc: async () => ({ data: null, error: new Error('Demo mode: no real RPC calls') }),
    };
    return demoStub as SupabaseClient;
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

// Helper para crear un cliente con service_role key desde scripts/servidor
export function createAdminSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required for admin client');
  }
  return createClient(url, key, {
    auth: { persistSession: false, detectSessionInUrl: false },
  });
}


