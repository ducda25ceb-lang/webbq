import React from "https://esm.sh/react@18.2.0";
import { useScrollReveal } from "../components/ScrollReveal.js";
import { useDevicePreferences } from "../components/useDevicePreferences.js";

export function VideoPage() {
  useScrollReveal();
  const { isMobile, prefersReducedMotion, saveData } = useDevicePreferences();
  const shouldAutoplayVideo =
    !isMobile && !prefersReducedMotion && !saveData;
  const shouldLoopVideo = !isMobile && !prefersReducedMotion;

  return React.createElement(
    "div",
    { className: "container section" },
    React.createElement("h1", { className: "reveal" }, "Video Chế Biến"),
    React.createElement(
      "div",
      { className: "panel reveal" },
      React.createElement(
        "p",
        { className: "muted" },
        shouldAutoplayVideo
          ? "Video chế biến bò được phát trực tiếp từ file local để tránh lỗi nhúng YouTube."
          : "Trên mobile hoặc chế độ tiết kiệm dữ liệu, video sẽ chờ bạn bấm phát để giảm giật và tải nhanh hơn.",
      ),
      React.createElement(
        "div",
        { className: "video-wrap" },
        React.createElement(
          "video",
          {
            src: "./assets/videos/home-screen.mp4",
            controls: true,
            autoPlay: shouldAutoplayVideo,
            muted: true,
            loop: shouldLoopVideo,
            playsInline: true,
            preload: shouldAutoplayVideo ? "metadata" : "none",
          },
          "Trình duyệt của bạn không hỗ trợ phát video.",
        ),
      ),
      React.createElement(
        "p",
        { className: "muted" },
        "Nếu bạn muốn đổi đúng video chế biến bò riêng, chỉ cần chép file mới vào assets/videos và cập nhật đường dẫn trong trang này.",
      ),
    ),
  );
}
