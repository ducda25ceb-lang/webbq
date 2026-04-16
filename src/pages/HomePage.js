import React from "https://esm.sh/react@18.2.0";
import { Link } from "https://esm.sh/react-router-dom@6.28.0?deps=react@18.2.0,react-dom@18.2.0";
import { featuredDishes, guestReviews, stats } from "../data/mockData.js";
import { useScrollReveal } from "../components/ScrollReveal.js";

const fallbackDishImage =
  "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop";

export function HomePage() {
  useScrollReveal();

  const handleImageError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = fallbackDishImage;
  };

  return React.createElement(
    "div",
    { className: "container" },
    React.createElement(
      "section",
      { className: "hero reveal" },
      React.createElement("div", { className: "hero-overlay" }),
      React.createElement(
        "div",
        { className: "hero-content" },
        React.createElement(
          "p",
          { className: "eyebrow" },
          "Fine Dining Korean BBQ",
        ),
        React.createElement(
          "h1",
          null,
          "Trải nghiệm nướng than sang trọng giữa lòng thành phố",
        ),
        React.createElement(
          "p",
          { className: "hero-sub" },
          "Không gian ấm cúng, menu premium và quy trình phục vụ chuẩn nhà hàng cao cấp.",
        ),
        React.createElement(
          "div",
          { className: "hero-actions" },
          React.createElement(
            Link,
            { className: "btn-gold", to: "/dat-ban" },
            "Đặt bàn ngay",
          ),
          React.createElement(
            Link,
            { className: "btn-outline", to: "/video" },
            "Xem video chế biến",
          ),
        ),
      ),
    ),
    React.createElement(
      "section",
      { className: "stats reveal" },
      stats.map((s) =>
        React.createElement(
          "article",
          { key: s.label, className: "stat-card" },
          React.createElement("h3", null, s.value),
          React.createElement("p", null, s.label),
        ),
      ),
    ),
    React.createElement(
      "section",
      { className: "story-section reveal" },
      React.createElement(
        "div",
        { className: "story-image-wrap" },
        React.createElement("img", {
          src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1800&auto=format&fit=crop",
          alt: "Không gian nhà hàng Ember BBQ",
          onError: handleImageError,
        }),
      ),
      React.createElement(
        "article",
        { className: "story-content" },
        React.createElement("h2", null, "Câu Chuyện Ember"),
        React.createElement(
          "p",
          null,
          "Ember BBQ ra đời từ đam mê với lửa và thịt. Chúng tôi tin rằng nghệ thuật nướng không chỉ là nấu chín mà là sự kết hợp hài hòa giữa nhiệt độ, thời gian và nguyên liệu thượng hạng.",
        ),
        React.createElement(
          "p",
          null,
          "Mỗi miếng thịt tại Ember đều được tuyển chọn kỹ lưỡng từ các trang trại uy tín, nướng trên than binchotan Nhật Bản và phục vụ với tâm huyết của những nghệ nhân BBQ hàng đầu.",
        ),
      ),
    ),
    React.createElement(
      "section",
      { className: "home-video-section panel reveal" },
      React.createElement("h2", null, "Video Không Gian Thực Tế"),
      React.createElement(
        "p",
        { className: "home-video-sub" },
        "Video quay màn hình được phát tự động không âm thanh để khách xem nhanh trải nghiệm tại nhà hàng.",
      ),
      React.createElement(
        "div",
        { className: "home-video-wrap" },
        React.createElement(
          "div",
          { className: "home-video-placeholder" },
          "Nếu chưa thấy video, hãy chép file vào assets/videos/home-screen.mp4",
        ),
        React.createElement(
          "video",
          {
            className: "home-video",
            src: "./assets/videos/home-screen.mp4",
            autoPlay: true,
            muted: true,
            loop: true,
            playsInline: true,
            controls: true,
            preload: "metadata",
          },
          "Trình duyệt của bạn không hỗ trợ phát video.",
        ),
      ),
    ),
    React.createElement(
      "section",
      { className: "section reveal" },
      React.createElement("h2", null, "Món nổi bật"),
      React.createElement(
        "div",
        { className: "cards-grid" },
        featuredDishes.slice(0, 3).map((dish) =>
          React.createElement(
            "article",
            { className: "dish-card", key: dish.id },
            React.createElement("img", {
              src: dish.image,
              alt: dish.name,
              loading: "lazy",
              onError: handleImageError,
            }),
            React.createElement(
              "div",
              { className: "dish-body" },
              React.createElement("h3", null, dish.name),
              React.createElement(
                "p",
                null,
                `${dish.price.toLocaleString("vi-VN")} VND`,
              ),
            ),
          ),
        ),
      ),
    ),
    React.createElement(
      "section",
      { className: "review-section reveal" },
      React.createElement(
        "article",
        { className: "review-summary" },
        React.createElement(
          "p",
          { className: "review-caption" },
          "Khách hàng đánh giá",
        ),
        React.createElement("h2", null, "4.9/5"),
        React.createElement(
          "p",
          null,
          "Dựa trên hơn 1.200 lượt đánh giá thực tế",
        ),
      ),
      React.createElement(
        "div",
        { className: "review-grid" },
        guestReviews.map((review) =>
          React.createElement(
            "article",
            { key: review.id, className: "review-card" },
            React.createElement(
              "p",
              { className: "review-star" },
              "★".repeat(review.rating),
            ),
            React.createElement("p", { className: "review-text" }, review.text),
            React.createElement("strong", null, review.name),
          ),
        ),
      ),
    ),
    React.createElement(
      "section",
      { className: "cta-section reveal" },
      React.createElement("div", { className: "cta-icon" }, "🔥"),
      React.createElement("h2", null, "Sẵn sàng trải nghiệm?"),
      React.createElement(
        "p",
        null,
        "Đặt bàn ngay hôm nay để tận hưởng nghệ thuật BBQ đỉnh cao",
      ),
      React.createElement(
        Link,
        { className: "btn-gold cta-btn", to: "/dat-ban" },
        "Đặt bàn ngay",
        React.createElement("span", null, " →"),
      ),
    ),
  );
}
