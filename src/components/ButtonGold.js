import React from "https://esm.sh/react@18.2.0";

export function ButtonGold({
  children,
  type = "button",
  onClick,
  className = "",
  disabled = false,
}) {
  return React.createElement(
    "button",
    {
      type,
      onClick,
      disabled,
      className: `btn-gold ${className}`.trim(),
    },
    children,
  );
}

