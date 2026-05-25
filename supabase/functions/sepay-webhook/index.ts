import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sepay-signature, x-sepay-timestamp",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAYMENT_STATUS_PAID = "Đã nhận tiền";
const PAYMENT_STATUS_REVIEW = "Cần kiểm tra";
const BOOKING_STATUS_PENDING_ADMIN = "Chờ admin xác nhận";
const BOOKING_STATUS_PAYMENT_REVIEW = "Thanh toán cần kiểm tra";
const BOOKING_STATUS_PENDING_QR = "Chờ thanh toán QR";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getString(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function getNumber(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^\d.-]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function timingSafeEqual(a: string, b: string) {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let index = 0; index < aBytes.length; index += 1) {
    diff |= aBytes[index] ^ bBytes[index];
  }
  return diff === 0;
}

async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyWebhook(request: Request, rawBody: string) {
  const hmacSecret = Deno.env.get("SEPAY_WEBHOOK_SECRET") || "";
  const apiKey = Deno.env.get("SEPAY_WEBHOOK_API_KEY") || "";

  if (hmacSecret) {
    const signature = request.headers.get("X-SePay-Signature") || "";
    const timestamp = Number(request.headers.get("X-SePay-Timestamp") || 0);
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (!signature || !timestamp || Math.abs(nowSeconds - timestamp) > 300) {
      return false;
    }

    const expected = `sha256=${await hmacHex(hmacSecret, `${timestamp}.${rawBody}`)}`;
    return timingSafeEqual(expected, signature);
  }

  if (apiKey) {
    const auth = request.headers.get("Authorization") || "";
    return timingSafeEqual(auth, `Apikey ${apiKey}`);
  }

  return Deno.env.get("ALLOW_UNVERIFIED_SEPAY_WEBHOOK") === "true";
}

function findPaymentCode(content: string) {
  const match = content.toUpperCase().match(/EBBQ[A-Z0-9]{6,20}/);
  return match?.[0] || "";
}

