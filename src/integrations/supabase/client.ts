import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let _supabase: SupabaseClient | null = null;
let _initError: string | null = null;
let _isReady = false;

function createSafeSupabaseClient(): SupabaseClient | null {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['NEXT_PUBLIC_SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    _initError = `Missing Supabase environment variable(s): ${missing.join(', ')}. Add them to .env.local.`;
    console.error(`[Supabase] ${_initError}`);
    return null;
  }

  try {
    const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: typeof window !== 'undefined' ? localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
      }
    });
    _isReady = true;
    return client;
  } catch (e) {
    _initError = e instanceof Error ? e.message : 'Failed to create Supabase client';
    console.error(`[Supabase] ${_initError}`);
    return null;
  }
}

export function getSupabase(): SupabaseClient | null {
  if (!_supabase) {
    _supabase = createSafeSupabaseClient();
  }
  return _supabase;
}

export function isSupabaseReady(): boolean {
  return _isReady;
}

export function getSupabaseError(): string | null {
  return _initError;
}

export function hasSupabaseConfig(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabase();
    if (!client) {
      if (prop === 'auth') {
        return {
          signInWithPassword: async () => ({ error: { message: _initError || 'Supabase not configured' } }),
          signOut: async () => ({ error: { message: 'Supabase not configured' } }),
          getSession: async () => ({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        };
      }
      return () => Promise.resolve({ data: null, error: { message: _initError || 'Supabase not configured' } });
    }
    return Reflect.get(client, prop);
  },
});