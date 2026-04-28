import React from "https://esm.sh/react@18.2.0";
import {
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "https://esm.sh/react-router-dom@6.28.0?deps=react@18.2.0,react-dom@18.2.0";
import { Navbar } from "./components/Navbar.js";
import { Footer } from "./components/Footer.js";
import { HomePage } from "./pages/HomePage.js";
import { MenuPage } from "./pages/MenuPage.js";
import { ContactPage } from "./pages/ContactPage.js";
import { BookingPage } from "./pages/BookingPage.js";
import { VideoPage } from "./pages/VideoPage.js";
import { LoginPage } from "./pages/LoginPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { AdminPage } from "./pages/AdminPage.js";
import { ProtectedRoute } from "./components/ProtectedRoute.js";
import { useAuth } from "./context/AuthContext.js";
import { consumePostLoginRedirect } from "./lib/supabase.js";

function PostLoginRedirect() {
  const { loading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (loading || !user) {
      return;
    }

    const targetPath = consumePostLoginRedirect(user);

    if (targetPath && targetPath !== location.pathname) {
      navigate(targetPath, { replace: true });
    }
  }, [loading, location.pathname, navigate, user]);

  return null;
}

export function App() {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(PostLoginRedirect),
    React.createElement(Navbar),
    React.createElement(
      "main",
      { className: "page-shell" },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, {
          path: "/",
          element: React.createElement(HomePage),
        }),
        React.createElement(Route, {
          path: "/thuc-don",
          element: React.createElement(MenuPage),
        }),
        React.createElement(Route, {
          path: "/lien-he",
          element: React.createElement(ContactPage),
        }),
        React.createElement(Route, {
          path: "/dat-ban",
          element: React.createElement(BookingPage),
        }),
        React.createElement(Route, {
          path: "/video",
          element: React.createElement(VideoPage),
        }),
        React.createElement(Route, {
          path: "/dang-nhap",
          element: React.createElement(LoginPage),
        }),
        React.createElement(Route, {
          path: "/dashboard",
          element: React.createElement(
            ProtectedRoute,
            null,
            React.createElement(DashboardPage),
          ),
        }),
        React.createElement(Route, {
          path: "/admin",
          element: React.createElement(
            ProtectedRoute,
            { adminOnly: true },
            React.createElement(AdminPage),
          ),
        }),
      ),
    ),
    React.createElement(Footer),
  );
}

