import React, { useEffect, useState } from "https://esm.sh/react@18.2.0";
import {
  useLocation,
  useNavigate,
} from "https://esm.sh/react-router-dom@6.28.0?deps=react@18.2.0,react-dom@18.2.0";
import { useAuth } from "../context/AuthContext.js";

export function LoginPage() {
  const {
    authBusy,
    authSettings,
    demoUser,
    isSupabaseConfigured,
    loading,
    login,
    signInWithGoogle,
    user,
  } = useAuth();
  const [form, setForm] = useState(() => ({
    displayName: "",
    email: "",
    username: isSupabaseConfigured ? "" : "khachhang",
    password: isSupabaseConfigured ? "" : "123456",
  }));
  const [mode, setMode] = useState("login");
  const [feedback, setFeedback] = useState({
    type: "",
    text: "",
  });
  const navigate = useNavigate();
  const location = useLocation();
  const signupEnabled = !isSupabaseConfigured || !authSettings.disableSignup;
  const showEmailAuth = !isSupabaseConfigured || authSettings.emailEnabled;
  const showGoogleAuth = isSupabaseConfigured;
  const googleEnabled = isSupabaseConfigured && authSettings.googleEnabled;
  const isWorking = loading || authBusy;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const wantsSignup = params.get("mode") === "signup";
    const nextMode = wantsSignup && signupEnabled ? "signup" : "login";
    setMode(nextMode);
    setFeedback({ type: "", text: "" });
  }, [location.search, signupEnabled]);

  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, navigate, user]);

  const switchMode = (nextMode) => {
    const resolvedMode = nextMode === "signup" && signupEnabled ? "signup" : "login";
    setMode(resolvedMode);
    setFeedback({ type: "", text: "" });
    navigate(`/dang-nhap?mode=${resolvedMode}`, { replace: true });
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const result = await login({ ...form, mode });

    if (!result.ok) {
      setFeedback({ type: "error", text: result.message });
      return;
    }

    if (result.requiresEmailConfirmation) {
      setFeedback({ type: "success", text: result.message });
      setForm((prev) => ({ ...prev, password: "" }));
      return;
    }

    setFeedback({ type: "", text: "" });
    navigate("/dashboard");
  };

  const onGoogleClick = async () => {
    const result = await signInWithGoogle();

    if (!result.ok) {
      setFeedback({ type: "error", text: result.message });
      return;
    }

    setFeedback({
      type: "success",
      text: "Đang chuyển đến Google để xác thực tài khoản.",
    });
  };

  const heading = mode === "signup" ? "Đăng ký tài khoản" : "Đăng nhập";
  const introText = isSupabaseConfigured
    ? mode === "signup"
      ? "Tạo tài khoản bằng Google để app tự lưu lịch sử đặt bàn trên Supabase."
      : "Đăng nhập bằng Google để dùng lại đúng tài khoản và lịch sử đặt bàn đã lưu."
    : "Đăng nhập mock để vào dashboard và xem lịch sử đặt bàn.";
  const helperText = isSupabaseConfigured
    ? googleEnabled
      ? "Bạn sẽ được chuyển sang Google để xác thực, app không nhận hay lưu mật khẩu Google."
      : "Cần bật Google provider trong Supabase Auth để dùng nút Google."
    : `Tài khoản demo: ${demoUser.username} | Mật khẩu: ${demoUser.password}`;
  const submitLabel = isSupabaseConfigured
    ? mode === "signup"
      ? "Tạo tài khoản bằng email"
      : "Đăng nhập bằng email"
    : "Đăng nhập";

  return React.createElement(
    "div",
    { className: "container section center-wrap" },
    React.createElement(
      "section",
      { className: "panel login-card" },
      React.createElement("h1", null, heading),
      React.createElement("p", null, introText),
      React.createElement("p", { className: "muted" }, helperText),
      isSupabaseConfigured
        ? React.createElement(
            "div",
            { className: "auth-mode-toggle" },
            React.createElement(
              "button",
              {
                type: "button",
                className: mode === "login" ? "btn-gold" : "btn-outline",
                onClick: () => switchMode("login"),
              },
              "Đăng nhập",
            ),
            signupEnabled
              ? React.createElement(
                  "button",
                  {
                    type: "button",
                    className: mode === "signup" ? "btn-gold" : "btn-outline",
                    onClick: () => switchMode("signup"),
                  },
                  "Đăng ký",
                )
              : null,
          )
        : null,
      feedback.text
        ? React.createElement(
            "p",
            {
              className:
                feedback.type === "success" ? "success-msg" : "error-msg",
            },
            feedback.text,
          )
        : null,
      showEmailAuth
        ? React.createElement(
            "form",
            { className: "comment-form", onSubmit },
            isSupabaseConfigured && mode === "signup"
              ? React.createElement("input", {
                  placeholder: "Tên hiển thị",
                  value: form.displayName,
                  onChange: (e) =>
                    setForm((prev) => ({
                      ...prev,
                      displayName: e.target.value,
                    })),
                })
              : null,
            isSupabaseConfigured
              ? React.createElement(
                  React.Fragment,
                  null,
                  React.createElement("input", {
                    required: true,
                    type: "email",
                    placeholder: "Email",
                    value: form.email,
                    onChange: (e) =>
                      setForm((prev) => ({ ...prev, email: e.target.value })),
                  }),
                  React.createElement("input", {
                    required: true,
                    type: "password",
                    placeholder: "Mật khẩu",
                    value: form.password,
                    onChange: (e) =>
                      setForm((prev) => ({ ...prev, password: e.target.value })),
                  }),
                )
              : React.createElement(
                  React.Fragment,
                  null,
                  React.createElement("input", {
                    placeholder: "Tên hiển thị",
                    value: form.displayName,
                    onChange: (e) =>
                      setForm((prev) => ({
                        ...prev,
                        displayName: e.target.value,
                      })),
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
                ),
            React.createElement(
              "button",
              { className: "btn-gold", type: "submit", disabled: isWorking },
              isWorking ? "Đang xử lý..." : submitLabel,
            ),
          )
        : React.createElement(
            "p",
            { className: "error-msg" },
            "Project Supabase hiện không bật đăng nhập bằng email, nên trang này chưa thể đăng nhập trực tiếp.",
          ),
      showGoogleAuth
        ? React.createElement(
            React.Fragment,
            null,
            showEmailAuth
              ? React.createElement(
                  "div",
                  { className: "auth-divider" },
                  React.createElement("span", null, "hoặc dùng Google"),
                )
              : null,
            React.createElement(
              "button",
              {
                className: "google-auth-btn",
                type: "button",
                onClick: onGoogleClick,
                disabled: isWorking,
              },
              React.createElement("span", { className: "google-mark" }, "G"),
              React.createElement(
                "span",
                null,
                isWorking
                  ? "Đang xử lý..."
                  : mode === "signup"
                    ? "Đăng ký với Google"
                    : "Tiếp tục với Google",
              ),
            ),
          )
        : null,
    ),
  );
}
