import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// If Supabase is not configured, provide a safe no-op client
const isConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

const noopClient = {
  from: () => ({
    select: () => ({
      order: () => ({
        limit: async () => ({ data: [], error: null }),
      }),
    }),
    insert: async () => ({ data: null, error: null }),
  }),
  channel: () => ({
    on: function () { return this; },
    subscribe: () => ({ unsubscribe: () => {} }),
    unsubscribe: () => {},
  }),
};

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : noopClient;

export const supabaseConfigured = isConfigured;
