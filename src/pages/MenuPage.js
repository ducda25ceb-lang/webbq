import React, { useMemo, useState } from "https://esm.sh/react@18.2.0";
import {
  categories,
  featuredDishes,
  drinkSpecials,
  popularDishIds,
} from "../data/mockData.js";
import { useScrollReveal } from "../components/ScrollReveal.js";

const quickTags = [
  { key: "all", label: "Tất cả" },
  { key: "popular", label: "Bán chạy" },
  { key: "premium", label: "Premium" },
  { key: "group", label: "Đi nhóm" },
];

export function MenuPage() {
  useScrollReveal();
  const [active, setActive] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [quickTag, setQuickTag] = useState("all");
  const [comments, setComments] = useState([
    {
      id: 1,
      name: "Gia Bảo",
      text: "Sốt ướp đậm vị, thịt mềm và phục vụ rất tốt.",
    },
    {
      id: 2,
      name: "Thảo Nhi",
      text: "Không gian đẹp, nên đi buổi tối để chill hơn.",
    },
  ]);
  const [form, setForm] = useState({ name: "", text: "" });

  const items = useMemo(() => {
    let result =
      active === "all"
        ? featuredDishes
        : featuredDishes.filter((d) => d.category === active);

    if (searchText.trim()) {
      const keyword = searchText.trim().toLowerCase();
      result = result.filter((d) => d.name.toLowerCase().includes(keyword));
    }

    if (quickTag === "popular") {
      result = result.filter((d) => popularDishIds.includes(d.id));
    }

    if (quickTag === "premium") {
      result = result.filter((d) => d.price >= 500000);
    }

    if (quickTag === "group") {
      result = result.filter(
        (d) => d.category === "combo" || d.price >= 800000,
      );
    }

    return result;
  }, [active, quickTag, searchText]);

  const hotItems = useMemo(
    () =>
      featuredDishes.filter((d) => popularDishIds.includes(d.id)).slice(0, 4),
    [],
  );

  const submitComment = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.text.trim()) return;
    setComments((prev) => [
      { id: Date.now(), name: form.name.trim(), text: form.text.trim() },
      ...prev,
    ]);
    setForm({ name: "", text: "" });
  };

  return React.createElement(
    "div",
    { className: "container section" },
    React.createElement("h1", { className: "reveal" }, "Thực Đơn BBQ"),
    React.createElement(
      "div",
      { className: "filter-row reveal" },
      categories.map((cat) =>
        React.createElement(
          "button",
          {
            key: cat.key,
            className: active === cat.key ? "chip active" : "chip",
            onClick: () => setActive(cat.key),
          },
          cat.label,
        ),
      ),
    ),
    React.createElement(
      "section",
      { className: "menu-tools reveal" },
      React.createElement("input", {
        className: "menu-search",
        placeholder: "Tìm món theo tên...",
        value: searchText,
        onChange: (e) => setSearchText(e.target.value),
      }),
      React.createElement(
        "div",
        { className: "quick-tag-row" },
        quickTags.map((tag) =>
          React.createElement(
            "button",
            {
              key: tag.key,
              type: "button",
              className: quickTag === tag.key ? "chip active" : "chip",
              onClick: () => setQuickTag(tag.key),
            },
            tag.label,
          ),
        ),
      ),
    ),
    React.createElement(
      "section",
      { className: "menu-hot-section reveal" },
      React.createElement("h2", null, "Món Nổi Bật Hôm Nay"),
      React.createElement(
        "div",
        { className: "hot-list" },
        hotItems.map((dish) =>
          React.createElement(
            "article",
            { key: dish.id, className: "hot-item" },
            React.createElement(
              "span",
              { className: "hot-badge" },
              "Best Seller",
            ),
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
    React.createElement(
      "section",
      { className: "drink-carousel-section reveal" },
      React.createElement(
        "div",
        { className: "section-heading" },
        React.createElement("h2", null, "Món Nước"),
        React.createElement(
          "p",
          null,
          "Dải món nước chạy tự động qua lại để khách nhìn nhanh những lựa chọn mát lạnh đi kèm BBQ.",
        ),
      ),
      React.createElement(
        "div",
        { className: "drink-carousel-viewport" },
        React.createElement(
          "div",
          { className: "drink-carousel-track" },
          [...drinkSpecials, ...drinkSpecials].map((drink, index) =>
            React.createElement(
              "article",
              { key: `${drink.id}-${index}`, className: "drink-card" },
              React.createElement("img", { src: drink.image, alt: drink.name }),
              React.createElement(
                "div",
                { className: "drink-body" },
                React.createElement("h3", null, drink.name),
                React.createElement(
                  "p",
                  null,
                  `${drink.price.toLocaleString("vi-VN")} VND`,
                ),
              ),
            ),
          ),
        ),
      ),
    ),
    React.createElement(
      "div",
      { className: "cards-grid reveal" },
      items.length
        ? items.map((dish) =>
            React.createElement(
              "article",
              { className: "dish-card", key: dish.id },
              React.createElement("img", { src: dish.image, alt: dish.name }),
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
          )
        : React.createElement(
            "p",
            { className: "empty-note" },
            "Không tìm thấy món phù hợp. Bạn thử đổi từ khóa hoặc chọn tag khác nhé.",
          ),
    ),
    React.createElement(
      "section",
      { className: "chat-box reveal" },
      React.createElement("h2", null, "Khung chat nhận xét"),
      React.createElement(
        "form",
        { className: "comment-form", onSubmit: submitComment },
        React.createElement("input", {
          value: form.name,
          placeholder: "Tên của bạn",
          onChange: (e) => setForm((p) => ({ ...p, name: e.target.value })),
        }),
        React.createElement("textarea", {
          rows: 3,
          value: form.text,
          placeholder: "Bạn cảm nhận món nào ngon nhất?",
          onChange: (e) => setForm((p) => ({ ...p, text: e.target.value })),
        }),
        React.createElement(
          "button",
          { className: "btn-gold", type: "submit" },
          "Gửi nhận xét",
        ),
      ),
      React.createElement(
        "div",
        { className: "comment-list" },
        comments.map((c) =>
          React.createElement(
            "article",
            { key: c.id, className: "comment-item" },
            React.createElement("strong", null, c.name),
            React.createElement("p", null, c.text),
          ),
        ),
      ),
    ),
  );
}
