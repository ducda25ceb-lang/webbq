export const ADMIN_EMAILS = new Set(["ducanh12082007dn@gmail.com"]);

export function isAdminUser(user) {
  if (!user) {
    return false;
  }

  const normalizedEmail = user.email?.trim().toLowerCase();
  return user.role === "admin" || ADMIN_EMAILS.has(normalizedEmail);
}
