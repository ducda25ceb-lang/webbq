import React from "https://esm.sh/react@18.2.0";
import { useScrollReveal } from "../components/ScrollReveal.js";

export function VideoPage() {
  useScrollReveal();

  return React.createElement(
    "div",
    { className: "container section" },
    React.createElement("h1", { className: "reveal" }, "Video Chế Biến"),
    React.createElement(
      "div",
      { className: "panel reveal" },
      React.createElement(
        "div",
        { className: "video-wrap" },
        React.createElement("iframe", {
          src: "https://www.youtube.com/embed/a4xS6xqVhJY",
          title: "BBQ cooking",
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          allowFullScreen: true,
        }),
      ),
    ),
  );
}
