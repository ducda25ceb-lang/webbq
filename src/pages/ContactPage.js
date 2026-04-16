import React from "https://esm.sh/react@18.2.0";
import { businessInfo } from "../data/mockData.js";
import { useScrollReveal } from "../components/ScrollReveal.js";
import { isSupabaseConfigured, supabase } from "../lib/supabase.js";

export function ContactPage() {
  useScrollReveal();
  const [form, setForm] = React.useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");
  const [successMsg, setSuccessMsg] = React.useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim();
    const message = form.message.trim();

    if (!name || !email || !message) {
      setErrorMsg("Bạn cần nhập đầy đủ tên, email và nội dung.");
      setSuccessMsg("");
      return;
    }

    if (!isSupabaseConfigured) {
      setErrorMsg("");
      setSuccessMsg("Đã ghi nhận yêu cầu (chế độ mock, chưa lưu database).");
      setForm({ name: "", email: "", message: "" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("contact_requests").insert({
        name,
        email,
        message,
      });

      if (error) {
        setErrorMsg("Không thể gửi yêu cầu lúc này. Vui lòng thử lại sau.");
        setSuccessMsg("");
        return;
      }

      setErrorMsg("");
      setSuccessMsg("Đã gửi yêu cầu thành công. Nhà hàng sẽ liên hệ sớm.");
      setForm({ name: "", email: "", message: "" });
    } catch {
      setErrorMsg("Không thể kết nối database lúc này. Vui lòng thử lại sau.");
      setSuccessMsg("");
    } finally {
      setSubmitting(false);
    }
  };

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
        isSupabaseConfigured
          ? React.createElement(
              "p",
              { className: "muted" },
              "Form này sẽ lưu vào bảng contact_requests trong Supabase.",
            )
          : null,
        React.createElement(
          "form",
          { className: "comment-form", onSubmit: handleSubmit },
          React.createElement("input", {
            required: true,
            placeholder: "Tên của bạn",
            value: form.name,
            onChange: (e) =>
              setForm((prev) => ({ ...prev, name: e.target.value })),
          }),
          React.createElement("input", {
            required: true,
            type: "email",
            placeholder: "Email",
            value: form.email,
            onChange: (e) =>
              setForm((prev) => ({ ...prev, email: e.target.value })),
          }),
          React.createElement("textarea", {
            required: true,
            rows: 4,
            placeholder: "Nội dung",
            value: form.message,
            onChange: (e) =>
              setForm((prev) => ({ ...prev, message: e.target.value })),
          }),
          errorMsg
            ? React.createElement("p", { className: "error-msg" }, errorMsg)
            : null,
          successMsg
            ? React.createElement("p", { className: "success-msg" }, successMsg)
            : null,
          React.createElement(
            "button",
            { className: "btn-gold", type: "submit", disabled: submitting },
            submitting ? "Đang gửi..." : "Gửi",
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
          src: "https://www.google.com/maps?q=Lotte%20Mart%20Da%20Nang&output=embed",
          loading: "lazy",
          referrerPolicy: "no-referrer-when-downgrade",
        }),
      ),
    ),
  );
}