async function notifyAdminPayment({
  bookingCode,
  paymentCode,
  amount,
  status,
}: {
  bookingCode: string;
  paymentCode: string;
  amount: number;
  status: string;
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
  const fromEmail = Deno.env.get("BOOKING_FROM_EMAIL") || "";
  const adminEmails = (Deno.env.get("ADMIN_EMAILS") || "ducanh12082007dn@gmail.com")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  if (!resendApiKey || !fromEmail || adminEmails.length === 0) {
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: adminEmails,
      subject: `[Ember BBQ] Thanh toán cọc ${bookingCode}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#181818;">
          <h2>Thanh toán cọc cần xử lý</h2>
          <p><strong>Mã đơn:</strong> ${bookingCode}</p>
          <p><strong>Mã thanh toán:</strong> ${paymentCode}</p>
          <p><strong>Số tiền nhận:</strong> ${amount.toLocaleString("vi-VN")} VND</p>
          <p><strong>Trạng thái:</strong> ${status}</p>
          <p>Vào dashboard admin để duyệt hoặc kiểm tra đơn.</p>
        </div>
      `,
    }),
  }).catch(() => undefined);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json(405, { success: false, message: "Method not allowed." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { success: false, message: "Missing Supabase service config." });
  }

  const rawBody = await request.text();
  const isVerified = await verifyWebhook(request, rawBody);

  if (!isVerified) {
    return json(401, { success: false, message: "Unauthorized webhook." });
  }

  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json(400, { success: false, message: "Invalid JSON payload." });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const transferContent = getString(payload, [
    "content",
    "description",
    "transferContent",
    "transactionContent",
    "code",
  ]);
  const providerTransactionId = getString(payload, [
    "id",
    "transactionId",
    "referenceCode",
    "reference",
  ]);
  const accountNumber = getString(payload, ["accountNumber", "account_number", "acc"]);
  const transferAmount = getNumber(payload, ["transferAmount", "amount", "money", "value"]);
  const paymentCode = getString(payload, ["payment_code", "paymentCode"]) ||
    findPaymentCode(transferContent);

  const { data: eventRow } = await adminClient
    .from("payment_webhook_events")
    .insert({
      provider: "sepay",
      provider_transaction_id: providerTransactionId || null,
      payment_code: paymentCode || null,
      raw_payload: payload,
    })
    .select("id")
    .single();

  if (!paymentCode) {
    await adminClient
      .from("payment_webhook_events")
      .update({
        status: "ignored",
        processed_at: new Date().toISOString(),
        error_message: "Không tìm thấy mã thanh toán trong nội dung chuyển khoản.",
      })
      .eq("id", eventRow?.id);
    return json(200, { success: true, ignored: true });
  }

  const expectedAccount = Deno.env.get("SEPAY_BANK_ACCOUNT") || "";

  const { data: payment, error: paymentError } = await adminClient
    .from("payments")
    .select("id, booking_id, booking_code, payment_code, status, amount, bank_account")
    .eq("payment_code", paymentCode)
    .maybeSingle();

  if (paymentError || !payment) {
    await adminClient
      .from("payment_webhook_events")
      .update({
        status: "unmatched",
        processed_at: new Date().toISOString(),
        error_message: paymentError?.message || "Không tìm thấy payment tương ứng.",
      })
      .eq("id", eventRow?.id);
    return json(200, { success: true, unmatched: true });
  }

  const accountMatches = !expectedAccount || !accountNumber || accountNumber === expectedAccount;
  const amountMatches = transferAmount >= Number(payment.amount || 0);
  const nextPaymentStatus = accountMatches && amountMatches
    ? PAYMENT_STATUS_PAID
    : PAYMENT_STATUS_REVIEW;
  const nextBookingStatus = accountMatches && amountMatches
    ? BOOKING_STATUS_PENDING_ADMIN
    : BOOKING_STATUS_PAYMENT_REVIEW;
  const now = new Date().toISOString();

  const { error: updatePaymentError } = await adminClient
    .from("payments")
    .update({
      status: nextPaymentStatus,
      provider_transaction_id: providerTransactionId || null,
      transfer_amount: transferAmount || null,
      transfer_content: transferContent || null,
      raw_payload: payload,
      paid_at: nextPaymentStatus === PAYMENT_STATUS_PAID ? now : null,
      updated_at: now,
    })
    .eq("id", payment.id);

  if (updatePaymentError) {
    await adminClient
      .from("payment_webhook_events")
      .update({
        status: "error",
        processed_at: now,
        error_message: updatePaymentError.message,
      })
      .eq("id", eventRow?.id);
    return json(500, { success: false, message: updatePaymentError.message });
  }

  const { error: updateBookingError } = await adminClient
    .from("bookings")
    .update({
      status: nextBookingStatus,
      payment_status: nextPaymentStatus,
      payment_confirmed_at: nextPaymentStatus === PAYMENT_STATUS_PAID ? now : null,
      updated_at: now,
    })
    .eq("id", payment.booking_id)
    .in("status", [BOOKING_STATUS_PENDING_QR, BOOKING_STATUS_PAYMENT_REVIEW, BOOKING_STATUS_PENDING_ADMIN]);

  if (updateBookingError) {
    await adminClient
      .from("payment_webhook_events")
      .update({
        status: "error",
        processed_at: now,
        error_message: updateBookingError.message,
      })
      .eq("id", eventRow?.id);
    return json(500, { success: false, message: updateBookingError.message });
  }

  await adminClient
    .from("payment_webhook_events")
    .update({
      status: nextPaymentStatus === PAYMENT_STATUS_PAID ? "processed" : "review",
      processed_at: now,
    })
    .eq("id", eventRow?.id);

  await notifyAdminPayment({
    bookingCode: payment.booking_code,
    paymentCode,
    amount: transferAmount,
    status: nextBookingStatus,
  });

  return json(200, {
    success: true,
    paymentCode,
    status: nextPaymentStatus,
    bookingStatus: nextBookingStatus,
  });
});
