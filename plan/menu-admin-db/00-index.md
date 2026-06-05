Status: done
Last updated: 2026-06-05

# Menu Admin DB

## Goal

Add database-backed menu management for admins, including local image upload through Supabase Storage, availability toggles for sold-out dishes, and a clearer mobile admin booking review layout.

## Active Plan

- `plan/menu-admin-db/01-menu-admin-db-and-responsive.md`

## Scope

Allowed:
- Supabase migration for `menu_items` and `menu-images` storage policies.
- Frontend service and page changes for menu loading, admin editing, image upload, and sold-out display.
- Admin navigation and CSS responsive improvements for booking review and menu management.

Not allowed:
- Permanent dish deletion.
- Payment, auth, booking schema, or destructive data migration changes outside admin menu needs.
- New production dependencies.

## Notes

User decisions:
- Admin should only mark sold out / available, not permanently delete dishes.
- Admin can upload images from local machine to Supabase Storage.
- Sold-out dishes remain visible to customers with dimmed styling and a clear label.
- Improve admin booking approval readability on mobile.

## Evidence

- `node --check` passed for changed JS files.
- Local server started at `http://127.0.0.1:5500/`.
- Playwright checked `/thuc-don` desktop and mobile: no horizontal overflow.
- Playwright checked `/admin?tab=bookings` mobile through a fake local admin session for UI only: panel rendered, no horizontal overflow.
- Playwright checked `/admin?tab=menu` mobile through a fake local admin session for UI only: panel/form/toolbar rendered, no horizontal overflow.
