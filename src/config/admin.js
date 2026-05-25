import { ADMIN_EMAILS } from "../constants/index.js";

export { ADMIN_EMAILS };

export function isAdminUser(user) {
  if (!user) {
    return false;
  }

  const normalizedEmail = user.email?.trim().toLowerCase();
  return user.role === "admin" || ADMIN_EMAILS.includes(normalizedEmail);
}
