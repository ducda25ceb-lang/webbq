import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAILS = new Set(["ducanh12082007dn@gmail.com"]);

type BookingRow = {
  id: string;
  user_id: string;
  booking_code: string;
  customer_name: string;
  customer_email: string | null;
  phone: string;
  booking_date: string;
  booking_time: string;
  guests: number;
  status: string;
  confirmed_at: string | null;
  confirmation_email_sent_at: string | null;
  created_at: string;
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatBookingDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function buildEmailHtml(booking: BookingRow) {
  const safeName = escapeHtml(booking.customer_name);
  const safeCode = escapeHtml(booking.booking_code);
  const safePhone = escapeHtml(booking.phone);
  const formattedDate = escapeHtml(formatBookingDate(booking.booking_date));
  const safeTime = escapeHtml(booking.booking_time);

  return `
    <div style="font-family:Arial,sans-serif;background:#fff8f0;color:#231815;padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #f0d4a3;border-radius:16px;overflow:hidden;">
        <div style="background:#231815;color:#f6d28b;padding:24px 28px;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;">Ember BBQ</p>
          <h1 style="margin:0;font-size:28px;line-height:1.2;">Xác nhận đặt bàn thành công</h1>
        </div>
        <div style="padding:28px;">
          <p style="margin-top:0;">Chào ${safeName},</p>
          <p>Ember BBQ đã ghi nhận thành công bàn của bạn sau khi thanh toán QR.</p>
          <div style="background:#fff4df;border-radius:12px;padding:18px 20px;margin:20px 0;">
            <p style="margin:0 0 10px;"><strong>Mã đặt bàn:</strong> ${safeCode}</p>
            <p style="margin:0 0 10px;"><strong>Ngày:</strong> ${formattedDate}</p>
            <p style="margin:0 0 10px;"><strong>Giờ:</strong> ${safeTime}</p>
            <p style="margin:0 0 10px;"><strong>Số khách:</strong> ${booking.guests}</p>
            <p style="margin:0;"><strong>Số điện thoại:</strong> ${safePhone}</p>
          </div>
          <p style="margin-bottom:0;">Vui lòng có mặt trước giờ hẹn khoảng 10-15 phút. Nếu cần hỗ trợ, hãy phản hồi email này hoặc liên hệ nhà hàng.</p>
        </div>
      </div>
    </div>
  `;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("BOOKING_FROM_EMAIL");
  const authHeader = request.headers.get("Authorization");

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !supabaseServiceRoleKey ||
    !resendApiKey ||
    !fromEmail
  ) {
    return json(500, {
      error:
        "Missing SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY or BOOKING_FROM_EMAIL.",
    });
  }

  if (!authHeader) {
    return json(401, { error: "Missing authorization header." });
  }

  const { bookingCode } = await request.json().catch(() => ({}));

  if (!bookingCode || typeof bookingCode !== "string") {
    return json(400, { error: "bookingCode is required." });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return json(401, { error: "Unauthorized." });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const isAdmin = ADMIN_EMAILS.has((user.email || "").trim().toLowerCase()) ||
    user.user_metadata?.role === "admin" ||
    user.app_metadata?.role === "admin";

  const { data: booking, error: bookingError } = await adminClient
    .from("bookings")
    .select(
      "id, user_id, booking_code, customer_name, customer_email, phone, booking_date, booking_time, guests, status, confirmed_at, confirmation_email_sent_at, created_at",
    )
    .eq("booking_code", bookingCode)
    .maybeSingle<BookingRow>();

  if (bookingError) {
    return json(500, { error: bookingError.message });
  }

  if (!booking) {
    return json(404, { error: "Booking not found." });
  }

  if (!isAdmin && booking.user_id !== user.id) {
    return json(403, { error: "You cannot confirm this booking." });
  }

  const recipient = booking.customer_email || user.email;

  if (!recipient) {
    return json(400, { error: "Booking does not have a customer email." });
  }

  const now = new Date().toISOString();
  const alreadySent = Boolean(booking.confirmation_email_sent_at);

  if (alreadySent) {
    const { error: updateBookingError } = await adminClient
      .from("bookings")
      .update({
        status: "Đã xác nhận",
        confirmed_at: booking.confirmed_at || now,
        updated_at: now,
      })
      .eq("id", booking.id);

    if (updateBookingError) {
      return json(500, { error: updateBookingError.message });
    }

    return json(200, {
      ok: true,
      alreadySent: true,
      email: recipient,
      message: `Email xac nhan da duoc gui truoc do toi ${recipient}.`,
    });
  }

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [recipient],
      subject: `[Ember BBQ] Xac nhan dat ban ${booking.booking_code}`,
      html: buildEmailHtml(booking),
    }),
  });

  if (!resendResponse.ok) {
    return json(502, {
      error: await resendResponse.text(),
    });
  }

  const resendPayload = await resendResponse.json();

  const { error: markSentError } = await adminClient
    .from("bookings")
    .update({
      status: "Đã xác nhận",
      confirmed_at: booking.confirmed_at || now,
      confirmation_email_sent_at: now,
      updated_at: now,
    })
    .eq("id", booking.id);

  if (markSentError) {
    return json(500, { error: markSentError.message });
  }

  return json(200, {
    ok: true,
    email: recipient,
    resendId: resendPayload.id,
    message: `Email xac nhan dat ban da duoc gui toi ${recipient}.`,
  });
});
