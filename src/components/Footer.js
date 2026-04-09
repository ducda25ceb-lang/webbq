import React from "https://esm.sh/react@18.2.0";

export function Footer() {
  return React.createElement(
    "footer",
    { className: "site-footer" },
    React.createElement(
      "div",
      { className: "container footer-grid" },
      React.createElement(
        "div",
        null,
        React.createElement("h3", null, "EMBER BBQ"),
        React.createElement(
          "p",
          null,
          "Fine-dining BBQ house với hương vị nướng than tinh tế.",
        ),
      ),
      React.createElement(
        "div",
        null,
        React.createElement("h4", null, "Thông tin"),
        React.createElement("p", null, "12 Nguyễn Huệ, Quận 1, TP.HCM"),
        React.createElement("p", null, "Hotline: 0909 123 456"),
      ),
      React.createElement(
        "div",
        null,
        React.createElement("h4", null, "Giờ mở cửa"),
        React.createElement("p", null, "11:00 - 14:00 | 17:00 - 23:00"),
      ),
    ),
  );
}
