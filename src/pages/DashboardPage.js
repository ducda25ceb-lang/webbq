import React from "https://esm.sh/react@18.2.0";
import { mockBookings } from "../data/mockData.js";
import { useAuth } from "../context/AuthContext.js";

export function DashboardPage() {
  const { user } = useAuth();

  return React.createElement(
    "div",
    { className: "container section" },
    React.createElement("h1", null, `Xin chào, ${user?.name || "Khách"}`),
    React.createElement(
      "p",
      { className: "muted" },
      "Lịch sử đặt bàn (mock data sau đăng nhập).",
    ),
    React.createElement(
      "div",
      { className: "panel table-wrap" },
      React.createElement(
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
          mockBookings.map((b) =>
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
          ),
        ),
      ),
    ),
  );
}
