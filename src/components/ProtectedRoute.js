import React from "https://esm.sh/react@18.2.0";
import {
  Navigate,
  useLocation,
} from "https://esm.sh/react-router-dom@6.28.0?deps=react@18.2.0,react-dom@18.2.0";
import { useAuth } from "../context/AuthContext.js";
import { isAdminUser } from "../lib/supabase.js";

export function ProtectedRoute({ adminOnly = false, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return React.createElement(
      "div",
      { className: "container section" },
      React.createElement("p", { className: "muted" }, "Đang kiểm tra đăng nhập..."),
    );
  }

  if (!user) {
    return React.createElement(Navigate, {
      to: "/dang-nhap?mode=login",
      replace: true,
      state: { from: location.pathname },
    });
  }

  if (adminOnly && !isAdminUser(user)) {
    return React.createElement(Navigate, { to: "/", replace: true });
  }

  return children;
}

