import React from "https://esm.sh/react@18.2.0";
import { mockBookings } from "../data/mockData.js";
import { useAuth } from "../context/AuthContext.js";
import { isSupabaseConfigured, supabase } from "../lib/supabase.js";

function formatBookingRow(row) {
  return {
    id: row.booking_code || row.id,
    customer: row.customer_name || row.customer_email || "Khách",
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
  const shouldUseMock = !isSupabaseConfigured;
  const displayRows = shouldUseMock ? mockBookings : bookings;

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
        } else {
          setError("");
          setBookings((data || []).map(formatBookingRow));
        }
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
  }, [user?.id]);

  return React.createElement(
    "div",
    { className: "container section" },
    React.createElement("h1", null, `Xin chào, ${user?.name || "Khách"}`),
    React.createElement(
      "p",
      { className: "muted" },
      shouldUseMock
        ? "Lịch sử đặt bàn (mock data sau đăng nhập)."
        : "Lịch sử đặt bàn đang được tải từ Supabase.",
    ),
    error ? React.createElement("p", { className: "error-msg" }, error) : null,
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
                ? displayRows.map((b) =>
                    React.createElement(
                      "tr",
                      { key: b.id },
                      React.createElement("td", null, b.id),
                      React.createElement("td", null, b.customer),
                      React.createElement("td", null, b.date),
                      React.createElement("td", null, b.time),
                      React.createElement("td", null, b.guests),
                      React.createElement("td", null, b.status),
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
