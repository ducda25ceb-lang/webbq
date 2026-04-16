import React from "https://esm.sh/react@18.2.0";
import { businessInfo } from "../data/mockData.js";
import { isSupabaseConfigured, supabase } from "../lib/supabase.js";

export function Footer() {
  const [subscribeEmail, setSubscribeEmail] = React.useState("");
  const [subscribeMsg, setSubscribeMsg] = React.useState({
    type: "",
    text: "",
  });
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    const email = subscribeEmail.trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isValidEmail) {
      setSubscribeMsg({ type: "error", text: "Vui lòng nhập email hợp lệ." });
      return;
    }

    if (!isSupabaseConfigured) {
      const subject = encodeURIComponent("Đăng ký nhận ưu đãi từ EMBER BBQ");
      const body = encodeURIComponent(
        `Xin chào EMBER BBQ, tôi muốn đăng ký nhận ưu đãi bằng email: ${email}`,
      );
      window.location.href = `mailto:${businessInfo.email}?subject=${subject}&body=${body}`;
      setSubscribeMsg({
        type: "success",
        text: "Chưa cấu hình database. Đã mở ứng dụng email để bạn gửi đăng ký.",
      });
      setSubscribeEmail("");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("contact_requests").insert({
        name: "Newsletter subscriber",
        email,
        message: "Đăng ký nhận ưu đãi từ footer",
      });

      if (error) {
        setSubscribeMsg({
          type: "error",
          text: "Không thể đăng ký lúc này. Vui lòng thử lại sau.",
        });
        return;
      }

      setSubscribeMsg({
        type: "success",
        text: "Đăng ký thành công. Bạn sẽ sớm nhận thông tin ưu đãi.",
      });
      setSubscribeEmail("");
    } catch {
      setSubscribeMsg({
        type: "error",
        text: "Không thể kết nối database lúc này. Vui lòng thử lại sau.",
      });
    } finally {
      setSubmitting(false);
    }
  };

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
        React.createElement("p", null, businessInfo.address),
        React.createElement(
          "p",
          { className: "footer-social-row" },
          React.createElement(
            "a",
            {
              href: businessInfo.socials?.tiktok || "https://www.tiktok.com/",
              target: "_blank",
              rel: "noreferrer",
            },
            "TikTok",
          ),
          " | ",
          React.createElement(
            "a",
            {
              href:
                businessInfo.socials?.facebook || "https://www.facebook.com/",
              target: "_blank",
              rel: "noreferrer",
            },
            "Facebook",
          ),
          " | ",
          React.createElement(
            "a",
            {
              href:
                businessInfo.socials?.instagram || "https://www.instagram.com/",
              target: "_blank",
              rel: "noreferrer",
            },
            "Instagram",
          ),
        ),
        React.createElement("p", null, `Hotline: ${businessInfo.hotline}`),
        React.createElement("p", null, `Email: ${businessInfo.email}`),
      ),
      React.createElement(
        "div",
        null,
        React.createElement("h4", null, "Giờ mở cửa"),
        React.createElement("p", null, "11:00 - 14:00 | 17:00 - 23:00"),
        React.createElement(
          "h4",
          { className: "footer-subscribe-title" },
          "Đăng ký qua Email",
        ),
        React.createElement(
          "form",
          { className: "footer-subscribe-form", onSubmit: handleSubscribe },
          React.createElement("input", {
            type: "email",
            placeholder: "Nhập email của bạn",
            value: subscribeEmail,
            onChange: (e) => setSubscribeEmail(e.target.value),
            required: true,
            "aria-label": "Email đăng ký",
          }),
          React.createElement(
            "button",
            {
              className: "btn-gold",
              type: "submit",
              disabled: submitting,
            },
            submitting ? "Đang xử lý..." : "Đăng ký",
          ),
        ),
        subscribeMsg.text
          ? React.createElement(
              "p",
              {
                className: `footer-subscribe-msg ${subscribeMsg.type === "error" ? "is-error" : "is-success"}`,
              },
              subscribeMsg.text,
            )
          : null,
      ),
    ),
  );
}
