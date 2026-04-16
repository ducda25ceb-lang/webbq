import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const config = globalThis.__SUPABASE_CONFIG__ || {};
const supabaseUrl = config.url || "";
const supabaseAnonKey = config.anonKey || "";
let authSettingsPromise = null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const DEFAULT_AUTH_SETTINGS = Object.freeze({
  disableSignup: false,
  emailEnabled: false,
  googleEnabled: false,
  requiresEmailConfirmation: true,
});
const CONFIGURED_PROJECT_FALLBACK_AUTH_SETTINGS = Object.freeze({
  ...DEFAULT_AUTH_SETTINGS,
  emailEnabled: true,
});

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

function mapAuthSettings(payload) {
  return {
    disableSignup: Boolean(payload?.disable_signup),
    emailEnabled: Boolean(payload?.external?.email),
    googleEnabled: Boolean(payload?.external?.google),
    requiresEmailConfirmation: Boolean(payload?.external?.email) &&
      !Boolean(payload?.mailer_autoconfirm),
  };
}

export async function fetchAuthSettings() {
  if (!isSupabaseConfigured) {
    return DEFAULT_AUTH_SETTINGS;
  }

  if (!authSettingsPromise) {
    authSettingsPromise = fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        apikey: supabaseAnonKey,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Cannot load auth settings (${response.status}).`);
        }

        return mapAuthSettings(await response.json());
      })
      .catch(() => CONFIGURED_PROJECT_FALLBACK_AUTH_SETTINGS);
  }

  return authSettingsPromise;
}

export function toAppUser(supabaseUser) {
  if (!supabaseUser) {
    return null;
  }

  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name:
      supabaseUser.user_metadata?.display_name ||
      supabaseUser.email?.split("@")[0] ||
      "Khách",
    role: supabaseUser.user_metadata?.role || "customer",
  };
}
