import React from "https://esm.sh/react@18.2.0";
import { useLocation } from "https://esm.sh/react-router-dom@6.28.0?deps=react@18.2.0,react-dom@18.2.0";
import {
  ADMIN_EMAILS,
  DEPOSIT_AMOUNT,
  BOOKING_STATUS_CANCELLED,
  BOOKING_STATUS_CONFIRMED,
  BOOKING_STATUS_PAYMENT_REVIEW,
  BOOKING_STATUS_PENDING_ADMIN,
  BOOKING_STATUS_PENDING_QR,
  PAYMENT_STATUS_CANCELLED,
  PAYMENT_STATUS_PAID,
  PAYMENT_STATUS_PENDING,
  PAYMENT_STATUS_REVIEW,
  isSupabaseConfigured,
  sendBookingConfirmationEmail,
  supabase,
} from "../lib/supabase.js";
import { useAuth } from "../context/AuthContext.js";
import {
  loadAdminMenuItems,
  loadLocalMenuItems,
  readImageFileAsDataUrl,
  saveLocalMenuItem,
  saveMenuItem,
  toggleMenuItemAvailability,
  uploadMenuItemImage,
} from "../services/menuService.js";
import {
  drinkSpecials,
  featuredDishes,
  popularDishIds,
} from "../data/mockData.js";

const BOOKING_SELECT =
  "id, booking_code, customer_name, customer_email, phone, booking_date, booking_time, guests, status, deposit_amount, payment_code, payment_status, payment_expires_at, payment_confirmed_at, admin_note, created_at";
const CONTACT_SELECT = "id, name, email, message, status, reply_note, replied_at, created_at";
const CONTACT_PAGE_SIZE = 20;
const LEGACY_PENDING_STATUS = "Đang chờ";
const BOOKING_REVIEW_TABS = [
  { value: "pending", label: "Chưa duyệt" },
  { value: "confirmed", label: "Đã duyệt" },
  { value: "cancelled", label: "Đã hủy" },
];
const BOOKING_DATE_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "today", label: "Hôm nay" },
  { value: "upcoming", label: "Sắp tới" },
];
const ADMIN_WORKSPACE_TABS = [
  "overview",
  "bookings",
  "contacts",
  "menu",
];
const MENU_CATEGORY_OPTIONS = [
  { value: "bo", label: "Bò" },
  { value: "heo", label: "Heo" },
  { value: "ga", label: "Gà" },
  { value: "hai-san", label: "Hải sản" },
  { value: "rau", label: "Rau" },
  { value: "combo", label: "Combo" },
  { value: "do-uong", label: "Đồ uống" },
];
const MENU_STATUS_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "available", label: "Còn món" },
  { value: "sold-out", label: "Hết món" },
];

function createEmptyMenuForm(nextSortOrder = 1) {
  return {
    id: "",
    name: "",
    category: "bo",
    price: "",
    description: "",
    imageUrl: "",
    isAvailable: true,
    isPopular: false,
    sortOrder: nextSortOrder,
  };
}

const fallbackAdminMenuItems = [
  ...featuredDishes.map((dish, index) => ({
    id: `fallback-dish-${dish.id}`,
    name: dish.name,
    category: dish.category,
    price: dish.price,
    description: dish.description,
    imageUrl: dish.image,
    image: dish.image,
    isAvailable: true,
    isActive: true,
    isPopular: popularDishIds.includes(dish.id),
    sortOrder: index + 1,
  })),
  ...drinkSpecials.map((dish, index) => ({
    id: `fallback-drink-${dish.id}`,
    name: dish.name,
    category: "do-uong",
    price: dish.price,
    description: dish.description,
    imageUrl: dish.image,
    image: dish.image,
    isAvailable: true,
    isActive: true,
    isPopular: false,
    sortOrder: featuredDishes.length + index + 1,
  })),
];

function getLocalDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateFromValue(value) {
  return new Date(`${value}T00:00:00`);
}

