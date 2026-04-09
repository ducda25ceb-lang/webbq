import React from "https://esm.sh/react@18.2.0";
import { businessInfo } from "../data/mockData.js";
import { useScrollReveal } from "../components/ScrollReveal.js";

export function ContactPage() {
  useScrollReveal();

  return React.createElement(
    "div",
    { className: "container section" },
    React.createElement("h1", { className: "reveal" }, "Liên Hệ"),
    React.createElement(
      "div",
      { className: "contact-grid reveal" },
      React.createElement(
        "article",
        { className: "panel" },
        React.createElement("h3", null, "Thông tin nhà hàng"),
        React.createElement("p", null, `Địa chỉ: ${businessInfo.address}`),
        React.createElement("p", null, `Hotline: ${businessInfo.hotline}`),
        React.createElement("p", null, `Email: ${businessInfo.email}`),
        React.createElement("p", null, `Đậu xe: ${businessInfo.parking}`),
        React.createElement(
          "a",
          {
            href: `tel:${businessInfo.hotline.replaceAll(" ", "")}`,
            className: "btn-gold contact-call-btn",
          },
          "Gọi đặt bàn ngay",
        ),
      ),
      React.createElement(
        "article",
        { className: "panel" },
        React.createElement("h3", null, "Giờ mở cửa"),
        React.createElement(
          "div",
          { className: "opening-hours" },
          businessInfo.hours.map((h) =>
            React.createElement(
              "div",
              { key: h.day, className: "hours-row" },
              React.createElement("strong", null, h.day),
              React.createElement("span", null, h.time),
            ),
          ),
        ),
      ),
      React.createElement(
        "article",
        { className: "panel" },
        React.createElement("h3", null, "Gửi yêu cầu"),
        React.createElement(
          "form",
          { className: "comment-form" },
          React.createElement("input", { placeholder: "Tên của bạn" }),
          React.createElement("input", { placeholder: "Email" }),
          React.createElement("textarea", { rows: 4, placeholder: "Nội dung" }),
          React.createElement(
            "button",
            { className: "btn-gold", type: "button" },
            "Gửi",
          ),
        ),
      ),
    ),
    React.createElement(
      "section",
      { className: "panel reveal contact-map" },
      React.createElement("h3", null, "Bản đồ"),
      React.createElement(
        "div",
        { className: "map-wrap" },
        React.createElement("iframe", {
          title: "Ember BBQ map",
          src: "https://www.google.com/maps?q=12%20Nguyen%20Hue%20District%201%20HCMC&output=embed",
          loading: "lazy",
          referrerPolicy: "no-referrer-when-downgrade",
        }),
      ),
    ),
  );
}
