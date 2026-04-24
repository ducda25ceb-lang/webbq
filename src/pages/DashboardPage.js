import React from "https://esm.sh/react@18.2.0";
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
    customer: row.customer_name || row.customer_email || "Kh\u00e1ch",
    date: row.booking_date || row.date,
    time: row.booking_time || row.time,
    guests: row.guests,
    status: row.status,
  };
}

export function DashboardPage() {
  const { user } = useAuth();
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
        const { data, error: loadError } = await supabase
          .from("bookings")
          .select(
            "booking_code, customer_name, customer_email, booking_date, booking_time, guests, status",
          )
          .eq("user_id", user.id)
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

        setError(
          "Kh\u00f4ng th\u1ec3 k\u1ebft n\u1ed1i Supabase \u0111\u1ec3 t\u1ea3i l\u1ecbch \u0111\u1eb7t b\u00e0n.",
        );
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
  }, [user?.id]);

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
      const result = await finalizeBookingPayment({
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
      setActionMsg(result.message);
    } catch (confirmError) {
      setError(
        confirmError?.context?.message ||
          confirmError?.message ||
          "Kh\u00f4ng th\u1ec3 ho\u00e0n t\u1ea5t \u0111\u01a1n \u0111\u1eb7t b\u00e0n l\u00fac n\u00e0y.",
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
      "Hủy đặt bàn này sẽ mất cọc. Bạn vẫn muốn tiếp tục?",
    );

    if (!shouldCancel) {
      return;
    }

    setCancelingCode(bookingCode);
    setError("");
    setActionMsg("");

    try {
      const result = await cancelBooking({
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
      setActionMsg(result.message);
    } catch (cancelError) {
      setError(
        cancelError?.context?.message ||
          cancelError?.message ||
          "Kh\u00f4ng th\u1ec3 h\u1ee7y \u0111\u1eb7t b\u00e0n l\u00fac n\u00e0y.",
      );
    } finally {
      setCancelingCode("");
    }
  };

  return React.createElement(
    "div",
    { className: "container section" },
    React.createElement("h1", null, `Xin ch\u00e0o, ${user?.name || "Kh\u00e1ch"}`),
    React.createElement(
      "p",
      { className: "muted" },
      shouldUseMock
        ? "L\u1ecbch s\u1eed \u0111\u1eb7t b\u00e0n (mock data sau \u0111\u0103ng nh\u1eadp)."
        : "L\u1ecbch s\u1eed \u0111\u1eb7t b\u00e0n \u0111ang \u0111\u01b0\u1ee3c t\u1ea3i t\u1eeb Supabase.",
    ),
    error ? React.createElement("p", { className: "error-msg" }, error) : null,
    actionMsg
      ? React.createElement("p", { className: "success-msg" }, actionMsg)
      : null,
    isSupabaseConfigured && !user
      ? React.createElement(
          "p",
          { className: "muted" },
          "H\u00e3y \u0111\u0103ng nh\u1eadp \u0111\u1ec3 xem l\u1ecbch \u0111\u1eb7t b\u00e0n c\u1ee7a b\u1ea1n.",
        )
      : null,
    React.createElement(
      "div",
      { className: "panel table-wrap" },
      loading
        ? React.createElement("p", null, "\u0110ang t\u1ea3i l\u1ecbch \u0111\u1eb7t b\u00e0n...")
        : React.createElement(
            "table",
            { className: "book-table" },
            React.createElement(
              "thead",
              null,
              React.createElement(
                "tr",
                null,
                React.createElement("th", null, "M\u00e3 \u0111\u01a1n"),
                React.createElement("th", null, "Kh\u00e1ch h\u00e0ng"),
                React.createElement("th", null, "Ng\u00e0y"),
                React.createElement("th", null, "Gi\u1edd"),
                React.createElement("th", null, "S\u1ed1 kh\u00e1ch"),
                React.createElement("th", null, "Tr\u1ea1ng th\u00e1i"),
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
                        React.createElement("span", null, booking.status),
                        isSupabaseConfigured
                          ? React.createElement(
                              "div",
                              { className: "dashboard-action-group" },
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
                                      ? "\u0110ang x\u00e1c nh\u1eadn..."
                                      : "Ho\u00e0n t\u1ea5t QR",
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
                                      ? "\u0110ang h\u1ee7y..."
                                      : "H\u1ee7y \u0111\u1eb7t b\u00e0n",
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
                      "Ch\u01b0a c\u00f3 l\u1ecbch \u0111\u1eb7t b\u00e0n n\u00e0o.",
                    ),
                  ),
            ),
          ),
    ),
  );
}
