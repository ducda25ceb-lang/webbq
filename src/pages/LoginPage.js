import React, { useState } from "https://esm.sh/react@18.2.0";
import { useNavigate } from "https://esm.sh/react-router-dom@6.28.0?deps=react@18.2.0,react-dom@18.2.0";
import { useAuth } from "../context/AuthContext.js";

export function LoginPage() {
  const [form, setForm] = useState({
    displayName: "",
    username: "khachhang",
    password: "123456",
  });
  const [error, setError] = useState("");
  const { login, demoUser } = useAuth();
  const navigate = useNavigate();

  const onSubmit = (e) => {
    e.preventDefault();
    const result = login(form);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError("");
    navigate("/dashboard");
  };

  return React.createElement(
    "div",
    { className: "container section center-wrap" },
    React.createElement(
      "section",
      { className: "panel login-card" },
      React.createElement("h1", null, "Đăng nhập"),
      React.createElement(
        "p",
        null,
        "Đăng nhập mock để vào dashboard và xem lịch sử đặt bàn.",
      ),
      React.createElement(
        "p",
        { className: "muted" },
        `Tài khoản demo: ${demoUser.username} | Mật khẩu: ${demoUser.password}`,
      ),
      React.createElement(
        "form",
        { className: "comment-form", onSubmit },
        React.createElement("input", {
          placeholder: "Tên hiển thị",
          value: form.displayName,
          onChange: (e) =>
            setForm((prev) => ({ ...prev, displayName: e.target.value })),
        }),
        React.createElement("input", {
          required: true,
          placeholder: "Tài khoản",
          value: form.username,
          onChange: (e) =>
            setForm((prev) => ({ ...prev, username: e.target.value })),
        }),
        React.createElement("input", {
          required: true,
          type: "password",
          placeholder: "Mật khẩu",
          value: form.password,
          onChange: (e) =>
            setForm((prev) => ({ ...prev, password: e.target.value })),
        }),
        error
          ? React.createElement("p", { className: "error-msg" }, error)
          : null,
        React.createElement(
          "button",
          { className: "btn-gold", type: "submit" },
          "Đăng nhập",
        ),
      ),
    ),
  );
}
