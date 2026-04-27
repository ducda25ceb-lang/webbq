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

const INITIAL_VISIBLE_ITEMS = 8;
const COMMENT_PAGE_SIZE = 4;
const MAX_RATING = 5;
const DEFAULT_RATING = 5;

const formatPrice = (price) => `${price} VND`;

const normalizeText = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

const normalizeRating = (value) => {
  const rating = Number(value);
  if (!Number.isFinite(rating)) {
    return DEFAULT_RATING;
  }

  return Math.min(MAX_RATING, Math.max(1, Math.round(rating)));
};

const formatRatingStars = (rating) => {
  const safeRating = normalizeRating(rating);
  return `${"★".repeat(safeRating)}${"☆".repeat(MAX_RATING - safeRating)}`;
};

const mapCommentRow = (row, fallbackRating = DEFAULT_RATING) => ({
  id: row.id,
  name: row.name,
  text: row.comment_text,
  rating: normalizeRating(row.rating ?? fallbackRating),
});

export function MenuPage() {
  useScrollReveal();
  const [active, setActive] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [quickTag, setQuickTag] = useState("all");
  const [showAllItems, setShowAllItems] = useState(false);
  const [comments, setComments] = useState([
    {
      id: 1,
      name: "Gia Bảo",
      text: "Sốt ướp đậm vị, thịt mềm và phục vụ rất tốt.",
      rating: 5,
    },
    {
      id: 2,
      name: "Thảo Nhi",
      text: "Không gian đẹp, nên đi buổi tối để chill hơn.",
      rating: 4,
    },
  ]);
  const [commentPage, setCommentPage] = useState(1);
  const [form, setForm] = useState({
    name: "",
    text: "",
    rating: DEFAULT_RATING,
  });
  const [commentError, setCommentError] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);

  const categoryLabel = useMemo(
    () =>
      categories.reduce((acc, cat) => {
        acc[cat.key] = cat.label;
        return acc;
      }, {}),
    [],
  );

  React.useEffect(() => {
    let activeRequest = true;

    async function loadComments() {
      if (!isSupabaseConfigured) {
        return;
      }

      try {
        let { data, error } = await supabase
          .from("menu_comments")
          .select("id, name, comment_text, rating, created_at")
          .order("created_at", { ascending: false })
          .limit(30);

        if (error && error.message?.toLowerCase().includes("rating")) {
          const fallbackResult = await supabase
            .from("menu_comments")
            .select("id, name, comment_text, created_at")
            .order("created_at", { ascending: false })
            .limit(30);
          data = fallbackResult.data;
          error = fallbackResult.error;
        }

        if (!activeRequest) {
          return;
        }

        if (error) {
          setCommentError("Không thể tải nhận xét từ database.");
          return;
        }

        setCommentError("");
        setComments((data || []).map((row) => mapCommentRow(row)));
        setCommentPage(1);
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
      const keyword = normalizeText(searchText.trim());
      result = result.filter((d) =>
        normalizeText(`${d.name} ${categoryLabel[d.category]}`).includes(
          keyword,
        ),
      );
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
  }, [active, categoryLabel, quickTag, searchText]);

  React.useEffect(() => {
    setShowAllItems(false);
  }, [active, quickTag, searchText]);

  const activeFilterText = useMemo(() => {
    const filters = [];

    if (active !== "all") {
      filters.push(categoryLabel[active]);
    }

    if (quickTag !== "all") {
      filters.push(quickTags.find((tag) => tag.key === quickTag)?.label);
    }

    if (searchText.trim()) {
      filters.push(`"${searchText.trim()}"`);
    }

    return filters.filter(Boolean).join(" + ");
  }, [active, categoryLabel, quickTag, searchText]);

  const resetFilters = () => {
    setActive("all");
    setQuickTag("all");
    setSearchText("");
  };

  const visibleItems = showAllItems
    ? items
    : items.slice(0, INITIAL_VISIBLE_ITEMS);
  const hasHiddenItems = items.length > INITIAL_VISIBLE_ITEMS;

  const hotItems = useMemo(
    () =>
      featuredDishes.filter((d) => popularDishIds.includes(d.id)).slice(0, 4),
    [],
  );

  const carouselItems = useMemo(() => [...drinkSpecials, ...drinkSpecials], []);
  const totalCommentPages = Math.max(
    1,
    Math.ceil(comments.length / COMMENT_PAGE_SIZE),
  );
  const currentCommentPage = Math.min(commentPage, totalCommentPages);
  const visibleComments = useMemo(() => {
    const startIndex = (currentCommentPage - 1) * COMMENT_PAGE_SIZE;
    return comments.slice(startIndex, startIndex + COMMENT_PAGE_SIZE);
  }, [comments, currentCommentPage]);

  React.useEffect(() => {
    if (commentPage > totalCommentPages) {
      setCommentPage(totalCommentPages);
    }
  }, [commentPage, totalCommentPages]);

  const submitComment = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const text = form.text.trim();
    const rating = normalizeRating(form.rating);

    if (!name || !text) {
      setCommentError("Bạn cần nhập tên và nội dung nhận xét.");
      return;
    }

    if (isSupabaseConfigured) {
      setCommentSaving(true);
      try {
        let { data, error } = await supabase
          .from("menu_comments")
          .insert({
            name,
            comment_text: text,
            rating,
          })
          .select("id, name, comment_text, rating")
          .single();

        if (error && error.message?.toLowerCase().includes("rating")) {
          const fallbackResult = await supabase
            .from("menu_comments")
            .insert({
              name,
              comment_text: text,
            })
            .select("id, name, comment_text")
            .single();
          data = fallbackResult.data;
          error = fallbackResult.error;
        }

        if (error) {
          setCommentError("Không thể gửi nhận xét. Vui lòng thử lại.");
          return;
        }

        setComments((prev) => [mapCommentRow(data, rating), ...prev]);
        setCommentPage(1);
        setCommentError("");
        setForm({ name: "", text: "", rating: DEFAULT_RATING });
        return;
      } catch {
        setCommentError("Không thể kết nối database để gửi nhận xét.");
        return;
      } finally {
        setCommentSaving(false);
      }
    }

    setComments((prev) => [
      { id: Date.now(), name, text, rating },
      ...prev,
    ]);
    setCommentPage(1);
    setCommentError("");
    setForm({ name: "", text: "", rating: DEFAULT_RATING });
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
            type: "button",
            className: active === cat.key ? "chip active" : "chip",
            "aria-pressed": active === cat.key,
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
              "aria-pressed": quickTag === tag.key,
              onClick: () => setQuickTag(tag.key),
            },
            tag.label,
          ),
        ),
      ),
    ),
    React.createElement(
      "section",
      { className: "menu-results reveal", "aria-live": "polite" },
      React.createElement(
        "div",
        { className: "menu-results-heading" },
        React.createElement(
          "div",
          null,
          React.createElement("h2", null, "Kết Quả Thực Đơn"),
          React.createElement(
            "p",
            { className: "menu-result-count" },
            activeFilterText
              ? `Đang lọc: ${activeFilterText} - hiển thị ${visibleItems.length}/${items.length} món`
              : `Tất cả món - hiển thị ${visibleItems.length}/${items.length} món`,
          ),
        ),
        active !== "all" || quickTag !== "all" || searchText.trim()
          ? React.createElement(
              "button",
              {
                className: "chip menu-reset-btn",
                type: "button",
                onClick: resetFilters,
              },
              "Xóa lọc",
            )
          : null,
      ),
      React.createElement(
        "div",
        { className: "cards-grid" },
        items.length
          ? visibleItems.map((dish) =>
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
                    { className: "dish-desc" },
                    dish.description,
                  ),
                  React.createElement(
                    "p",
                    { className: "menu-price" },
                    formatPrice(dish.price),
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
      hasHiddenItems
        ? React.createElement(
            "div",
            { className: "menu-more-wrap" },
            React.createElement(
              "button",
              {
                className: "menu-more-btn",
                type: "button",
                onClick: () => setShowAllItems((prev) => !prev),
                "aria-expanded": showAllItems,
              },
              showAllItems ? "-THU GỌN-" : "-XEM THÊM-",
            ),
          )
        : null,
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
              { className: "hot-desc" },
              dish.description,
            ),
            React.createElement(
              "p",
              { className: "menu-price" },
              formatPrice(dish.price),
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
                  { className: "drink-desc" },
                  drink.description,
                ),
                React.createElement(
                  "p",
                  { className: "menu-price" },
                  formatPrice(drink.price),
                ),
              ),
            ),
          ),
        ),
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
          "div",
          { className: "rating-field" },
          React.createElement("span", { className: "rating-label" }, "Đánh giá món ăn"),
          React.createElement(
            "div",
            { className: "rating-stars", role: "radiogroup", "aria-label": "Chọn số sao" },
            Array.from({ length: MAX_RATING }).map((_, index) => {
              const ratingValue = index + 1;
              return React.createElement(
                "button",
                {
                  key: ratingValue,
                  type: "button",
                  className:
                    ratingValue <= form.rating
                      ? "rating-star-btn active"
                      : "rating-star-btn",
                  role: "radio",
                  "aria-checked": ratingValue === form.rating,
                  "aria-label": `${ratingValue} trên ${MAX_RATING} sao`,
                  onClick: () =>
                    setForm((p) => ({ ...p, rating: ratingValue })),
                },
                "★",
              );
            }),
          ),
        ),
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
        visibleComments.map((c) =>
          React.createElement(
            "article",
            { key: c.id, className: "comment-item" },
            React.createElement(
              "div",
              { className: "comment-author-row" },
              React.createElement(
                "span",
                { className: "comment-avatar", "aria-hidden": "true" },
                c.name.slice(0, 1).toUpperCase(),
              ),
              React.createElement("strong", null, c.name),
              React.createElement(
                "span",
                {
                  className: "comment-rating",
                  "aria-label": `${normalizeRating(c.rating)} trên ${MAX_RATING} sao`,
                },
                formatRatingStars(c.rating),
              ),
            ),
            React.createElement("p", null, c.text),
          ),
        ),
      ),
      totalCommentPages > 1
        ? React.createElement(
            "div",
            { className: "comment-pagination", "aria-label": "Phân trang nhận xét" },
            Array.from({ length: totalCommentPages }).map((_, index) => {
              const pageNumber = index + 1;
              return React.createElement(
                "button",
                {
                  key: pageNumber,
                  type: "button",
                  className:
                    pageNumber === currentCommentPage
                      ? "comment-page-btn active"
                      : "comment-page-btn",
                  "aria-current":
                    pageNumber === currentCommentPage ? "page" : undefined,
                  onClick: () => setCommentPage(pageNumber),
                },
                pageNumber,
              );
            }),
          )
        : null,
    ),
  );
}
