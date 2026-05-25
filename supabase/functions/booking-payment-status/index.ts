import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    return json(500, { ok: false, error: "Thiếu cấu hình Supabase Edge Function." });
  }

  if (!authHeader) {
    return json(401, { ok: false, error: "Bạn cần đăng nhập để xem trạng thái." });
  }

  const { bookingCode } = await request.json().catch(() => ({}));

  if (!bookingCode || typeof bookingCode !== "string") {
    return json(400, { ok: false, error: "Thiếu mã đặt bàn." });
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

  const adminEmails = (Deno.env.get("ADMIN_EMAILS") || "ducanh12082007dn@gmail.com")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = adminEmails.includes((user.email || "").trim().toLowerCase()) ||
    user.app_metadata?.role === "admin" ||
    user.user_metadata?.role === "admin";

  const { data: booking, error: bookingError } = await adminClient
    .from("bookings")
    .select("id, user_id, booking_code, customer_name, customer_email, phone, booking_date, booking_time, guests, status, deposit_amount, payment_code, payment_status, payment_expires_at, payment_confirmed_at, created_at, updated_at")
    .eq("booking_code", bookingCode)
    .maybeSingle();

  if (bookingError) {
    return json(500, { ok: false, error: bookingError.message });
  }

  if (!booking) {
    return json(404, { ok: false, error: "Không tìm thấy đơn đặt bàn." });
  }

  if (!isAdmin && booking.user_id !== user.id) {
    return json(403, { ok: false, error: "Bạn không có quyền xem đơn này." });
  }

  const { data: payment, error: paymentError } = await adminClient
    .from("payments")
    .select("id, payment_code, status, amount, bank_code, bank_account, bank_account_name, qr_url, transfer_amount, transfer_content, paid_at, expires_at, updated_at")
    .eq("booking_id", booking.id)
    .maybeSingle();

  if (paymentError) {
    return json(500, { ok: false, error: paymentError.message });
  }

  return json(200, { ok: true, booking, payment });
});
