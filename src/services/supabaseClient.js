import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const config = globalThis.__SUPABASE_CONFIG__ || {};
const supabaseUrl = config.url || "";
const supabaseAnonKey = config.anonKey || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export { supabaseUrl, supabaseAnonKey };
