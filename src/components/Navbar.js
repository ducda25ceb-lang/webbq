import React from "https://esm.sh/react@18.2.0";
import {
  Link,
  NavLink,
  useLocation,
} from "https://esm.sh/react-router-dom@6.28.0?deps=react@18.2.0,react-dom@18.2.0";
import { useAuth } from "../context/AuthContext.js";
import { isAdminUser } from "../config/admin.js";
import { ThemeToggle } from "./ThemeToggle.js";

export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = isAdminUser(user);
  const adminTab = new URLSearchParams(location.search).get("tab") || "overview";
  const adminNavItems = [
    { to: "/admin?tab=overview", tab: "overview", label: "Tổng quan" },
    { to: "/admin?tab=bookings", tab: "bookings", label: "Đặt bàn" },
    { to: "/admin?tab=contacts", tab: "contacts", label: "Liên hệ" },
    { to: "/admin?tab=menu", tab: "menu", label: "Thực đơn" },
  ];

  const navItemClass = ({ isActive }) =>
    isActive ? "nav-link active" : "nav-link";

  return React.createElement(
    "header",
    { className: "topbar" },
    React.createElement(
      "div",
      { className: "container nav-wrap" },
      React.createElement(
        Link,
        { to: isAdmin ? "/admin" : "/", className: "brand" },
        "EMBER BBQ",
      ),
      React.createElement(
        "nav",
        { className: isAdmin ? "main-nav admin-main-nav" : "main-nav" },
        isAdmin
          ? adminNavItems.map((item) =>
              React.createElement(
                Link,
                {
                  key: item.tab,
                  to: item.to,
                  className:
                    adminTab === item.tab
                      ? "nav-link admin-nav-link active"
                      : "nav-link admin-nav-link",
                },
                item.label,
              ),
            )
          : React.createElement(
              React.Fragment,
              null,
              React.createElement(
                NavLink,
                { to: "/", className: navItemClass },
                "Trang chủ",
              ),
              React.createElement(
                NavLink,
                { to: "/thuc-don", className: navItemClass },
                "Thực đơn",
              ),
              React.createElement(
                NavLink,
                { to: "/lien-he", className: navItemClass },
                "Liên hệ",
              ),
              React.createElement(
                NavLink,
                { to: "/dat-ban", className: navItemClass },
                "Đặt bàn",
              ),
            ),
      ),
      React.createElement(
        "div",
        { className: isAdmin ? "auth-area admin-auth-area" : "auth-area" },
        React.createElement(ThemeToggle),
        user
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(
                Link,
                { to: isAdmin ? "/admin" : "/dashboard", className: "ghost-link" },
                isAdmin ? `Admin: ${user.email || user.name}` : user.name,
              ),
              React.createElement(
                "button",
                { className: "ghost-btn", onClick: logout },
                "Đăng xuất",
              ),
            )
          : React.createElement(
              React.Fragment,
              null,
              React.createElement(
                Link,
                { to: "/dang-nhap?mode=login", className: "ghost-link" },
                "Đăng nhập",
              ),
              React.createElement(
                Link,
                {
                  to: "/dang-nhap?mode=signup",
                  className: "btn-gold nav-signup-link",
                },
                "Đăng ký",
              ),
            ),
      ),
    ),
  );
}
