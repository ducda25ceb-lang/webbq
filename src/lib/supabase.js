import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  ADMIN_EMAILS,
  BOOKING_STATUS_CANCELLED,
  BOOKING_STATUS_CONFIRMED,
  BOOKING_STATUS_PAYMENT_EXPIRED,
  BOOKING_STATUS_PAYMENT_REVIEW,
  BOOKING_STATUS_PENDING_ADMIN,
  BOOKING_STATUS_PENDING_QR,
  DEPOSIT_AMOUNT,
  PAYMENT_HOLD_MINUTES,
  PAYMENT_STATUS_EXPIRED,
  PAYMENT_STATUS_PAID,
  PAYMENT_STATUS_PENDING,
  PAYMENT_STATUS_REVIEW,
} from "../constants/index.js";

const config = globalThis.__SUPABASE_CONFIG__ || {};
const supabaseUrl = config.url || "";
const supabaseAnonKey = config.anonKey || "";
let authSettingsPromise = null;
const POST_LOGIN_REDIRECT_KEY = "ember-bbq-post-login-path";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export {
  ADMIN_EMAILS,
  BOOKING_STATUS_CANCELLED,
  BOOKING_STATUS_CONFIRMED,
  BOOKING_STATUS_PAYMENT_EXPIRED,
  BOOKING_STATUS_PAYMENT_REVIEW,
  BOOKING_STATUS_PENDING_ADMIN,
  BOOKING_STATUS_PENDING_QR,
  DEPOSIT_AMOUNT,
  PAYMENT_HOLD_MINUTES,
  PAYMENT_STATUS_EXPIRED,
  PAYMENT_STATUS_PAID,
  PAYMENT_STATUS_PENDING,
  PAYMENT_STATUS_REVIEW,
};
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

export function isAdminUser(user) {
  if (!user) {
    return false;
  }

  return ADMIN_EMAILS.includes((user.email || "").trim().toLowerCase()) ||
    user.role === "admin";
}

export function getDefaultPostLoginPath(user) {
  return isAdminUser(user) ? "/admin" : "/dashboard";
}

export function savePostLoginRedirect(path = "auto") {
  try {
    localStorage.setItem(POST_LOGIN_REDIRECT_KEY, path || "auto");
  } catch {
    // Ignore storage failures; login still works and falls back to the current page.
  }
}

export function consumePostLoginRedirect(user) {
  try {
    const storedPath = localStorage.getItem(POST_LOGIN_REDIRECT_KEY);

    if (!storedPath) {
      return "";
    }

    localStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
    return storedPath === "auto" ? getDefaultPostLoginPath(user) : storedPath;
  } catch {
    return "";
  }
}

export async function invokeFunction(name, body = {}) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase chưa được cấu hình.");
  }

  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    const detail = await readFunctionErrorMessage(error);
    throw new Error(detail || error.message);
  }

  if (data?.ok === false) {
    throw new Error(data.error || data.message || "Yêu cầu chưa xử lý được.");
  }

  return data;
}

export async function createBookingPayment(payload) {
  if (!isSupabaseConfigured) {
    const bookingCode = `EMB${Date.now().toString().slice(-6)}`;
    const paymentCode = `EBBQ${bookingCode}`;

    return {
      ok: true,
      booking: {
        booking_code: bookingCode,
        customer_name: payload.customerName,
        booking_date: payload.bookingDate,
        booking_time: payload.bookingTime,
        guests: payload.guests,
        status: BOOKING_STATUS_PENDING_QR,
        payment_code: paymentCode,
        payment_status: PAYMENT_STATUS_PENDING,
        payment_expires_at: new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60_000).toISOString(),
        deposit_amount: DEPOSIT_AMOUNT,
      },
      payment: {
        payment_code: paymentCode,
        status: PAYMENT_STATUS_PENDING,
        amount: DEPOSIT_AMOUNT,
        qr_url: "",
        expires_at: new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60_000).toISOString(),
      },
      setupMissing: true,
      message: "Đã tạo đơn mock. QR động cần Supabase và SePay.",
    };
  }

  return invokeFunction("create-booking-payment", payload);
}

export async function getBookingPaymentStatus({ bookingCode }) {
  if (!isSupabaseConfigured) {
    return {
      ok: true,
      booking: null,
      payment: null,
    };
  }

  return invokeFunction("booking-payment-status", { bookingCode });
}

export async function finalizeBookingPayment({ bookingCode, userId }) {
  if (!isSupabaseConfigured) {
    return {
      ok: true,
      emailSent: false,
      message:
        "Vui l\u00f2ng ch\u1edd qu\u1ea3n l\u00ed x\u00e1c nh\u1eadn trong 5 ph\u00fat.",
    };
  }

  if (!bookingCode || !userId) {
    throw new Error("Missing bookingCode or userId.");
  }

  const { booking, payment } = await getBookingPaymentStatus({ bookingCode });

  if (!booking) {
    throw new Error("Booking not found.");
  }

  if (payment?.status !== PAYMENT_STATUS_PAID && booking.payment_status !== PAYMENT_STATUS_PAID) {
    return {
      ok: false,
      emailSent: false,
      message:
        "Hệ thống chưa nhận được tiền cọc từ SePay. Vui lòng chuyển khoản đúng nội dung rồi chờ vài giây.",
    };
  }

  return {
    ok: true,
    emailSent: false,
    message:
      "Vui l\u00f2ng ch\u1edd qu\u1ea3n l\u00ed x\u00e1c nh\u1eadn trong 5 ph\u00fat.",
  };
}

export async function sendBookingConfirmationEmail({ bookingCode }) {
  if (!isSupabaseConfigured) {
    return {
      ok: true,
      emailSent: false,
      message:
        "Email x\u00e1c nh\u1eadn ch\u1ec9 ho\u1ea1t \u0111\u1ed9ng khi Supabase \u0111\u01b0\u1ee3c c\u1ea5u h\u00ecnh.",
    };
  }

  if (!bookingCode) {
    throw new Error("Missing bookingCode.");
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

  return invokeFunction("cancel-booking", { bookingCode, userId });
}
