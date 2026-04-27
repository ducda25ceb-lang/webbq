import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const config = globalThis.__SUPABASE_CONFIG__ || {};
const supabaseUrl = config.url || "";
const supabaseAnonKey = config.anonKey || "";
let authSettingsPromise = null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const BOOKING_STATUS_PENDING_QR = "Ch\u1edd thanh to\u00e1n QR";
export const BOOKING_STATUS_CONFIRMED = "\u0110\u00e3 x\u00e1c nh\u1eadn";
export const BOOKING_STATUS_CANCELLED = "\u0110\u00e3 h\u1ee7y - m\u1ea5t c\u1ecdc";
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

async function readFunctionErrorMessage(error) {
  if (!error) {
    return "";
  }

  if (error.context instanceof Response) {
    try {
      const payload = await error.context.clone().json();
      return payload?.error || payload?.message || "";
    } catch {
      try {
        return await error.context.clone().text();
      } catch {
        return "";
      }
    }
  }

  return error.message || "";
}

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

  const identityProviders = (supabaseUser.identities || [])
    .map((identity) => identity.provider)
    .filter(Boolean);
  const appProviders = supabaseUser.app_metadata?.providers || [];
  const providers = [...new Set([...appProviders, ...identityProviders])];

  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name:
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.name ||
      supabaseUser.user_metadata?.display_name ||
      supabaseUser.email?.split("@")[0] ||
      "Khách",
    avatarUrl:
      supabaseUser.user_metadata?.avatar_url ||
      supabaseUser.user_metadata?.picture ||
      "",
    authProvider: supabaseUser.app_metadata?.provider || providers[0] || "email",
    providers,
    hasGoogleLinked: providers.includes("google"),
    role: supabaseUser.user_metadata?.role || "customer",
  };
}

export async function finalizeBookingPayment({ bookingCode, userId }) {
  if (!isSupabaseConfigured) {
    return {
      ok: true,
      emailSent: false,
      message:
        "\u0110\u00e3 x\u00e1c nh\u1eadn \u0111\u1eb7t b\u00e0n. Email ch\u1ec9 ho\u1ea1t \u0111\u1ed9ng khi Supabase \u0111\u01b0\u1ee3c c\u1ea5u h\u00ecnh.",
    };
  }

  if (!bookingCode || !userId) {
    throw new Error("Missing bookingCode or userId.");
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: BOOKING_STATUS_CONFIRMED,
      updated_at: new Date().toISOString(),
    })
    .eq("booking_code", bookingCode)
    .eq("user_id", userId)
    .select("booking_code")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Booking not found.");
  }

  try {
    const { data: functionData, error: functionError } =
      await supabase.functions.invoke("send-booking-confirmation", {
        body: {
          bookingCode,
        },
      });

    if (functionError) {
      const detail = await readFunctionErrorMessage(functionError);
      throw new Error(detail || functionError.message);
    }

    return {
      ok: true,
      emailSent: true,
      message:
        functionData?.message ||
        "Email x\u00e1c nh\u1eadn \u0111\u1eb7t b\u00e0n \u0111\u00e3 \u0111\u01b0\u1ee3c g\u1eedi th\u00e0nh c\u00f4ng.",
    };
  } catch (emailError) {
    const detail = emailError?.message
      ? ` Lỗi email: ${emailError.message}`
      : "";

    return {
      ok: true,
      emailSent: false,
      emailError,
      message:
        `\u0110\u01a1n \u0111\u1eb7t b\u00e0n \u0111\u00e3 \u0111\u01b0\u1ee3c x\u00e1c nh\u1eadn, nh\u01b0ng ch\u01b0a g\u1eedi \u0111\u01b0\u1ee3c email x\u00e1c nh\u1eadn l\u00fac n\u00e0y.${detail}`,
    };
  }
}

export async function cancelBooking({ bookingCode, userId }) {
  if (!isSupabaseConfigured) {
    return {
      ok: true,
      message:
        "\u0110\u1eb7t b\u00e0n \u0111\u00e3 \u0111\u01b0\u1ee3c h\u1ee7y. Kho\u1ea3n c\u1ecdc s\u1ebd kh\u00f4ng \u0111\u01b0\u1ee3c ho\u00e0n l\u1ea1i.",
    };
  }

  if (!bookingCode || !userId) {
    throw new Error("Missing bookingCode or userId.");
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: BOOKING_STATUS_CANCELLED,
      updated_at: new Date().toISOString(),
    })
    .eq("booking_code", bookingCode)
    .eq("user_id", userId)
    .neq("status", BOOKING_STATUS_CANCELLED)
    .select("booking_code")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Booking not found or already cancelled.");
  }

  return {
    ok: true,
    message:
      "\u0110\u1eb7t b\u00e0n \u0111\u00e3 \u0111\u01b0\u1ee3c h\u1ee7y. Kho\u1ea3n c\u1ecdc s\u1ebd kh\u00f4ng \u0111\u01b0\u1ee3c ho\u00e0n l\u1ea1i.",
  };
}
