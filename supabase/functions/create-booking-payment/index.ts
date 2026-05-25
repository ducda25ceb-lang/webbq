import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEPOSIT_AMOUNT = 100000;
const HOLD_MINUTES = 15;
const BOOKING_STATUS_PENDING_QR = "Chờ thanh toán QR";
const PAYMENT_STATUS_PENDING = "Chờ thanh toán";
const BOOKING_STATUS_EXPIRED = "Hết hạn thanh toán";
const PAYMENT_STATUS_EXPIRED = "Hết hạn";
const CANCELLED_STATUS = "Đã hủy - mất cọc";

type BookingRequest = {
  customerName?: string;
  phone?: string;
  bookingDate?: string;
  bookingTime?: string;
  guests?: number;
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function cleanPhone(value = "") {
  return value.replace(/\D/g, "");
}

function assertBookingPayload(payload: BookingRequest) {
  const customerName = payload.customerName?.trim() || "";
  const phone = cleanPhone(payload.phone);
  const bookingDate = payload.bookingDate || "";
  const bookingTime = payload.bookingTime || "";
  const guests = Number(payload.guests || 0);
  const today = new Date().toISOString().slice(0, 10);

  if (!customerName) throw new Error("Tên khách chưa hợp lệ.");
  if (!/^\d{9,11}$/.test(phone)) throw new Error("Số điện thoại chưa hợp lệ.");
  if (!bookingDate || bookingDate < today) throw new Error("Ngày đặt bàn chưa hợp lệ.");
  if (!bookingTime) throw new Error("Giờ đặt bàn chưa hợp lệ.");
  if (!Number.isInteger(guests) || guests < 1 || guests > 12) {
    throw new Error("Số khách chưa hợp lệ.");
  }

  return { customerName, phone, bookingDate, bookingTime, guests };
}

function makeBookingCode() {
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
  return `EMB${Date.now().toString().slice(-6)}${suffix}`;
}

function makePaymentCode(bookingCode: string) {
  return `EBBQ${bookingCode.replace(/[^A-Z0-9]/gi, "").slice(-10).toUpperCase()}`;
}

function buildQrUrl(paymentCode: string) {
  const bankAccount = Deno.env.get("SEPAY_BANK_ACCOUNT") || "";
  const bankCode = Deno.env.get("SEPAY_BANK_CODE") || "";

  if (!bankAccount || !bankCode) {
    return "";
  }

  const params = new URLSearchParams({
    acc: bankAccount,
    bank: bankCode,
    amount: String(DEPOSIT_AMOUNT),
    des: paymentCode,
  });

  return `https://qr.sepay.vn/img?${params.toString()}`;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json(405, { ok: false, error: "Method not allowed." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = request.headers.get("Authorization");

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return json(500, {
      ok: false,
      error: "Thiếu SUPABASE_URL, SUPABASE_ANON_KEY hoặc SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  if (!authHeader) {
    return json(401, { ok: false, error: "Bạn cần đăng nhập trước khi đặt bàn." });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return json(401, { ok: false, error: "Phiên đăng nhập không hợp lệ." });
  }

  let payload: ReturnType<typeof assertBookingPayload>;

  try {
    payload = assertBookingPayload(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Thông tin đặt bàn chưa hợp lệ.";
    return json(400, { ok: false, error: message });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + HOLD_MINUTES * 60_000).toISOString();

  await adminClient
    .from("bookings")
    .update({
      status: BOOKING_STATUS_EXPIRED,
      payment_status: PAYMENT_STATUS_EXPIRED,
      updated_at: now.toISOString(),
    })
    .lt("payment_expires_at", now.toISOString())
    .eq("payment_status", PAYMENT_STATUS_PENDING)
    .neq("status", CANCELLED_STATUS);

  const { data: existingSlot, error: slotError } = await adminClient
    .rpc("get_booked_slots", { target_date: payload.bookingDate });

  if (slotError) {
    return json(500, { ok: false, error: slotError.message });
  }

  if ((existingSlot || []).some((item: { booking_time?: string } | string) =>
    (typeof item === "string" ? item : item.booking_time) === payload.bookingTime
  )) {
    return json(409, {
      ok: false,
      error: "Khung giờ này vừa có người khác giữ bàn. Vui lòng chọn giờ khác.",
    });
  }

  const bookingCode = makeBookingCode();
  const paymentCode = makePaymentCode(bookingCode);
  const qrUrl = buildQrUrl(paymentCode);
  const bankCode = Deno.env.get("SEPAY_BANK_CODE") || "";
  const bankAccount = Deno.env.get("SEPAY_BANK_ACCOUNT") || "";
  const bankAccountName = Deno.env.get("SEPAY_BANK_ACCOUNT_NAME") || "";

  const { data: booking, error: insertError } = await adminClient
    .from("bookings")
    .insert({
      booking_code: bookingCode,
      user_id: user.id,
      customer_name: payload.customerName,
      customer_email: user.email || null,
      phone: payload.phone,
      booking_date: payload.bookingDate,
      booking_time: payload.bookingTime,
      guests: payload.guests,
      status: BOOKING_STATUS_PENDING_QR,
      deposit_amount: DEPOSIT_AMOUNT,
      payment_code: paymentCode,
      payment_status: PAYMENT_STATUS_PENDING,
      payment_expires_at: expiresAt,
    })
    .select("id, booking_code, customer_name, booking_date, booking_time, guests, status, payment_code, payment_status, payment_expires_at, deposit_amount")
    .single();

  if (insertError) {
    const message = insertError.code === "23505"
      ? "Khung giờ này vừa có người khác đặt trước. Vui lòng chọn giờ khác."
      : insertError.message;
    return json(409, { ok: false, error: message });
  }

  const { data: payment, error: paymentError } = await adminClient
    .from("payments")
    .insert({
      booking_id: booking.id,
      booking_code: bookingCode,
      payment_code: paymentCode,
      amount: DEPOSIT_AMOUNT,
      status: PAYMENT_STATUS_PENDING,
      bank_code: bankCode || null,
      bank_account: bankAccount || null,
      bank_account_name: bankAccountName || null,
      qr_url: qrUrl || null,
      expires_at: expiresAt,
    })
    .select("id, payment_code, status, amount, bank_code, bank_account, bank_account_name, qr_url, expires_at")
    .single();

  if (paymentError) {
    await adminClient.from("bookings").delete().eq("id", booking.id);
    return json(500, { ok: false, error: paymentError.message });
  }

  return json(200, {
    ok: true,
    booking,
    payment,
    setupMissing: !qrUrl,
    message: qrUrl
      ? "Đã giữ bàn và tạo QR thanh toán tự động."
      : "Đã giữ bàn. Vui lòng điền SEPAY_BANK_ACCOUNT và SEPAY_BANK_CODE để hiện QR động.",
  });
});
