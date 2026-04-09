import React from "https://esm.sh/react@18.2.0";
import {
  Link,
  NavLink,
} from "https://esm.sh/react-router-dom@6.28.0?deps=react@18.2.0,react-dom@18.2.0";
import { useAuth } from "../context/AuthContext.js";

export function Navbar() {
  const { user, logout } = useAuth();

  const navItemClass = ({ isActive }) =>
    isActive ? "nav-link active" : "nav-link";

  return React.createElement(
    "header",
    { className: "topbar" },
    React.createElement(
      "div",
      { className: "container nav-wrap" },
      React.createElement(Link, { to: "/", className: "brand" }, "EMBER BBQ"),
      React.createElement(
        "nav",
        { className: "main-nav" },
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
      React.createElement(
        "div",
        { className: "auth-area" },
        user
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(
                Link,
                { to: "/dashboard", className: "ghost-link" },
                user.name,
              ),
              React.createElement(
                "button",
                { className: "ghost-btn", onClick: logout },
                "Đăng xuất",
              ),
            )
          : React.createElement(
              Link,
              { to: "/dang-nhap", className: "ghost-link" },
              "Đăng nhập",
            ),
      ),
    ),
  );
}
