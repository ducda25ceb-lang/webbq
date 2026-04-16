import React, { useMemo, useState } from "https://esm.sh/react@18.2.0";
import {
  categories,
  featuredDishes,
  drinkSpecials,
  popularDishIds,
} from "../data/mockData.js";
import { useScrollReveal } from "../components/ScrollReveal.js";
import { isSupabaseConfigured, supabase } from "../lib/supabase.js";

const quickTags = [
  { key: "all", label: "Tất cả" },
  { key: "popular", label: "Bán chạy" },
  { key: "premium", label: "Premium" },
  { key: "group", label: "Đi nhóm" },
];

const fallbackDishImage =
  "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop";

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
  const [commentError, setCommentError] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);

  React.useEffect(() => {
    let activeRequest = true;

    async function loadComments() {
      if (!isSupabaseConfigured) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from("menu_comments")
          .select("id, name, comment_text, created_at")
          .order("created_at", { ascending: false })
          .limit(30);

        if (!activeRequest) {
          return;
        }

        if (error) {
          setCommentError("Không thể tải nhận xét từ database.");
          return;
        }

        setCommentError("");
        setComments(
          (data || []).map((row) => ({
            id: row.id,
            name: row.name,
            text: row.comment_text,
          })),
        );
      } catch {
        if (!activeRequest) {
          return;
        }

        setCommentError("Không thể kết nối database để tải nhận xét.");
      }
    }

    loadComments();

    return () => {
      activeRequest = false;
    };
  }, []);

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

  const carouselItems = useMemo(() => [...drinkSpecials, ...drinkSpecials], []);

  const submitComment = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const text = form.text.trim();

    if (!name || !text) {
      setCommentError("Bạn cần nhập tên và nội dung nhận xét.");
      return;
    }

    if (isSupabaseConfigured) {
      setCommentSaving(true);
      try {
        const { data, error } = await supabase
          .from("menu_comments")
          .insert({
            name,
            comment_text: text,
          })
          .select("id, name, comment_text")
          .single();

        if (error) {
          setCommentError("Không thể gửi nhận xét. Vui lòng thử lại.");
          return;
        }

        setComments((prev) => [
          { id: data.id, name: data.name, text: data.comment_text },
          ...prev,
        ]);
        setCommentError("");
        setForm({ name: "", text: "" });
        return;
      } catch {
        setCommentError("Không thể kết nối database để gửi nhận xét.");
        return;
      } finally {
        setCommentSaving(false);
      }
    }

    setComments((prev) => [
      { id: Date.now(), name, text },
      ...prev,
    ]);
    setCommentError("");
    setForm({ name: "", text: "" });
  };

  const handleImageError = (e) => {
    // Prevent infinite loop if fallback image also fails.
    e.currentTarget.onerror = null;
    e.currentTarget.src = fallbackDishImage;
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
          carouselItems.map((drink, index) =>
            React.createElement(
              "article",
              {
                key: `${drink.id}-${index}`,
                className: "drink-card",
                "aria-hidden":
                  index >= drinkSpecials.length ? "true" : undefined,
              },
              React.createElement("img", {
                src: drink.image,
                alt: drink.name,
                loading: "lazy",
                onError: handleImageError,
              }),
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
      isSupabaseConfigured
        ? React.createElement(
            "p",
            { className: "muted" },
            "Nhận xét sẽ được lưu vào Supabase để hiển thị cho các lượt truy cập sau.",
          )
        : null,
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
          {
            className: "btn-gold",
            type: "submit",
            disabled: commentSaving,
          },
          commentSaving ? "Đang gửi..." : "Gửi nhận xét",
        ),
      ),
      commentError
        ? React.createElement("p", { className: "error-msg" }, commentError)
        : null,
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
