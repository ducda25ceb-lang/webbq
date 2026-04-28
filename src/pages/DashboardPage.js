import React from "https://esm.sh/react@18.2.0";
import { isAdminUser } from "../config/admin.js";
import { mockBookings } from "../data/mockData.js";
import { useAuth } from "../context/AuthContext.js";
import {
  BOOKING_STATUS_CANCELLED,
  BOOKING_STATUS_CONFIRMED,
  BOOKING_STATUS_PENDING_QR,
  cancelBooking,
  finalizeBookingPayment,
  isSupabaseConfigured,
  supabase,
} from "../lib/supabase.js";

function formatBookingRow(row) {
  return {
    id: row.booking_code || row.id,
    bookingCode: row.booking_code || row.id,
    customer: row.customer_name || row.customer_email || "Khách",
    date: row.booking_date || row.date,
    time: row.booking_time || row.time,
    guests: row.guests,
    status: row.status,
  };
}

function getDisplayStatus(status, isAdmin) {
  if (isAdmin && status === BOOKING_STATUS_CANCELLED) {
    return "Đã hủy";
  }

  return status;
}

export function DashboardPage() {
  const { authBusy, linkGoogleAccount, user } = useAuth();
  const canViewAllBookings = isAdminUser(user);
  const [bookings, setBookings] = React.useState([]);
  const [loading, setLoading] = React.useState(isSupabaseConfigured);
  const [error, setError] = React.useState("");
  const [actionMsg, setActionMsg] = React.useState("");
  const [confirmingCode, setConfirmingCode] = React.useState("");
  const [cancelingCode, setCancelingCode] = React.useState("");
  const shouldUseMock = !isSupabaseConfigured;
  const displayRows = shouldUseMock ? mockBookings : bookings;

  const canCancelBooking = React.useCallback(
    (status) => status !== BOOKING_STATUS_CANCELLED,
    [],
  );

  const canAcceptBooking = React.useCallback(
    (status) => status !== BOOKING_STATUS_CONFIRMED &&
      status !== BOOKING_STATUS_CANCELLED,
    [],
  );

  const onLinkGoogleAccount = async () => {
    if (!linkGoogleAccount) {
      return;
    }

    setError("");
    setActionMsg("");

    const result = await linkGoogleAccount();

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setActionMsg(result.message);
  };

  React.useEffect(() => {
    let active = true;

    async function loadBookings() {
      if (!isSupabaseConfigured) {
        setBookings(mockBookings);
        setLoading(false);
        return;
      }

      if (!user?.id) {
        setBookings([]);
        setError("");
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        let query = supabase
          .from("bookings")
          .select(
            "booking_code, customer_name, customer_email, booking_date, booking_time, guests, status",
          );

        if (!canViewAllBookings) {
          query = query.eq("user_id", user.id);
        }

        const { data, error: loadError } = await query
          .order("booking_date", { ascending: false })
          .order("booking_time", { ascending: false });

        if (!active) {
          return;
        }

        if (loadError) {
          setError(loadError.message);
          setBookings([]);
          return;
        }

        setError("");
        setBookings((data || []).map(formatBookingRow));
      } catch {
        if (!active) {
          return;
        }

        setError("Không thể kết nối Supabase để tải lịch đặt bàn.");
        setBookings([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadBookings();

    return () => {
      active = false;
    };
  }, [canViewAllBookings, user?.id]);

  const confirmBooking = async (bookingCode) => {
    if (
      !isSupabaseConfigured ||
      !bookingCode ||
      confirmingCode ||
      cancelingCode ||
      !user?.id
    ) {
      return;
    }

    setConfirmingCode(bookingCode);
    setError("");
    setActionMsg("");

    try {
      const result = canViewAllBookings
        ? await updateAdminBookingStatus({
            bookingCode,
            status: BOOKING_STATUS_CONFIRMED,
          })
        : await finalizeBookingPayment({
            bookingCode,
            userId: user.id,
          });

      setBookings((current) =>
        current.map((booking) =>
          booking.bookingCode === bookingCode
            ? { ...booking, status: BOOKING_STATUS_CONFIRMED }
            : booking,
        ),
      );
      setActionMsg(
        canViewAllBookings
          ? `Đã chấp nhận đơn đặt bàn ${bookingCode}.`
          : result.message,
      );
    } catch (confirmError) {
      setError(
        confirmError?.context?.message ||
          confirmError?.message ||
          "Không thể hoàn tất đơn đặt bàn lúc này.",
      );
    } finally {
      setConfirmingCode("");
    }
  };

  const onCancelBooking = async (bookingCode) => {
    if (
      !isSupabaseConfigured ||
      !bookingCode ||
      cancelingCode ||
      confirmingCode ||
      !user?.id
    ) {
      return;
    }

    const shouldCancel = globalThis.confirm(
      canViewAllBookings
        ? `Hủy bàn cho đơn ${bookingCode}?`
        : "Hủy đặt bàn này sẽ mất cọc. Bạn vẫn muốn tiếp tục?",
    );

    if (!shouldCancel) {
      return;
    }

    setCancelingCode(bookingCode);
    setError("");
    setActionMsg("");

    try {
      const result = canViewAllBookings
        ? await updateAdminBookingStatus({
            bookingCode,
            status: BOOKING_STATUS_CANCELLED,
          })
        : await cancelBooking({
            bookingCode,
            userId: user.id,
          });

      setBookings((current) =>
        current.map((booking) =>
          booking.bookingCode === bookingCode
            ? { ...booking, status: BOOKING_STATUS_CANCELLED }
            : booking,
        ),
      );
      setActionMsg(
        canViewAllBookings
          ? `Đã hủy bàn cho đơn ${bookingCode}.`
          : result.message,
      );
    } catch (cancelError) {
      setError(
        cancelError?.context?.message ||
          cancelError?.message ||
          "Không thể hủy đặt bàn lúc này.",
      );
    } finally {
      setCancelingCode("");
    }
  };

  const updateAdminBookingStatus = async ({ bookingCode, status }) => {
    if (!bookingCode || !status) {
      throw new Error("Thiếu mã đơn hoặc trạng thái.");
    }

    const payload = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === BOOKING_STATUS_CONFIRMED) {
      payload.confirmed_at = new Date().toISOString();
    }

    const { data, error: updateError } = await supabase
      .from("bookings")
      .update(payload)
      .eq("booking_code", bookingCode)
      .select("booking_code")
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    if (!data) {
      throw new Error("Không tìm thấy đơn hoặc tài khoản admin chưa có quyền cập nhật.");
    }

    return { ok: true };
  };

  return React.createElement(
    "div",
    { className: "container section" },
    React.createElement(
      "h1",
      null,
      canViewAllBookings
        ? "Bảng quản trị đặt bàn"
        : `Xin chào, ${user?.name || "Khách"}`,
    ),
    isSupabaseConfigured && user
      ? React.createElement(
          "section",
          { className: "panel account-link-panel" },
          React.createElement(
            "div",
            { className: "account-profile" },
            user.avatarUrl
              ? React.createElement("img", {
                  src: user.avatarUrl,
                  alt: user.name || "Tài khoản",
                })
              : React.createElement(
                  "span",
                  { className: "account-avatar-fallback" },
                  (user.name || "K").slice(0, 1).toUpperCase(),
                ),
            React.createElement(
              "div",
              null,
              React.createElement("h2", null, user.name || "Khách"),
              React.createElement("p", { className: "muted" }, user.email),
            ),
          ),
          React.createElement(
            "div",
            { className: "account-provider-box" },
            React.createElement(
              "span",
              {
                className: user.hasGoogleLinked
                  ? "provider-badge is-linked"
                  : "provider-badge",
              },
              user.hasGoogleLinked
                ? "Đã liên kết Google"
                : "Chưa liên kết Google",
            ),
            user.hasGoogleLinked
              ? null
              : React.createElement(
                  "button",
                  {
                    type: "button",
                    className: "google-auth-btn compact",
                    onClick: onLinkGoogleAccount,
                    disabled: authBusy,
                  },
                  React.createElement("span", { className: "google-mark" }, "G"),
                  React.createElement(
                    "span",
                    null,
                    authBusy ? "Đang xử lý..." : "Liên kết Google",
                  ),
                ),
          ),
        )
      : null,
    React.createElement(
      "p",
      { className: "muted" },
      shouldUseMock
        ? "Lịch sử đặt bàn (mock data sau đăng nhập)."
        : canViewAllBookings
          ? "Admin đang xem toàn bộ lịch đặt bàn từ Supabase."
          : "Lịch sử đặt bàn đang được tải từ Supabase.",
    ),
    error ? React.createElement("p", { className: "error-msg" }, error) : null,
    actionMsg
      ? React.createElement("p", { className: "success-msg" }, actionMsg)
      : null,
    isSupabaseConfigured && !user
      ? React.createElement(
          "p",
          { className: "muted" },
          "Hãy đăng nhập để xem lịch đặt bàn của bạn.",
        )
      : null,
    React.createElement(
      "div",
      { className: "panel table-wrap" },
      loading
        ? React.createElement("p", null, "Đang tải lịch đặt bàn...")
        : React.createElement(
            "table",
            { className: "book-table" },
            React.createElement(
              "thead",
              null,
              React.createElement(
                "tr",
                null,
                React.createElement("th", null, "Mã đơn"),
                React.createElement("th", null, "Khách hàng"),
                React.createElement("th", null, "Ngày"),
                React.createElement("th", null, "Giờ"),
                React.createElement("th", null, "Số khách"),
                React.createElement("th", null, "Trạng thái"),
              ),
            ),
            React.createElement(
              "tbody",
              null,
              displayRows.length
                ? displayRows.map((booking) =>
                    React.createElement(
                      "tr",
                      { key: booking.id },
                      React.createElement("td", null, booking.id),
                      React.createElement("td", null, booking.customer),
                      React.createElement("td", null, booking.date),
                      React.createElement("td", null, booking.time),
                      React.createElement("td", null, booking.guests),
                      React.createElement(
                        "td",
                        { className: "dashboard-status-cell" },
                        React.createElement(
                          "span",
                          null,
                          getDisplayStatus(booking.status, canViewAllBookings),
                        ),
                        isSupabaseConfigured
                          ? React.createElement(
                              "div",
                              { className: "dashboard-action-group" },
                              canViewAllBookings &&
                                canAcceptBooking(booking.status)
                                ? React.createElement(
                                    "button",
                                    {
                                      type: "button",
                                      className: "btn-gold dashboard-action-btn",
                                      disabled:
                                        confirmingCode === booking.bookingCode ||
                                        cancelingCode === booking.bookingCode,
                                      onClick: () =>
                                        confirmBooking(booking.bookingCode),
                                    },
                                    confirmingCode === booking.bookingCode
                                      ? "Đang chấp nhận..."
                                      : "Chấp nhận đặt bàn",
                                  )
                                : null,
                              !canViewAllBookings &&
                                booking.status === BOOKING_STATUS_PENDING_QR
                                ? React.createElement(
                                    "button",
                                    {
                                      type: "button",
                                      className: "btn-gold dashboard-action-btn",
                                      disabled:
                                        confirmingCode === booking.bookingCode ||
                                        cancelingCode === booking.bookingCode,
                                      onClick: () =>
                                        confirmBooking(booking.bookingCode),
                                    },
                                    confirmingCode === booking.bookingCode
                                      ? "Đang xác nhận..."
                                      : "Hoàn tất QR",
                                  )
                                : null,
                              canCancelBooking(booking.status)
                                ? React.createElement(
                                    "button",
                                    {
                                      type: "button",
                                      className:
                                        "btn-outline dashboard-action-btn dashboard-cancel-btn",
                                      disabled:
                                        confirmingCode === booking.bookingCode ||
                                        cancelingCode === booking.bookingCode,
                                      onClick: () =>
                                        onCancelBooking(booking.bookingCode),
                                    },
                                    cancelingCode === booking.bookingCode
                                      ? "Đang hủy..."
                                      : canViewAllBookings
                                        ? "Hủy bàn"
                                        : "Hủy đặt bàn",
                                  )
                                : null,
                            )
                          : null,
                      ),
                    ),
                  )
                : React.createElement(
                    "tr",
                    null,
                    React.createElement(
                      "td",
                      { colSpan: 6, className: "muted" },
                      "Chưa có lịch đặt bàn nào.",
                    ),
                  ),
            ),
          ),
    ),
  );
}
