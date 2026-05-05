import React from "https://esm.sh/react@18.2.0";
import {
  BOOKING_STATUS_CANCELLED,
  BOOKING_STATUS_CONFIRMED,
  BOOKING_STATUS_PENDING_QR,
  ADMIN_EMAILS,
  isSupabaseConfigured,
  sendBookingConfirmationEmail,
  supabase,
} from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.js";

const BOOKING_SELECT =
  "id, booking_code, customer_name, customer_email, phone, booking_date, booking_time, guests, status, created_at";
const DEPOSIT_AMOUNT = 100000;
const LEGACY_PENDING_STATUS = "Đang chờ";

function getLocalDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isPendingBooking(status) {
  return status === BOOKING_STATUS_PENDING_QR || status === LEGACY_PENDING_STATUS;
}

function formatMoney(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAdminDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function getAdminDisplayStatus(status) {
  if (status === BOOKING_STATUS_CANCELLED) {
    return "Đã hủy";
  }

  return status;
}

export function AdminPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = React.useState([]);
  const [loading, setLoading] = React.useState(isSupabaseConfigured);
  const [error, setError] = React.useState("");
  const [actionMsg, setActionMsg] = React.useState("");
  const [busyId, setBusyId] = React.useState("");
  const adminEmailsText = ADMIN_EMAILS.join(", ");

  const stats = React.useMemo(() => {
    const today = getLocalDateValue();
    const activeBookings = bookings.filter(
      (booking) => booking.status !== BOOKING_STATUS_CANCELLED,
    );
    const confirmedBookings = bookings.filter(
      (booking) => booking.status === BOOKING_STATUS_CONFIRMED,
    );
    const pendingBookings = bookings.filter((booking) =>
      isPendingBooking(booking.status),
    );
    const cancelledBookings = bookings.filter(
      (booking) => booking.status === BOOKING_STATUS_CANCELLED,
    );
    const todayBookings = activeBookings.filter(
      (booking) => booking.booking_date === today,
    );
    const upcomingBookings = activeBookings.filter(
      (booking) => booking.booking_date >= today,
    );
    const upcomingGuests = upcomingBookings.reduce(
      (sum, booking) => sum + Number(booking.guests || 0),
      0,
    );

    return [
      {
        label: "Tổng đơn",
        value: String(bookings.length),
        detail: `${activeBookings.length} đơn còn hiệu lực`,
      },
      {
        label: "Đã xác nhận",
        value: String(confirmedBookings.length),
        detail: `${formatMoney(confirmedBookings.length * DEPOSIT_AMOUNT)} tiền cọc`,
      },
      {
        label: "Chờ QR",
        value: String(pendingBookings.length),
        detail: "Cần khách hoặc admin hoàn tất",
      },
      {
        label: "Đã hủy",
        value: String(cancelledBookings.length),
        detail: "Không còn giữ khung giờ",
      },
      {
        label: "Hôm nay",
        value: String(todayBookings.length),
        detail: `${todayBookings.reduce(
          (sum, booking) => sum + Number(booking.guests || 0),
          0,
        )} khách`,
      },
      {
        label: "Sắp tới",
        value: String(upcomingBookings.length),
        detail: `${upcomingGuests} khách còn hiệu lực`,
      },
    ];
  }, [bookings]);

  const loadBookings = React.useCallback(async () => {
    if (!isSupabaseConfigured) {
      setBookings([]);
      setLoading(false);
      setError("Trang admin cần Supabase để tải danh sách đặt bàn thật.");
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .order("booking_date", { ascending: false })
      .order("booking_time", { ascending: false });

    if (loadError) {
      setBookings([]);
      setError(loadError.message);
      setLoading(false);
      return;
    }

    setBookings(data || []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const updateBookingStatus = async (booking, status) => {
    if (!booking?.id || busyId) {
      return;
    }

    setBusyId(booking.id);
    setError("");
    setActionMsg("");

    if (status === BOOKING_STATUS_CANCELLED) {
      const shouldCancel = globalThis.confirm(
        `Hủy bàn cho đơn ${booking.booking_code}?`,
      );

      if (!shouldCancel) {
        setBusyId("");
        return;
      }
    }

    let actionMessage = "";

    if (status === BOOKING_STATUS_CONFIRMED) {
      const result = await sendBookingConfirmationEmail({
        bookingCode: booking.booking_code,
      });
      actionMessage = result.message;
    } else {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      if (updateError) {
        setError(updateError.message);
        setBusyId("");
        return;
      }

      actionMessage = `Đã hủy bàn cho đơn ${booking.booking_code}.`;
    }

    setBookings((current) =>
      current.map((item) =>
        item.id === booking.id ? { ...item, status } : item,
      ),
    );
    setActionMsg(actionMessage);
    setBusyId("");
  };

  const deleteBooking = async (booking) => {
    if (!booking?.id || busyId) {
      return;
    }

    const shouldDelete = globalThis.confirm(
      `Xóa đơn ${booking.booking_code}? Hành động này không thể hoàn tác.`,
    );

    if (!shouldDelete) {
      return;
    }

    setBusyId(booking.id);
    setError("");
    setActionMsg("");

    const { error: deleteError } = await supabase
      .from("bookings")
      .delete()
      .eq("id", booking.id);

    if (deleteError) {
      setError(deleteError.message);
      setBusyId("");
      return;
    }

    setBookings((current) => current.filter((item) => item.id !== booking.id));
    setActionMsg(`Đã xóa đơn ${booking.booking_code}.`);
    setBusyId("");
  };

  return React.createElement(
    "div",
    { className: "container section admin-page" },
    React.createElement(
      "div",
      { className: "admin-heading" },
      React.createElement(
        "div",
        null,
        React.createElement("p", { className: "eyebrow" }, "Quản trị"),
        React.createElement("h1", null, "Quản lý đặt bàn"),
        React.createElement(
          "p",
          { className: "muted" },
          "Trang này chỉ mở cho tài khoản admin đã đăng nhập.",
        ),
        React.createElement(
          "p",
          { className: "muted admin-permission-note" },
          `Đang đăng nhập: ${user?.email || "không rõ"} | Email admin hợp lệ: ${adminEmailsText}`,
        ),
      ),
      React.createElement(
        "button",
        {
          type: "button",
          className: "btn-outline",
          onClick: loadBookings,
          disabled: loading,
        },
        loading ? "Đang tải..." : "Tải lại",
      ),
    ),
    error ? React.createElement("p", { className: "error-msg" }, error) : null,
    actionMsg
      ? React.createElement("p", { className: "success-msg" }, actionMsg)
      : null,
    React.createElement(
      "section",
      { className: "admin-stats-grid", "aria-label": "Thống kê đặt bàn" },
      stats.map((item) =>
        React.createElement(
          "article",
          { key: item.label, className: "admin-stat-card" },
          React.createElement("span", null, item.label),
          React.createElement("strong", null, loading ? "-" : item.value),
          React.createElement(
            "p",
            null,
            loading ? "Đang cập nhật dữ liệu" : item.detail,
          ),
        ),
      ),
    ),
    React.createElement(
      "div",
      { className: "panel table-wrap admin-table-panel" },
      loading
        ? React.createElement("p", null, "Đang tải danh sách đặt bàn...")
        : React.createElement(
            "table",
            { className: "book-table admin-book-table" },
            React.createElement(
              "thead",
              null,
              React.createElement(
                "tr",
                null,
                React.createElement("th", null, "Mã đơn"),
                React.createElement("th", null, "Khách"),
                React.createElement("th", null, "Liên hệ"),
                React.createElement("th", null, "Ngày giờ"),
                React.createElement("th", null, "Số khách"),
                React.createElement("th", null, "Trạng thái"),
                React.createElement("th", null, "Thao tác"),
              ),
            ),
            React.createElement(
              "tbody",
              null,
              bookings.length
                ? bookings.map((booking) =>
                    React.createElement(
                      "tr",
                      { key: booking.id },
                      React.createElement("td", null, booking.booking_code),
                      React.createElement(
                        "td",
                        null,
                        booking.customer_name || "Khách",
                      ),
                      React.createElement(
                        "td",
                        null,
                        React.createElement("div", null, booking.phone),
                        React.createElement(
                          "span",
                          { className: "muted admin-email-cell" },
                          booking.customer_email || "Không có email",
                        ),
                      ),
                      React.createElement(
                        "td",
                        null,
                        `${formatAdminDate(booking.booking_date)} - ${booking.booking_time}`,
                      ),
                      React.createElement("td", null, booking.guests),
                      React.createElement(
                        "td",
                        null,
                        getAdminDisplayStatus(booking.status),
                      ),
                      React.createElement(
                        "td",
                        null,
                        React.createElement(
                          "div",
                          { className: "admin-action-group" },
                          booking.status !== BOOKING_STATUS_CONFIRMED
                            ? React.createElement(
                                "button",
                                {
                                  type: "button",
                                  className: "btn-gold admin-action-btn",
                                  disabled: busyId === booking.id,
                                  onClick: () =>
                                    updateBookingStatus(
                                      booking,
                                      BOOKING_STATUS_CONFIRMED,
                                    ),
                                },
                                "Chấp nhận đặt bàn",
                              )
                            : null,
                          booking.status !== BOOKING_STATUS_CANCELLED
                            ? React.createElement(
                                "button",
                                {
                                  type: "button",
                                  className:
                                    "btn-outline admin-action-btn dashboard-cancel-btn",
                                  disabled: busyId === booking.id,
                                  onClick: () =>
                                    updateBookingStatus(
                                      booking,
                                      BOOKING_STATUS_CANCELLED,
                                    ),
                                },
                                "Hủy bàn",
                              )
                            : null,
                          booking.status === BOOKING_STATUS_PENDING_QR
                            ? React.createElement(
                                "span",
                                { className: "muted admin-payment-note" },
                                "Chờ khách hoàn tất QR",
                              )
                            : null,
                          React.createElement(
                            "button",
                            {
                              type: "button",
                              className:
                                "btn-outline admin-action-btn dashboard-cancel-btn",
                              disabled: busyId === booking.id,
                              onClick: () => deleteBooking(booking),
                            },
                            "Xóa",
                          ),
                        ),
                      ),
                    ),
                  )
                : React.createElement(
                    "tr",
                    null,
                    React.createElement(
                      "td",
                      { colSpan: 7, className: "muted" },
                      "Chưa có đơn đặt bàn nào.",
                    ),
                  ),
            ),
          ),
    ),
  );
}
