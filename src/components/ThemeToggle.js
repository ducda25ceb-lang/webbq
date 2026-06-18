import React from "https://esm.sh/react@18.2.0";
import { getCurrentTheme, toggleTheme } from "../lib/theme.js";

function SunIcon() {
  return React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
    },
    React.createElement("circle", { cx: "12", cy: "12", r: "4.2" }),
    React.createElement("path", {
      d: "M12 2.4v2.4M12 19.2v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.4 12h2.4M19.2 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7",
    }),
  );
}

function MoonIcon() {
  return React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
    },
    React.createElement("path", {
      d: "M20.2 14.8a8.2 8.2 0 0 1-11-11 8.4 8.4 0 1 0 11 11Z",
    }),
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = React.useState(getCurrentTheme);

  const handleToggle = () => {
    setTheme(toggleTheme());
  };

  const isLight = theme === "light";

  return React.createElement(
    "button",
    {
      type: "button",
      className: "theme-toggle",
      onClick: handleToggle,
      "aria-label": isLight ? "Chuyển sang chế độ tối" : "Chuyển sang chế độ sáng",
      title: isLight ? "Chế độ tối" : "Chế độ sáng",
    },
    isLight ? React.createElement(MoonIcon) : React.createElement(SunIcon),
  );
}