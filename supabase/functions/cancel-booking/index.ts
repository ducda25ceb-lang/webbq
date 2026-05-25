import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BOOKING_STATUS_CANCELLED = "Đã hủy - mất cọc";
const PAYMENT_STATUS_CANCELLED = "Đã hủy";

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
    return json(401, { ok: false, error: "Bạn cần đăng nhập để hủy bàn." });
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
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = adminEmails.includes((user.email || "").trim().toLowerCase()) ||
    user.app_metadata?.role === "admin" ||
    user.user_metadata?.role === "admin";

  let query = adminClient
    .from("bookings")
    .update({
      status: BOOKING_STATUS_CANCELLED,
      payment_status: PAYMENT_STATUS_CANCELLED,
      admin_updated_at: new Date().toISOString(),
      admin_updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("booking_code", bookingCode)
    .neq("status", BOOKING_STATUS_CANCELLED);

  if (!isAdmin) {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query.select("id, booking_code").maybeSingle();

  if (error) {
    return json(500, { ok: false, error: error.message });
  }

  if (!data) {
    return json(404, { ok: false, error: "Không tìm thấy đơn hoặc đơn đã hủy." });
  }

  await adminClient
    .from("payments")
    .update({
      status: PAYMENT_STATUS_CANCELLED,
      updated_at: new Date().toISOString(),
    })
    .eq("booking_id", data.id);

  return json(200, {
    ok: true,
    message: "Đặt bàn đã được hủy. Khoản cọc sẽ không được hoàn lại theo chính sách.",
  });
});