function getWeekStart(date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatChartDateLabel(date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function isSameWeek(value, baseDate) {
  const date = getDateFromValue(value);
  const start = getWeekStart(baseDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
}

function isSameMonth(value, baseDate) {
  const date = getDateFromValue(value);
  return (
    date.getFullYear() === baseDate.getFullYear() &&
    date.getMonth() === baseDate.getMonth()
  );
}

function isPendingBooking(status) {
  return (
    status === BOOKING_STATUS_PENDING_QR ||
    status === BOOKING_STATUS_PENDING_ADMIN ||
    status === BOOKING_STATUS_PAYMENT_REVIEW ||
    status === LEGACY_PENDING_STATUS
  );
}

function formatMoney(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAdminDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(getDateFromValue(value));
}

function formatContactDate(value) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatOptionalDateTime(value) {
  if (!value) {
    return "Chưa có";
  }

  return formatContactDate(value);
}

function getAdminDisplayStatus(status) {
  if (status === BOOKING_STATUS_CANCELLED) {
    return "Đã hủy";
  }

  if (status === LEGACY_PENDING_STATUS) {
    return "Chờ xử lý";
  }

  if (status === BOOKING_STATUS_PAYMENT_REVIEW) {
    return "Cần kiểm tra thanh toán";
  }

  return status;
}

function getStatusClass(status) {
  if (status === BOOKING_STATUS_CONFIRMED) {
    return "is-confirmed";
  }

  if (status === BOOKING_STATUS_CANCELLED) {
    return "is-cancelled";
  }

  if (status === BOOKING_STATUS_PAYMENT_REVIEW) {
    return "is-review";
  }

  return "is-pending";
}

function getPaymentClass(booking) {
  if (
    booking.payment_status === PAYMENT_STATUS_PAID ||
    booking.status === BOOKING_STATUS_CONFIRMED
  ) {
    return "is-paid";
  }

  if (
    booking.payment_status === PAYMENT_STATUS_REVIEW ||
    booking.status === BOOKING_STATUS_PAYMENT_REVIEW
  ) {
    return "is-review";
  }

  if (
    booking.payment_status === PAYMENT_STATUS_CANCELLED ||
    booking.status === BOOKING_STATUS_CANCELLED
  ) {
    return "is-cancelled";
  }

  return "is-pending";
}

function getPaymentLabel(booking) {
  return booking.payment_status || PAYMENT_STATUS_PENDING;
}

function isBookingInDateFilter(booking, filterValue) {
  if (filterValue === "today") {
    return booking.booking_date === getLocalDateValue();
  }

  if (filterValue === "upcoming") {
    return booking.booking_date >= getLocalDateValue();
  }

  return true;
}

function matchesBookingSearch(booking, searchValue) {
  const keyword = searchValue.trim().toLowerCase();

  if (!keyword) {
    return true;
  }

  return [
    booking.booking_code,
    booking.customer_name,
    booking.customer_email,
    booking.phone,
    booking.payment_code,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(keyword));
}

function getReviewTabForStatus(status) {
  if (status === BOOKING_STATUS_CONFIRMED) {
    return "confirmed";
  }

  if (status === BOOKING_STATUS_CANCELLED) {
    return "cancelled";
  }

  return "pending";
}

export function AdminPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [bookings, setBookings] = React.useState([]);
  const [contacts, setContacts] = React.useState([]);
  const [hasMoreContacts, setHasMoreContacts] = React.useState(false);
  const [loading, setLoading] = React.useState(isSupabaseConfigured);
  const [contactsLoading, setContactsLoading] = React.useState(isSupabaseConfigured);
  const [error, setError] = React.useState("");
  const [contactError, setContactError] = React.useState("");
  const [actionMsg, setActionMsg] = React.useState("");
  const [busyId, setBusyId] = React.useState("");
  const [replyTextByContact, setReplyTextByContact] = React.useState({});
  const [activeReplyContactId, setActiveReplyContactId] = React.useState("");
  const [bookingReviewTab, setBookingReviewTab] = React.useState("pending");
  const [bookingDateFilter, setBookingDateFilter] = React.useState("all");
  const [bookingSearch, setBookingSearch] = React.useState("");
  const [menuItems, setMenuItems] = React.useState([]);
  const [menuLoading, setMenuLoading] = React.useState(isSupabaseConfigured);
  const [menuError, setMenuError] = React.useState("");
  const [menuActionMsg, setMenuActionMsg] = React.useState("");
  const [menuSearch, setMenuSearch] = React.useState("");
  const [menuCategoryFilter, setMenuCategoryFilter] = React.useState("all");
  const [menuStatusFilter, setMenuStatusFilter] = React.useState("all");
  const [menuForm, setMenuForm] = React.useState(createEmptyMenuForm());
  const [menuDrafts, setMenuDrafts] = React.useState({});
  const [menuBusyId, setMenuBusyId] = React.useState("");
  const [menuSaving, setMenuSaving] = React.useState(false);
  const [imageUploading, setImageUploading] = React.useState(false);
  const adminEmailsText = ADMIN_EMAILS.join(", ");
  const activeAdminSection = React.useMemo(() => {
    const tab = new URLSearchParams(location.search).get("tab");
    return ADMIN_WORKSPACE_TABS.includes(tab) ? tab : "overview";
  }, [location.search]);

  const activeBookings = React.useMemo(
    () => bookings.filter((booking) => booking.status !== BOOKING_STATUS_CANCELLED),
    [bookings],
  );

  const bookingReviewCounts = React.useMemo(
    () =>
      BOOKING_REVIEW_TABS.reduce(
        (counts, tab) => ({
          ...counts,
          [tab.value]: bookings.filter(
            (booking) => getReviewTabForStatus(booking.status) === tab.value,
          ).length,
        }),
        {},
      ),
    [bookings],
  );

  const reviewBookings = React.useMemo(
    () =>
      bookings.filter(
        (booking) => getReviewTabForStatus(booking.status) === bookingReviewTab,
      ),
    [bookingReviewTab, bookings],
  );

  const filteredReviewBookings = React.useMemo(
    () =>
      reviewBookings.filter(
        (booking) =>
          isBookingInDateFilter(booking, bookingDateFilter) &&
          matchesBookingSearch(booking, bookingSearch),
      ),
    [bookingDateFilter, bookingSearch, reviewBookings],
  );

  const adminWorkSummary = React.useMemo(() => {
    const today = getLocalDateValue();
    const needsAction = bookings.filter(
      (booking) =>
        booking.status === BOOKING_STATUS_PENDING_ADMIN ||
        booking.status === BOOKING_STATUS_PAYMENT_REVIEW ||
        booking.payment_status === PAYMENT_STATUS_REVIEW,
    ).length;
    const todayCount = bookings.filter(
      (booking) =>
        booking.status !== BOOKING_STATUS_CANCELLED &&
        booking.booking_date === today,
    ).length;

    return [
      {
        label: "Cần xử lý",
        value: String(needsAction),
        detail: "Cọc đã nhận hoặc cần kiểm tra",
      },
      {
        label: "Hôm nay",
        value: String(todayCount),
        detail: "Đơn còn hiệu lực trong ngày",
      },
      {
        label: "Đang lọc",
        value: String(filteredReviewBookings.length),
        detail: `${reviewBookings.length} đơn trong tab hiện tại`,
      },
    ];
  }, [bookings, filteredReviewBookings.length, reviewBookings.length]);

  const nextMenuSortOrder = React.useMemo(
    () =>
      menuItems.length
        ? Math.max(...menuItems.map((item) => Number(item.sortOrder || 0))) + 1
        : 1,
    [menuItems],
  );

  const menuCategoryLabel = React.useMemo(
    () =>
      MENU_CATEGORY_OPTIONS.reduce((acc, item) => {
        acc[item.value] = item.label;
        return acc;
      }, {}),
    [],
  );

  const filteredMenuItems = React.useMemo(() => {
    const keyword = menuSearch.trim().toLowerCase();

    return menuItems.filter((item) => {
      const matchesCategory =
        menuCategoryFilter === "all" || item.category === menuCategoryFilter;
      const matchesStatus =
        menuStatusFilter === "all" ||
        (menuStatusFilter === "available" && item.isAvailable) ||
        (menuStatusFilter === "sold-out" && !item.isAvailable);
      const matchesSearch =
        !keyword ||
        [item.name, item.description, menuCategoryLabel[item.category]]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [
    menuCategoryFilter,
    menuCategoryLabel,
    menuItems,
    menuSearch,
    menuStatusFilter,
  ]);

  const menuSummary = React.useMemo(() => {
    const soldOutCount = menuItems.filter((item) => !item.isAvailable).length;
    const popularCount = menuItems.filter((item) => item.isPopular).length;

    return [
      {
        label: "Tổng món",
        value: String(menuItems.length),
        detail: "Đang hiển thị trong menu",
      },
      {
        label: "Hết món",
        value: String(soldOutCount),
        detail: "Vẫn hiện mờ ở trang khách",
      },
      {
        label: "Bán chạy",
        value: String(popularCount),
        detail: "Dùng cho bộ lọc nổi bật",
      },
    ];
  }, [menuItems]);

  const stats = React.useMemo(() => {
    const today = getLocalDateValue();
    const baseDate = new Date();
    const confirmedBookings = bookings.filter(
      (booking) => booking.status === BOOKING_STATUS_CONFIRMED,
    );
    const pendingAdminBookings = bookings.filter(
      (booking) => booking.status === BOOKING_STATUS_PENDING_ADMIN,
    );
    const pendingQrBookings = bookings.filter(
      (booking) =>
        booking.status === BOOKING_STATUS_PENDING_QR ||
        booking.status === LEGACY_PENDING_STATUS,
    );
    const reviewPayments = bookings.filter(
      (booking) =>
        booking.payment_status === PAYMENT_STATUS_REVIEW ||
        booking.status === BOOKING_STATUS_PAYMENT_REVIEW,
    );
    const todayBookings = activeBookings.filter(
      (booking) => booking.booking_date === today,
    );
    const upcomingBookings = activeBookings.filter(
      (booking) => booking.booking_date >= today,
    );
    const totalGuests = activeBookings.reduce(
      (sum, booking) => sum + Number(booking.guests || 0),
      0,
    );
    const weekBookings = activeBookings.filter((booking) =>
      isSameWeek(booking.booking_date, baseDate),
    );
    const monthBookings = activeBookings.filter((booking) =>
      isSameMonth(booking.booking_date, baseDate),
    );
    const nextBooking = upcomingBookings
      .slice()
      .sort((a, b) =>
        `${a.booking_date} ${a.booking_time}`.localeCompare(
          `${b.booking_date} ${b.booking_time}`,
        ),
      )[0];

    return [
      {
        label: "Tổng lượt đặt bàn",
        value: String(activeBookings.length),
        detail: `${bookings.length} lượt đã ghi nhận`,
      },
      {
        label: "Tổng số khách",
        value: String(totalGuests),
        detail: `${todayBookings.reduce(
          (sum, booking) => sum + Number(booking.guests || 0),
          0,
        )} khách hôm nay`,
      },
      {
        label: "Chờ admin duyệt",
        value: String(pendingAdminBookings.length),
        detail: "Cần chấp nhận đặt cọc hoặc hủy bàn",
      },
      {
        label: "Chờ thanh toán QR",
        value: String(pendingQrBookings.length),
        detail: "Khách chưa hoàn tất đặt cọc",
      },
      {
        label: "Cọc cần kiểm tra",
        value: String(reviewPayments.length),
        detail: "Số tiền hoặc nội dung chuyển khoản chưa khớp",
      },
      {
        label: "Tuần này",
        value: String(weekBookings.length),
        detail: `${weekBookings.reduce(
          (sum, booking) => sum + Number(booking.guests || 0),
          0,
        )} khách`,
      },
      {
        label: "Tháng này",
        value: String(monthBookings.length),
        detail: `${monthBookings.reduce(
          (sum, booking) => sum + Number(booking.guests || 0),
          0,
        )} khách`,
      },
      {
        label: "Khung giờ gần nhất",
        value: nextBooking ? nextBooking.booking_time : "-",
        detail: nextBooking
          ? `${formatAdminDate(nextBooking.booking_date)} - ${nextBooking.customer_name}`
          : "Chưa có lịch sắp tới",
      },
      {
        label: "Tiền cọc đã duyệt",
        value: formatMoney(confirmedBookings.length * DEPOSIT_AMOUNT),
        detail: `${confirmedBookings.length} bàn đã xác nhận`,
      },
    ];
  }, [activeBookings, bookings]);

  const chartItems = React.useMemo(() => {
    const baseDate = new Date();
    const items = Array.from({ length: 7 }).map((_, index) => {
      const date = addDays(baseDate, index);
      const dateValue = getLocalDateValue(date);

      return {
        label: index === 0 ? "Hôm nay" : formatChartDateLabel(date),
        count: activeBookings.filter(
          (booking) => booking.booking_date === dateValue,
        ).length,
      };
    });
    const max = Math.max(...items.map((item) => item.count), 1);
    const chartWidth = 360;
    const chartHeight = 190;
    const paddingX = 34;
    const paddingY = 28;
    const usableWidth = chartWidth - paddingX * 2;
    const usableHeight = chartHeight - paddingY * 2;

    return items.map((item, index) => ({
      ...item,
      x: paddingX + (usableWidth / Math.max(items.length - 1, 1)) * index,
      y: paddingY + usableHeight - (item.count / max) * usableHeight,
    }));
  }, [activeBookings]);

  const chartLinePoints = chartItems
    .map((item) => `${item.x},${item.y}`)
    .join(" ");

  const loadBookings = React.useCallback(async () => {
    if (!isSupabaseConfigured) {
      setBookings([]);
      setLoading(false);
      setError("Trang admin cần Supabase để tải danh sách đặt bàn thật.");
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .order("booking_date", { ascending: false })
      .order("booking_time", { ascending: false });

    if (loadError) {
      setBookings([]);
      setError(loadError.message);
      setLoading(false);
      return;
    }

    setBookings(data || []);
    setLoading(false);
  }, []);

  const loadContacts = React.useCallback(async ({ reset = true } = {}) => {
    if (!isSupabaseConfigured) {
      setContacts([]);
      setHasMoreContacts(false);
      setContactsLoading(false);
      setContactError("Tin nhắn liên hệ cần Supabase để tải dữ liệu thật.");
      return;
    }

    setContactsLoading(true);
    setContactError("");

    const from = reset ? 0 : contacts.length;
    const to = from + CONTACT_PAGE_SIZE - 1;
    const { data, error: loadError } = await supabase
      .from("contact_requests")
      .select(CONTACT_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (loadError) {
      if (reset) {
        setContacts([]);
        setHasMoreContacts(false);
      }
      setContactError(loadError.message);
      setContactsLoading(false);
      return;
    }

    setContacts((current) => (reset ? data || [] : [...current, ...(data || [])]));
    setHasMoreContacts(((data || []).length === CONTACT_PAGE_SIZE));
    setContactsLoading(false);
  }, [contacts.length]);

  const loadMenuItems = React.useCallback(async () => {
    if (!isSupabaseConfigured) {
      setMenuItems(loadLocalMenuItems(fallbackAdminMenuItems));
      setMenuLoading(false);
      setMenuError("");
      return;
    }

    setMenuLoading(true);
    setMenuError("");

    try {
      const items = await loadAdminMenuItems();
      setMenuItems(items);
      setMenuDrafts({});
      setMenuForm((current) =>
        current.id ? current : createEmptyMenuForm(
          items.length
            ? Math.max(...items.map((item) => Number(item.sortOrder || 0))) + 1
            : 1,
        ),
      );
    } catch (loadError) {
      setMenuItems(loadLocalMenuItems(fallbackAdminMenuItems));
      setMenuDrafts({});
      setMenuError(
        "Database chưa có bảng menu_items nên đang dùng dữ liệu local trên máy này. Admin vẫn thao tác được; chạy migration 0010 để lưu lên Supabase thật.",
      );
    } finally {
      setMenuLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadBookings();
    loadContacts();
    loadMenuItems();
  }, [loadBookings, loadContacts, loadMenuItems]);

  const refreshAdminData = () => {
    loadBookings();
    setActiveReplyContactId("");
    loadContacts({ reset: true });
    loadMenuItems();
  };

  const loadMoreContacts = () => {
    loadContacts({ reset: false });
  };

  const startNewMenuItem = () => {
    setMenuForm(createEmptyMenuForm(nextMenuSortOrder));
    setMenuError("");
    setMenuActionMsg("");
  };

  const editMenuItem = (item) => {
    setMenuForm({
      id: item.id,
      name: item.name,
      category: item.category,
      price: String(item.price),
      description: item.description,
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      isPopular: item.isPopular,
      sortOrder: item.sortOrder || nextMenuSortOrder,
    });
    setMenuError("");
    setMenuActionMsg("");
  };

  const updateMenuForm = (field, value) => {
    setMenuForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleMenuImageUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setImageUploading(true);
    setMenuError("");
    setMenuActionMsg("");

    try {
      const publicUrl = await uploadMenuItemImage(file);
      updateMenuForm("imageUrl", publicUrl);
      setMenuActionMsg("Ảnh món đã được tải lên Storage.");
    } catch (uploadError) {
      setMenuError(uploadError.message || "Không thể upload ảnh món.");
    } finally {
      setImageUploading(false);
      event.target.value = "";
    }
  };

  const submitMenuForm = async (event) => {
    event.preventDefault();

    if (menuSaving) {
      return;
    }

    setMenuSaving(true);
    setMenuError("");
    setMenuActionMsg("");

    try {
      const savedItem = await saveMenuItem(menuForm);
      setMenuItems((current) => {
        const exists = current.some((item) => item.id === savedItem.id);
        const next = exists
          ? current.map((item) => (item.id === savedItem.id ? savedItem : item))
          : [...current, savedItem];

        return next
          .slice()
          .sort(
            (a, b) =>
              Number(a.sortOrder || 0) - Number(b.sortOrder || 0) ||
              Number(a.id || 0) - Number(b.id || 0),
          );
      });
      setMenuForm({
        id: savedItem.id,
        name: savedItem.name,
        category: savedItem.category,
        price: String(savedItem.price),
        description: savedItem.description,
        imageUrl: savedItem.imageUrl,
        isAvailable: savedItem.isAvailable,
        isPopular: savedItem.isPopular,
        sortOrder: savedItem.sortOrder,
      });
      setMenuActionMsg(`Đã lưu món ${savedItem.name}.`);
    } catch (saveError) {
      setMenuError(saveError.message || "Không thể lưu món.");
    } finally {
      setMenuSaving(false);
    }
  };

  const toggleMenuAvailability = async (item) => {
    if (menuBusyId) {
      return;
    }

    setMenuBusyId(item.id);
    setMenuError("");
    setMenuActionMsg("");

    try {
      const updatedItem = await toggleMenuItemAvailability(item);
      setMenuItems((current) =>
        current.map((menuItem) =>
          menuItem.id === updatedItem.id ? updatedItem : menuItem,
        ),
      );
      if (menuForm.id === updatedItem.id) {
        setMenuForm((current) => ({
          ...current,
          isAvailable: updatedItem.isAvailable,
        }));
      }
      setMenuActionMsg(
        updatedItem.isAvailable
          ? `Đã mở bán lại món ${updatedItem.name}.`
          : `Đã báo hết món ${updatedItem.name}.`,
      );
    } catch (toggleError) {
      setMenuError(toggleError.message || "Không thể đổi trạng thái món.");
    } finally {
      setMenuBusyId("");
    }
  };

  const getMenuDraft = (item) => ({
    description: menuDrafts[item.id]?.description ?? item.description ?? "",
    imageUrl: menuDrafts[item.id]?.imageUrl ?? item.imageUrl ?? "",
    price: menuDrafts[item.id]?.price ?? String(item.price ?? 0),
  });

  const updateMenuDraft = (item, field, value) => {
    setMenuDrafts((current) => ({
      ...current,
      [item.id]: {
        ...getMenuDraft(item),
        ...current[item.id],
        [field]: value,
      },
    }));
  };

  const updateMenuItemInList = (updatedItem) => {
    setMenuItems((current) =>
      current.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
    );
  };

  const saveInlineMenuItem = async (item, overrides = {}) => {
    const draft = getMenuDraft(item);
    const nextValues = {
      ...item,
      price: Number(draft.price || 0),
      description: draft.description,
      imageUrl: draft.imageUrl,
      ...overrides,
    };

    setMenuBusyId(item.id);
    setMenuError("");
    setMenuActionMsg("");

    try {
      if (item.isLocal) {
        const savedItem = saveLocalMenuItem(nextValues, menuItems);
        updateMenuItemInList(savedItem);
        setMenuDrafts((current) => {
          const next = { ...current };
          delete next[item.id];
          return next;
        });
        setMenuActionMsg(`Đã lưu local món ${savedItem.name}.`);
        return savedItem;
      }

      const savedItem = await saveMenuItem(nextValues);
      updateMenuItemInList(savedItem);
      setMenuDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      setMenuActionMsg(`Đã cập nhật món ${savedItem.name}.`);
      return savedItem;
    } catch (saveError) {
      setMenuError(saveError.message || "Không thể cập nhật món.");
      return null;
    } finally {
      setMenuBusyId("");
    }
  };

  const setInlineMenuAvailability = async (item, isAvailable) => {
    if (item.isAvailable === isAvailable || menuBusyId) {
      return;
    }

    await saveInlineMenuItem(item, { isAvailable });
  };

  const handleInlineMenuImageUpload = async (item, event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setImageUploading(true);
    setMenuBusyId(item.id);
    setMenuError("");
    setMenuActionMsg("");

    try {
      const publicUrl = item.isLocal
        ? await readImageFileAsDataUrl(file)
        : await uploadMenuItemImage(file);
      updateMenuDraft(item, "imageUrl", publicUrl);
      await saveInlineMenuItem(item, { imageUrl: publicUrl });
    } catch (uploadError) {
      setMenuError(uploadError.message || "Không thể thay ảnh món.");
    } finally {
      setImageUploading(false);
      setMenuBusyId("");
      event.target.value = "";
    }
  };

  const updateBookingStatus = async (booking, status) => {
    if (!booking?.id || busyId) {
      return;
    }

    setBusyId(booking.id);
    setError("");
    setActionMsg("");

    if (status === BOOKING_STATUS_CANCELLED) {
      const shouldCancel = globalThis.confirm(
        `Hủy bàn cho đơn ${booking.booking_code}?`,
      );

      if (!shouldCancel) {
        setBusyId("");
        return;
      }
    }

    let actionMessage = "";

    if (status === BOOKING_STATUS_CONFIRMED) {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          status,
          payment_status: PAYMENT_STATUS_PAID,
          payment_confirmed_at: booking.payment_confirmed_at || new Date().toISOString(),
          confirmed_at: new Date().toISOString(),
          admin_updated_at: new Date().toISOString(),
          admin_updated_by: user?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      if (updateError) {
        setError(updateError.message);
        setBusyId("");
        return;
      }

      const result = await sendBookingConfirmationEmail({
        bookingCode: booking.booking_code,
      });
      actionMessage = result.emailSent
        ? result.message
        : `Đã chấp nhận đặt cọc cho đơn ${booking.booking_code}. ${result.message}`;
    } else {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          status,
          admin_updated_at: new Date().toISOString(),
          admin_updated_by: user?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      if (updateError) {
        setError(updateError.message);
        setBusyId("");
        return;
      }

      actionMessage = `Đã hủy bàn cho đơn ${booking.booking_code}.`;
    }

    setBookings((current) =>
      current.map((item) =>
        item.id === booking.id ? { ...item, status } : item,
      ),
    );
    setActionMsg(actionMessage);
    setBusyId("");
  };

  const createReplyHref = (contact) => {
    const replyText =
      replyTextByContact[contact.id]?.trim() ||
      `Chào ${contact.name},\n\nEmber BBQ đã nhận được tin nhắn của bạn và xin phản hồi như sau:\n\n`;
    const subject = "Phản hồi từ Ember BBQ";

    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      contact.email,
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(replyText)}`;
  };

  const markContactReplied = async (contact) => {
    if (!contact?.id) {
      return;
    }

    const replyNote = replyTextByContact[contact.id]?.trim() || contact.reply_note || "";
    const { error: updateError } = await supabase
      .from("contact_requests")
      .update({
        status: "Đã phản hồi",
        reply_note: replyNote || null,
        replied_at: new Date().toISOString(),
        replied_by: user?.id || null,
      })
      .eq("id", contact.id);

    if (updateError) {
      setContactError(updateError.message);
      return;
    }

    setContacts((current) =>
      current.map((item) =>
        item.id === contact.id
          ? { ...item, status: "Đã phản hồi", reply_note: replyNote }
          : item,
      ),
    );
    setContactError("");
  };

  const renderBookingActions = (booking, { showNotes = true } = {}) =>
    React.createElement(
      "div",
      { className: "admin-action-group" },
      booking.status !== BOOKING_STATUS_CONFIRMED &&
        booking.status !== BOOKING_STATUS_CANCELLED
        ? booking.payment_status === PAYMENT_STATUS_PAID ||
          booking.status === BOOKING_STATUS_PAYMENT_REVIEW
          ? React.createElement(
              "button",
              {
                type: "button",
                className: "btn-gold admin-action-btn",
                disabled: busyId === booking.id,
                onClick: () =>
                  updateBookingStatus(booking, BOOKING_STATUS_CONFIRMED),
              },
              busyId === booking.id
                ? "Đang xử lý..."
                : booking.status === BOOKING_STATUS_PAYMENT_REVIEW
                  ? "Duyệt cọc"
                  : "Duyệt bàn",
            )
          : React.createElement(
              "span",
              { className: "muted admin-payment-note" },
              "Chờ cọc",
            )
        : null,
      booking.status !== BOOKING_STATUS_CANCELLED
        ? React.createElement(
            "button",
            {
              type: "button",
              className: "btn-outline admin-action-btn dashboard-cancel-btn",
              disabled: busyId === booking.id,
              onClick: () =>
                updateBookingStatus(booking, BOOKING_STATUS_CANCELLED),
            },
            busyId === booking.id ? "Đang xử lý..." : "Hủy bàn",
          )
        : null,
      showNotes && booking.status === BOOKING_STATUS_PENDING_QR
        ? React.createElement(
            "span",
            { className: "muted admin-payment-note" },
            "Khách chưa hoàn tất thanh toán SePay",
          )
        : null,
      showNotes && booking.payment_status
        ? React.createElement(
            "span",
            { className: "muted admin-payment-note admin-payment-code-note" },
            `Cọc: ${booking.payment_status}${booking.payment_code ? ` | ${booking.payment_code}` : ""}`,
          )
        : null,
    );

  const renderPaymentBadge = (booking) =>
    React.createElement(
      "span",
      { className: `admin-payment-pill ${getPaymentClass(booking)}` },
      getPaymentLabel(booking),
    );

  const getMenuItemCardClass = (item) =>
    [
      "admin-menu-item-card",
      item.isAvailable ? "" : "is-sold-out",
      menuForm.id === item.id ? "is-selected" : "",
    ]
      .filter(Boolean)
      .join(" ");

  const renderMenuManager = () =>
    React.createElement(
      "section",
      { className: "panel admin-menu-panel" },
      React.createElement(
        "div",
        { className: "admin-section-heading" },
        React.createElement("h2", null, "Quản trị thực đơn"),
        React.createElement(
          "p",
          { className: "muted" },
          "Bấm trực tiếp trên từng món để báo hết, mở bán lại, thay ảnh hoặc chỉnh ghi chú.",
        ),
      ),
      menuError ? React.createElement("p", { className: "error-msg" }, menuError) : null,
      menuActionMsg
        ? React.createElement("p", { className: "success-msg" }, menuActionMsg)
        : null,
      !isSupabaseConfigured
        ? React.createElement(
            "p",
            { className: "setup-warning" },
            "Tab thực đơn cần Supabase và migration menu_items để lưu món thật.",
          )
        : null,
      React.createElement(
        "div",
        { className: "admin-work-summary admin-menu-summary" },
        menuSummary.map((item) =>
          React.createElement(
            "article",
            { key: item.label, className: "admin-work-summary-item" },
            React.createElement("span", null, item.label),
            React.createElement("strong", null, menuLoading ? "-" : item.value),
            React.createElement("small", null, menuLoading ? "Đang cập nhật" : item.detail),
          ),
        ),
      ),
      React.createElement(
        "div",
        { className: "admin-menu-layout" },
        React.createElement(
          "form",
          { className: "admin-menu-form", onSubmit: submitMenuForm },
          React.createElement(
            "div",
            { className: "admin-menu-form-head" },
            React.createElement(
              "div",
              null,
              React.createElement("h3", null, menuForm.id ? "Đang sửa món" : "Tạo món mới"),
              React.createElement(
                "p",
                { className: "muted admin-menu-current-item" },
                menuForm.id
                  ? menuForm.name || "Món đang chọn chưa có tên."
                  : "Nhập thông tin món rồi lưu để đưa vào thực đơn.",
              ),
            ),
            React.createElement(
              "button",
              {
                type: "button",
                className: "btn-outline admin-menu-new-btn",
                onClick: startNewMenuItem,
              },
              "Món mới",
            ),
          ),
          React.createElement(
            "div",
            { className: "admin-menu-form-section-title" },
            React.createElement("span", null, "Ảnh món"),
            React.createElement(
              "small",
              null,
              imageUploading ? "Đang upload ảnh..." : "Upload từ máy hoặc dán URL ảnh",
            ),
          ),
          React.createElement(
            "div",
            { className: "admin-menu-preview" },
            menuForm.imageUrl
              ? React.createElement("img", {
                  src: menuForm.imageUrl,
                  alt: menuForm.name || "Ảnh món đang chỉnh",
                })
              : React.createElement(
                  "span",
                  { className: "muted" },
                  "Chưa có ảnh",
                ),
          ),
          React.createElement(
            "label",
            { className: "admin-menu-field admin-menu-image-url-field" },
            React.createElement("span", null, "URL ảnh"),
            React.createElement("input", {
              value: menuForm.imageUrl,
              placeholder: "https://...",
              onChange: (event) => updateMenuForm("imageUrl", event.target.value),
            }),
          ),
          React.createElement(
            "label",
            { className: "admin-menu-upload" },
            React.createElement("span", null, imageUploading ? "Đang upload..." : "Chọn ảnh từ máy"),
            React.createElement("input", {
              type: "file",
              accept: "image/*",
              disabled: imageUploading || !isSupabaseConfigured,
              onChange: handleMenuImageUpload,
            }),
          ),
          React.createElement(
            "div",
            { className: "admin-menu-form-section-title" },
            React.createElement("span", null, "Thông tin món"),
            React.createElement("small", null, "Tên, loại, giá và mô tả hiển thị ngoài menu"),
          ),
          React.createElement(
            "label",
            { className: "admin-menu-field" },
            React.createElement("span", null, "Tên món"),
            React.createElement("input", {
              value: menuForm.name,
              placeholder: "Ví dụ: Sườn bò Wagyu nướng than",
              onChange: (event) => updateMenuForm("name", event.target.value),
            }),
          ),
          React.createElement(
            "div",
            { className: "admin-menu-form-grid" },
            React.createElement(
              "label",
              { className: "admin-menu-field" },
              React.createElement("span", null, "Loại món"),
              React.createElement(
              "select",
              {
                value: menuForm.category,
                onChange: (event) => updateMenuForm("category", event.target.value),
              },
              MENU_CATEGORY_OPTIONS.map((option) =>
                React.createElement(
                  "option",
                  { key: option.value, value: option.value },
                  option.label,
                ),
              ),
            ),
            ),
            React.createElement(
              "label",
              { className: "admin-menu-field" },
              React.createElement("span", null, "Giá bán"),
              React.createElement("input", {
                type: "number",
                min: "0",
                step: "1000",
                value: menuForm.price,
                placeholder: "520000",
                onChange: (event) => updateMenuForm("price", event.target.value),
              }),
            ),
          ),
          React.createElement(
            "label",
            { className: "admin-menu-field" },
            React.createElement("span", null, "Mô tả"),
            React.createElement("textarea", {
              rows: 4,
              value: menuForm.description,
              placeholder: "Mô tả ngắn gọn, dễ đọc trên card món.",
              onChange: (event) => updateMenuForm("description", event.target.value),
            }),
          ),
          React.createElement(
            "div",
            { className: "admin-menu-form-section-title" },
            React.createElement("span", null, "Trạng thái vận hành"),
            React.createElement("small", null, "Báo hết món sẽ làm món mờ ngoài trang khách"),
          ),
          React.createElement(
            "div",
            { className: "admin-menu-toggle-row" },
            React.createElement(
              "label",
              { className: "admin-toggle-control" },
              React.createElement("input", {
                type: "checkbox",
                checked: menuForm.isAvailable,
                onChange: (event) =>
                  updateMenuForm("isAvailable", event.target.checked),
              }),
              React.createElement("span", null, "Còn món"),
            ),
            React.createElement(
              "label",
              { className: "admin-toggle-control" },
              React.createElement("input", {
                type: "checkbox",
                checked: menuForm.isPopular,
                onChange: (event) =>
                  updateMenuForm("isPopular", event.target.checked),
              }),
              React.createElement("span", null, "Bán chạy"),
            ),
            React.createElement("input", {
              className: "admin-sort-input",
              type: "number",
              min: "0",
              value: menuForm.sortOrder,
              "aria-label": "Thứ tự hiển thị",
              title: "Thứ tự hiển thị",
              onChange: (event) => updateMenuForm("sortOrder", event.target.value),
            }),
          ),
          React.createElement(
            "button",
            {
              type: "submit",
              className: "btn-gold admin-menu-save-btn",
              disabled: menuSaving || !isSupabaseConfigured,
            },
            menuSaving ? "Đang lưu..." : "Lưu món",
          ),
        ),
        React.createElement(
          "div",
          { className: "admin-menu-list-panel" },
          React.createElement(
            "div",
            { className: "admin-menu-list-head" },
            React.createElement(
              "div",
              null,
              React.createElement("h3", null, "Danh sách món"),
              React.createElement(
                "p",
                { className: "muted" },
                "Mỗi món có nút Còn món/Hết món, thay ảnh và ô ghi chú riêng.",
              ),
            ),
          ),
          React.createElement(
            "div",
            { className: "admin-booking-toolbar admin-menu-toolbar" },
            React.createElement("input", {
              className: "admin-search-input",
              type: "search",
              placeholder: "Tìm tên món, mô tả, loại...",
              value: menuSearch,
              onChange: (event) => setMenuSearch(event.target.value),
            }),
            React.createElement(
              "select",
              {
                className: "admin-filter-select",
                value: menuCategoryFilter,
                onChange: (event) => setMenuCategoryFilter(event.target.value),
              },
              React.createElement("option", { value: "all" }, "Tất cả loại"),
              MENU_CATEGORY_OPTIONS.map((option) =>
                React.createElement(
                  "option",
                  { key: option.value, value: option.value },
                  option.label,
                ),
              ),
            ),
            React.createElement(
              "div",
              { className: "admin-date-filter-row" },
              MENU_STATUS_FILTERS.map((filter) =>
                React.createElement(
                  "button",
                  {
                    key: filter.value,
                    type: "button",
                    className:
                      menuStatusFilter === filter.value
                        ? "admin-date-filter active"
                        : "admin-date-filter",
                    onClick: () => setMenuStatusFilter(filter.value),
                  },
                  filter.label,
                ),
              ),
            ),
            React.createElement(
              "span",
              { className: "admin-result-count" },
              `${filteredMenuItems.length}/${menuItems.length} món`,
            ),
          ),
          menuLoading
            ? React.createElement("p", null, "Đang tải thực đơn...")
            : React.createElement(
                "div",
                { className: "admin-menu-list" },
                filteredMenuItems.length
                  ? filteredMenuItems.map((item) => {
                      const draft = getMenuDraft(item);
                      const isBusy = menuBusyId === item.id;

                      return React.createElement(
                        "article",
                        {
                          key: item.id,
                          className: getMenuItemCardClass(item),
                        },
                        React.createElement(
                          "div",
                          { className: "admin-menu-image-control" },
                          React.createElement("img", {
                            src:
                              draft.imageUrl ||
                              item.imageUrl ||
                              "assets/images/food-fallback.svg",
                            alt: item.name,
                          }),
                          React.createElement(
                            "label",
                            { className: "admin-menu-image-btn" },
                            imageUploading && isBusy ? "Đang thay..." : "Thay ảnh",
                            React.createElement("input", {
                              type: "file",
                              accept: "image/*",
                              disabled: imageUploading,
                              onChange: (event) =>
                                handleInlineMenuImageUpload(item, event),
                            }),
                          ),
                        ),
                        React.createElement(
                          "div",
                          { className: "admin-menu-item-body" },
                          React.createElement(
                            "div",
                            { className: "admin-menu-item-title" },
                            React.createElement("h3", null, item.name),
                            React.createElement(
                              "span",
                              {
                                className: item.isAvailable
                                  ? "admin-status-pill is-confirmed"
                                  : "admin-status-pill is-cancelled",
                              },
                              item.isAvailable ? "Còn món" : "Hết món",
                            ),
                          ),
                          React.createElement(
                            "p",
                            { className: "muted admin-menu-item-meta" },
                            `${menuCategoryLabel[item.category] || item.category} | ${formatMoney(item.price)}${item.isPopular ? " | Bán chạy" : ""}`,
                          ),
                          React.createElement(
                            "label",
                            { className: "admin-menu-price-field" },
                            React.createElement("span", null, "Giá bán"),
                            React.createElement("input", {
                              type: "number",
                              min: "0",
                              step: "1000",
                              value: draft.price,
                              placeholder: "Nhập giá món",
                              disabled: false,
                              onChange: (event) =>
                                updateMenuDraft(item, "price", event.target.value),
                            }),
                          ),
                          React.createElement(
                            "div",
                            { className: "admin-menu-status-actions" },
                            React.createElement(
                              "button",
                              {
                                type: "button",
                                className: item.isAvailable
                                  ? "btn-gold admin-menu-status-btn"
                                  : "btn-outline admin-menu-status-btn",
                                disabled: isBusy || item.isAvailable,
                                onClick: () => setInlineMenuAvailability(item, true),
                              },
                              "Còn món",
                            ),
                            React.createElement(
                              "button",
                              {
                                type: "button",
                                className: !item.isAvailable
                                  ? "btn-gold admin-menu-status-btn"
                                  : "btn-outline admin-menu-status-btn dashboard-cancel-btn",
                                disabled: isBusy || !item.isAvailable,
                                onClick: () => setInlineMenuAvailability(item, false),
                              },
                              "Hết món",
                            ),
                          ),
                          React.createElement(
                            "label",
                            { className: "admin-menu-note-field" },
                            React.createElement("span", null, "Ghi chú / mô tả món"),
                            React.createElement("textarea", {
                              rows: 3,
                              value: draft.description,
                              disabled: false,
                              placeholder: "Ghi chú món, mô tả vị, hoặc thông tin cần khách biết.",
                              onChange: (event) =>
                                updateMenuDraft(item, "description", event.target.value),
                            }),
                          ),
                          React.createElement(
                            "div",
                            { className: "admin-menu-item-actions" },
                            React.createElement(
                              "button",
                              {
                                type: "button",
                                className: "btn-outline admin-action-btn",
                                disabled: isBusy,
                                onClick: () => saveInlineMenuItem(item),
                              },
                              isBusy ? "Đang lưu..." : "Lưu giá & ghi chú",
                            ),
                          ),
                        ),
                      );
                    })
                  : React.createElement(
                      "p",
                      { className: "muted" },
                      menuItems.length
                        ? "Không có món khớp bộ lọc."
                        : "Chưa có món trong database.",
                    ),
              ),
        ),
      ),
    );

  return React.createElement(
    "div",
    { className: "container section admin-page" },
    React.createElement(
      "div",
      { className: "admin-heading" },
      React.createElement(
        "div",
        null,
        React.createElement("p", { className: "eyebrow" }, "Quản trị"),
        React.createElement("h1", null, "Dashboard đặt bàn"),
        React.createElement(
          "p",
          { className: "muted" },
          "Theo dõi số lượt đặt, số khách, khung giờ, duyệt đặt cọc và phản hồi liên hệ.",
        ),
        React.createElement(
          "p",
          { className: "muted admin-permission-note" },
          `Đang đăng nhập: ${user?.email || "không rõ"} | Email admin hợp lệ: ${adminEmailsText}`,
        ),
      ),
      React.createElement(
        "button",
        {
          type: "button",
          className: "btn-outline",
          onClick: refreshAdminData,
          disabled: loading || contactsLoading,
        },
        loading || contactsLoading ? "Đang tải..." : "Tải lại",
      ),
    ),
    error ? React.createElement("p", { className: "error-msg" }, error) : null,
    actionMsg
      ? React.createElement("p", { className: "success-msg" }, actionMsg)
      : null,
    activeAdminSection === "overview"
      ? React.createElement(
          React.Fragment,
          null,
    React.createElement(
      "section",
      { className: "admin-stats-grid", "aria-label": "Thống kê đặt bàn" },
      stats.map((item) =>
        React.createElement(
          "article",
          { key: item.label, className: "admin-stat-card" },
          React.createElement("span", null, item.label),
          React.createElement("strong", null, loading ? "-" : item.value),
          React.createElement(
            "p",
            null,
            loading ? "Đang cập nhật dữ liệu" : item.detail,
          ),
        ),
      ),
    ),
    React.createElement(
      "section",
      { className: "panel admin-chart-panel" },
      React.createElement(
        "div",
        { className: "admin-section-heading" },
        React.createElement("h2", null, "Biểu đồ đường lượt đặt 7 ngày tới"),
        React.createElement(
          "p",
          { className: "muted" },
          "Theo dõi số đơn còn hiệu lực theo từng ngày để chuẩn bị bàn và nhân sự.",
        ),
      ),
      React.createElement(
        "div",
        { className: "admin-line-chart" },
        React.createElement(
          "svg",
          {
            viewBox: "0 0 360 190",
            role: "img",
            "aria-label": "Biểu đồ đường số lượt đặt bàn trong 7 ngày tới",
          },
          React.createElement(
            "defs",
            null,
            React.createElement(
              "linearGradient",
              {
                id: "adminLineGradient",
                x1: "0",
                y1: "0",
                x2: "1",
                y2: "0",
              },
              React.createElement("stop", {
                offset: "0%",
                stopColor: "#f4c86a",
              }),
              React.createElement("stop", {
                offset: "100%",
                stopColor: "#95f19a",
              }),
            ),
            React.createElement(
              "linearGradient",
              {
                id: "adminAreaGradient",
                x1: "0",
                y1: "0",
                x2: "0",
                y2: "1",
              },
              React.createElement("stop", {
                offset: "0%",
                stopColor: "#f4c86a",
                stopOpacity: "0.22",
              }),
              React.createElement("stop", {
                offset: "100%",
                stopColor: "#f4c86a",
                stopOpacity: "0",
              }),
            ),
          ),
          React.createElement("line", {
            className: "admin-chart-grid-line",
            x1: 34,
            y1: 28,
            x2: 34,
            y2: 162,
          }),
          React.createElement("line", {
            className: "admin-chart-soft-line",
            x1: 34,
            y1: 73,
            x2: 326,
            y2: 73,
          }),
          React.createElement("line", {
            className: "admin-chart-soft-line",
            x1: 34,
            y1: 118,
            x2: 326,
            y2: 118,
          }),
          React.createElement("line", {
            className: "admin-chart-grid-line",
            x1: 34,
            y1: 162,
            x2: 326,
            y2: 162,
          }),
          React.createElement("polygon", {
            className: "admin-line-area",
            points: loading
              ? ""
              : `34,162 ${chartLinePoints} 326,162`,
          }),
          React.createElement("polyline", {
            className: "admin-line-path",
            points: loading ? "" : chartLinePoints,
          }),
          chartItems.map((item) =>
            React.createElement(
              "g",
              { key: item.label },
              React.createElement("circle", {
                className: "admin-line-dot",
                cx: item.x,
                cy: loading ? 162 : item.y,
                r: 5,
              }),
              React.createElement(
                "text",
                {
                  className: "admin-line-value",
                  x: item.x,
                  y: loading ? 150 : Math.max(18, item.y - 12),
                  textAnchor: "middle",
                },
                loading ? "-" : item.count,
              ),
              React.createElement(
                "text",
                {
                  className: "admin-line-label",
                  x: item.x,
                  y: 184,
                  textAnchor: "middle",
                },
                item.label,
              ),
            ),
          ),
        ),
        React.createElement(
          "div",
          { className: "admin-line-legend" },
          chartItems.map((item) =>
            React.createElement(
              "span",
              { key: item.label },
              `${item.label}: ${loading ? "-" : item.count}`,
            ),
          ),
        ),
      ),
    ),
        )
      : null,
    activeAdminSection === "bookings"
      ? React.createElement(
      "div",
      { className: "panel table-wrap admin-table-panel" },
      React.createElement(
        "div",
        { className: "admin-section-heading" },
        React.createElement("h2", null, "Duyệt đặt bàn"),
        React.createElement(
          "p",
          { className: "muted" },
          "Admin được chấp nhận đặt cọc/xác nhận bàn hoặc hủy bàn của khách.",
        ),
      ),
      React.createElement(
        "div",
        { className: "admin-work-summary", "aria-label": "Tóm tắt việc cần xử lý" },
        adminWorkSummary.map((item) =>
          React.createElement(
            "article",
            { key: item.label, className: "admin-work-summary-item" },
            React.createElement("span", null, item.label),
            React.createElement("strong", null, loading ? "-" : item.value),
            React.createElement("small", null, loading ? "Đang cập nhật" : item.detail),
          ),
        ),
      ),
      React.createElement(
        "div",
        { className: "admin-review-tabs", role: "tablist" },
        BOOKING_REVIEW_TABS.map((tab) =>
          React.createElement(
            "button",
            {
              key: tab.value,
              type: "button",
              role: "tab",
              className:
                bookingReviewTab === tab.value
                  ? "admin-review-tab active"
                  : "admin-review-tab",
              "aria-selected": bookingReviewTab === tab.value,
              onClick: () => setBookingReviewTab(tab.value),
            },
            React.createElement("span", null, tab.label),
            React.createElement(
              "strong",
              null,
              String(bookingReviewCounts[tab.value] || 0),
            ),
          ),
        ),
      ),
      React.createElement(
        "div",
        { className: "admin-booking-toolbar" },
        React.createElement("input", {
          className: "admin-search-input",
          type: "search",
          placeholder: "Tìm mã đơn, khách, SĐT, mã cọc...",
          value: bookingSearch,
          onChange: (event) => setBookingSearch(event.target.value),
        }),
        React.createElement(
          "div",
          {
            className: "admin-date-filter-row",
            role: "group",
            "aria-label": "Lọc ngày đặt bàn",
          },
          BOOKING_DATE_FILTERS.map((filter) =>
            React.createElement(
              "button",
              {
                key: filter.value,
                type: "button",
                className:
                  bookingDateFilter === filter.value
                    ? "admin-date-filter active"
                    : "admin-date-filter",
                onClick: () => setBookingDateFilter(filter.value),
              },
              filter.label,
            ),
          ),
        ),
        React.createElement(
          "span",
          { className: "admin-result-count" },
          `${filteredReviewBookings.length}/${reviewBookings.length} đơn`,
        ),
      ),
      loading
        ? React.createElement("p", null, "Đang tải danh sách đặt bàn...")
        : React.createElement(
            React.Fragment,
            null,
            React.createElement(
            "table",
            { className: "book-table admin-book-table admin-book-table-desktop" },
            React.createElement(
              "thead",
              null,
              React.createElement(
                "tr",
                null,
                React.createElement("th", null, "Mã đơn"),
                React.createElement("th", null, "Khách"),
                React.createElement("th", null, "Liên hệ"),
                React.createElement("th", null, "Ngày giờ"),
                React.createElement("th", null, "Số khách"),
                React.createElement("th", null, "Cọc"),
                React.createElement("th", null, "Trạng thái"),
                React.createElement("th", null, "Thao tác"),
              ),
            ),
            React.createElement(
              "tbody",
              null,
              filteredReviewBookings.length
                ? filteredReviewBookings.map((booking) =>
                    React.createElement(
                      "tr",
                      { key: booking.id },
                      React.createElement(
                        "td",
                        null,
                        React.createElement(
                          "strong",
                          { className: "admin-booking-code" },
                          booking.booking_code,
                        ),
                      ),
                      React.createElement(
                        "td",
                        null,
                        React.createElement(
                          "div",
                          { className: "admin-booking-primary" },
                          React.createElement(
                            "strong",
                            null,
                            booking.customer_name || "Khách",
                          ),
                          React.createElement(
                            "span",
                            { className: "muted" },
                            booking.customer_email || "Không có email",
                          ),
                        ),
                      ),
                      React.createElement(
                        "td",
                        { className: "admin-booking-contact" },
                        booking.phone || "Chưa có",
                      ),
                      React.createElement(
                        "td",
                        { className: "admin-datetime-cell" },
                        `${formatAdminDate(booking.booking_date)} - ${booking.booking_time}`,
                      ),
                      React.createElement("td", null, booking.guests),
                      React.createElement(
                        "td",
                        { className: "admin-payment-stack" },
                        renderPaymentBadge(booking),
                        booking.payment_code
                          ? React.createElement(
                              "span",
                              { className: "muted admin-email-cell" },
                              booking.payment_code,
                            )
                          : null,
                      ),
                      React.createElement(
                        "td",
                        null,
                        React.createElement(
                          "span",
                          {
                            className: `admin-status-pill ${getStatusClass(
                              booking.status,
                            )}`,
                          },
                          getAdminDisplayStatus(booking.status),
                        ),
                      ),
                      React.createElement(
                        "td",
                        null,
                        renderBookingActions(booking, { showNotes: false }),
                      ),
                    ),
                  )
                : React.createElement(
                    "tr",
                    null,
                    React.createElement(
                      "td",
                      { colSpan: 8, className: "muted" },
                      reviewBookings.length
                        ? "Không có đơn khớp bộ lọc."
                        : "Không có đơn đặt bàn trong mục này.",
                    ),
                  ),
            ),
          ),
            React.createElement(
              "div",
              { className: "admin-booking-card-list" },
              filteredReviewBookings.length
                ? filteredReviewBookings.map((booking) =>
                    React.createElement(
                      "article",
                      { key: booking.id, className: "admin-booking-card" },
                      React.createElement(
                        "div",
                        { className: "admin-booking-card-head" },
                        React.createElement(
                          "strong",
                          { className: "admin-booking-code" },
                          booking.booking_code,
                        ),
                        React.createElement(
                          "span",
                          {
                            className: `admin-status-pill ${getStatusClass(
                              booking.status,
                            )}`,
                          },
                          getAdminDisplayStatus(booking.status),
                        ),
                      ),
                      React.createElement(
                        "div",
                        { className: "admin-booking-customer" },
                        React.createElement(
                          "strong",
                          null,
                          booking.customer_name || "Khách",
                        ),
                        React.createElement(
                          "span",
                          { className: "muted" },
                          booking.customer_email || "Không có email",
                        ),
                      ),
                      React.createElement(
                        "div",
                        { className: "admin-booking-details" },
                        React.createElement(
                          "span",
                          null,
                          React.createElement("b", null, "Ngày giờ"),
                          `${formatAdminDate(booking.booking_date)} - ${booking.booking_time}`,
                        ),
                        React.createElement(
                          "span",
                          null,
                          React.createElement("b", null, "Số khách"),
                          `${booking.guests} khách`,
                        ),
                        React.createElement(
                          "span",
                          null,
                          React.createElement("b", null, "Điện thoại"),
                          booking.phone || "Chưa có",
                        ),
                        React.createElement(
                          "span",
                          null,
                          React.createElement("b", null, "Cọc"),
                          renderPaymentBadge(booking),
                        ),
                        React.createElement(
                          "span",
                          null,
                          React.createElement("b", null, "Mã cọc"),
                          booking.payment_code || "Chưa có",
                        ),
                        React.createElement(
                          "span",
                          null,
                          React.createElement("b", null, "Hạn giữ"),
                          formatOptionalDateTime(booking.payment_expires_at),
                        ),
                      ),
                      renderBookingActions(booking),
                    ),
                  )
                : React.createElement(
                    "p",
                    { className: "muted" },
                    reviewBookings.length
                      ? "Không có đơn khớp bộ lọc."
                      : "Không có đơn đặt bàn trong mục này.",
                  ),
            ),
          ),
    )
      : null,
    activeAdminSection === "contacts"
      ? React.createElement(
      "section",
      { className: "panel admin-contact-panel" },
      React.createElement(
        "div",
        { className: "admin-section-heading" },
        React.createElement("h2", null, "Tin nhắn Liên hệ"),
        React.createElement(
          "p",
          { className: "muted" },
          "Xem nội dung khách gửi qua trang Liên hệ và phản hồi về email của khách.",
        ),
      ),
      contactError
        ? React.createElement("p", { className: "error-msg" }, contactError)
        : null,
      contactsLoading
        ? React.createElement("p", null, "Đang tải tin nhắn liên hệ...")
        : React.createElement(
            "div",
            { className: "admin-contact-list" },
            contacts.length
              ? contacts.map((contact) =>
                  React.createElement(
                    "article",
                    { key: contact.id, className: "admin-contact-card" },
                    React.createElement(
                      "div",
                      { className: "admin-contact-meta" },
                      React.createElement(
                        "div",
                        null,
                        React.createElement("strong", null, contact.name),
                        React.createElement(
                          "span",
                          { className: "muted" },
                          contact.email,
                        ),
                      ),
                      React.createElement(
                        "time",
                        { className: "muted" },
                        formatContactDate(contact.created_at),
                      ),
                    ),
                    React.createElement(
                      "p",
                      { className: "admin-contact-message" },
                      contact.message,
                    ),
                    React.createElement(
                      "p",
                      { className: "muted admin-contact-status" },
                      `Trạng thái: ${contact.status || "Mới"}`,
                    ),
                    React.createElement("textarea", {
                      rows: 4,
                      placeholder: "Nhập nội dung phản hồi trước khi mở email...",
                      value: replyTextByContact[contact.id] || "",
                      onChange: (event) =>
                        setReplyTextByContact((current) => ({
                          ...current,
                          [contact.id]: event.target.value,
                        })),
                    }),
                    React.createElement(
                      "a",
                      {
                        className: "btn-gold admin-reply-link",
                        href: createReplyHref(contact),
                        target: "_blank",
                        rel: "noopener noreferrer",
                      },
                      "Mở Gmail phản hồi",
                    ),
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        className: "btn-outline admin-reply-link",
                        onClick: () => markContactReplied(contact),
                      },
                      "Đánh dấu đã phản hồi",
                    ),
                  ),
                )
              : React.createElement(
                  "p",
                  { className: "muted" },
                  "Chưa có tin nhắn liên hệ nào.",
                ),
          ),
    )
      : null,
    activeAdminSection === "menu" ? renderMenuManager() : null,
  );
}
