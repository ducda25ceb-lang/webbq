import { isSupabaseConfigured, supabase } from "../lib/supabase.js";

export const MENU_IMAGE_BUCKET = "menu-images";
export const LOCAL_MENU_ITEMS_STORAGE_KEY = "ember-bbq-menu-items";

const MENU_SELECT =
  "id, name, category, price, description, image_url, is_available, is_active, is_popular, sort_order, created_at, updated_at";

function normalizeBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeLocalMenuItem(item, index = 0) {
  return {
    id: item.id || `local-menu-${Date.now()}-${index}`,
    name: item.name || "",
    category: item.category || "bo",
    price: Number(item.price || 0),
    description: item.description || "",
    image: item.imageUrl || item.image || "",
    imageUrl: item.imageUrl || item.image || "",
    isAvailable: normalizeBoolean(item.isAvailable, true),
    isActive: normalizeBoolean(item.isActive, true),
    isPopular: normalizeBoolean(item.isPopular, false),
    sortOrder: Number(item.sortOrder || index + 1),
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || "",
    isLocal: true,
  };
}

export function mapMenuItemRow(row) {
  return {
    id: row.id,
    name: row.name || "",
    category: row.category || "bo",
    price: Number(row.price || 0),
    description: row.description || "",
    image: row.image_url || "",
    imageUrl: row.image_url || "",
    isAvailable: normalizeBoolean(row.is_available, true),
    isActive: normalizeBoolean(row.is_active, true),
    isPopular: normalizeBoolean(row.is_popular, false),
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

export function loadLocalMenuItems(fallbackItems = []) {
  try {
    const rawItems = localStorage.getItem(LOCAL_MENU_ITEMS_STORAGE_KEY);
    const parsedItems = rawItems ? JSON.parse(rawItems) : null;

    if (Array.isArray(parsedItems) && parsedItems.length) {
      return parsedItems.map((item, index) => normalizeLocalMenuItem(item, index));
    }
  } catch {
    // Fall back to bundled menu data when localStorage is unavailable or corrupt.
  }

  const items = fallbackItems.map((item, index) =>
    normalizeLocalMenuItem(item, index),
  );
  saveLocalMenuItems(items);
  return items;
}

export function saveLocalMenuItems(items) {
  try {
    localStorage.setItem(
      LOCAL_MENU_ITEMS_STORAGE_KEY,
      JSON.stringify(items.map((item, index) => normalizeLocalMenuItem(item, index))),
    );
  } catch {
    // Local fallback is best-effort; the UI still keeps the in-memory state.
  }
}

export function saveLocalMenuItem(item, allItems = []) {
  const updatedItem = normalizeLocalMenuItem({
    ...item,
    updatedAt: new Date().toISOString(),
  });
  const nextItems = allItems.length
    ? allItems.map((current) => (current.id === updatedItem.id ? updatedItem : current))
    : [updatedItem];

  saveLocalMenuItems(nextItems);
  return updatedItem;
}

export function readImageFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Bạn cần chọn ảnh món."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Không thể đọc ảnh đã chọn."));
    reader.readAsDataURL(file);
  });
}

function toMenuItemPayload(values) {
  return {
    name: values.name.trim(),
    category: values.category,
    price: Number(values.price || 0),
    description: values.description.trim(),
    image_url: values.imageUrl.trim(),
    is_available: Boolean(values.isAvailable),
    is_active: true,
    is_popular: Boolean(values.isPopular),
    sort_order: Number(values.sortOrder || 0),
    updated_at: new Date().toISOString(),
  };
}

export async function loadPublicMenuItems() {
  if (!isSupabaseConfigured) {
    return { items: [], error: null, unavailable: true };
  }

  const { data, error } = await supabase
    .from("menu_items")
    .select(MENU_SELECT)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    return { items: [], error, unavailable: false };
  }

  return { items: (data || []).map(mapMenuItemRow), error: null, unavailable: false };
}

export async function loadAdminMenuItems() {
  if (!isSupabaseConfigured) {
    throw new Error("Trang quản trị thực đơn cần Supabase để tải dữ liệu thật.");
  }

  const { data, error } = await supabase
    .from("menu_items")
    .select(MENU_SELECT)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map(mapMenuItemRow);
}

export async function saveMenuItem(values) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase chưa được cấu hình.");
  }

  const payload = toMenuItemPayload(values);

  if (!payload.name) {
    throw new Error("Tên món không được để trống.");
  }

  if (!payload.category) {
    throw new Error("Bạn cần chọn loại món.");
  }

  if (payload.price < 0) {
    throw new Error("Giá món không hợp lệ.");
  }

  const request = values.id
    ? supabase
        .from("menu_items")
        .update(payload)
        .eq("id", values.id)
        .select(MENU_SELECT)
        .single()
    : supabase
        .from("menu_items")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        })
        .select(MENU_SELECT)
        .single();

  const { data, error } = await request;

  if (error) {
    throw error;
  }

  return mapMenuItemRow(data);
}

export async function toggleMenuItemAvailability(item) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase chưa được cấu hình.");
  }

  const { data, error } = await supabase
    .from("menu_items")
    .update({
      is_available: !item.isAvailable,
      updated_at: new Date().toISOString(),
    })
    .eq("id", item.id)
    .select(MENU_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return mapMenuItemRow(data);
}

export async function uploadMenuItemImage(file) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase chưa được cấu hình.");
  }

  if (!file) {
    throw new Error("Bạn cần chọn ảnh món.");
  }

  const extension = file.name.includes(".")
    ? file.name.split(".").pop().toLowerCase()
    : "jpg";
  const safeName = file.name
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "menu-item";
  const path = `${Date.now()}-${safeName}.${extension}`;

  const { error } = await supabase.storage
    .from(MENU_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(MENU_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
