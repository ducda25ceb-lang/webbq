import React from "https://esm.sh/react@18.2.0";
import { Navigate } from "https://esm.sh/react-router-dom@6.28.0?deps=react@18.2.0,react-dom@18.2.0";
import { useAuth } from "../context/AuthContext.js";

export function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    return React.createElement(Navigate, { to: "/dang-nhap", replace: true });
  }
  return children;
}

