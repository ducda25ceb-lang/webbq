Status: done
Last updated: 2026-06-05

# Menu Admin DB And Responsive

## Context Packet

Current menu data is static in `src/data/mockData.js`. `MenuPage` reads `featuredDishes`, `drinkSpecials`, `popularDishIds`, and categories from that file. Supabase is already configured through `src/lib/supabase.js`; comments, bookings, and contact requests use database tables. Admin UI lives in `src/pages/AdminPage.js`, with tabs controlled by `?tab=` and nav links in `src/components/Navbar.js`.

Relevant files:
- `src/pages/MenuPage.js`: customer menu, filters, dish cards, comments.
- `src/pages/AdminPage.js`: admin dashboard, bookings, contacts.
- `src/components/Navbar.js`: admin tab navigation.
- `src/data/mockData.js`: fallback dishes/categories.
- `src/lib/supabase.js`: Supabase client/config.
- `styles/pages.css`, `styles/components.css`: menu/admin layout.
- `supabase/migrations/`: add next migration.

## Scope

Allowed:
- Create `menu_items` table and `menu-images` storage bucket/policies.
- Seed current dishes and drinks into `menu_items`.
- Add client helper functions for loading/saving/toggling menu items and uploading images.
- Add Admin `Thực đơn` tab with edit form, image picker/upload, search/filter, and availability toggles.
- Update Menu page to load DB data when configured, fallback to static data when unavailable.
- Improve mobile booking review card readability.

Not allowed:
- Permanent delete action.
- Adding npm dependencies.
- Changing booking/payment business rules.

## Invariants

- App must still run as static ES modules via CDN.
- If Supabase is not configured or DB is missing, public menu still works from mock data.
- Sold-out dishes stay visible to customers.
- Admin-only menu mutations rely on existing admin auth/RLS policy.

## Risk Register

- Storage RLS may differ across Supabase project settings; provide migration policy and keep frontend error messages clear.
- Existing project may not have run all migrations; menu loading must gracefully fallback.
- Admin page is large; keep changes scoped and avoid rewiring unrelated booking/contact behavior.

## Approach

1. Add migration `0010_menu_items_admin_storage.sql`.
2. Add `src/services/menuService.js`.
3. Update customer `MenuPage` to use service data, sold-out styling, and fallback.
4. Update `AdminPage` with menu tab, form, image upload, save/toggle actions.
5. Update `Navbar` admin tabs.
6. Add CSS for menu admin, sold-out customer cards, and clearer mobile booking cards.
7. Verify with static syntax check and browser at desktop/mobile.

## Estimated Diff Size

Large: about 1000+ changed lines. Amended after implementation because `AdminPage.js` is a single large ES-module view and the menu manager UI was added inline to match the existing local pattern.

## Acceptance Criteria

- Admin can view menu items, edit fields, create a new item, upload image from local file, and mark item sold out/available.
- No permanent delete button exists.
- Public menu uses DB items when available and falls back to mock data.
- Sold-out item remains visible, dimmed, with “Hết món”.
- Admin booking review is easier to read on mobile with grouped details/actions and no horizontal overflow.

## Edge Cases / Error Paths

- Supabase not configured: menu page uses mock data; admin menu tab shows setup warning.
- Upload fails: keep form data, show error, allow manual `image_url`.
- Missing `menu_items` table: fallback on public menu; admin shows error.
- Long names/emails/payment codes wrap without breaking layout.

## Regression Map

- Public menu filters/search/quick tags.
- Menu comments load/save behavior.
- Admin booking approval/cancel flow.
- Admin contact reply flow.
- Navbar admin tab navigation.

## Verification Contract

- Run static parse/import check over changed JS files.
- Start local server.
- Browser check `/thuc-don`, `/admin?tab=bookings`, and `/admin?tab=menu` at desktop and mobile if possible.
- Check no mobile horizontal overflow.

## Red Flags

- Need for destructive database operation.
- Need to add dependency.
- Auth/payment behavior unexpectedly changes.
- Browser cannot load app after JS changes.

## Evidence

- Added migration `supabase/migrations/0010_menu_items_admin_storage.sql` for `menu_items`, seed data, and `menu-images` storage policies.
- Added `src/services/menuService.js`.
- Updated `MenuPage`, `AdminPage`, `Navbar`, `styles/components.css`, and `styles/pages.css`.
- `node --check src\services\menuService.js` passed.
- `node --check src\pages\MenuPage.js` passed.
- `node --check src\pages\AdminPage.js` passed.
- `node --check src\components\Navbar.js` passed.
- Playwright `/thuc-don` desktop 1280x720: rendered 8 menu cards, no horizontal overflow.
- Playwright `/thuc-don` mobile 390x844: rendered 8 menu cards, no horizontal overflow.
- Playwright `/admin?tab=menu` mobile 390x844 with fake local admin session for UI inspection: menu panel/form/toolbar rendered, no horizontal overflow.
- Playwright `/admin?tab=bookings` mobile 390x844 with fake local admin session for UI inspection: booking panel rendered, no horizontal overflow.
- Follow-up workflow pass: Playwright `/admin?tab=menu` mobile 390x844 confirmed workflow steps, form section titles, field labels, list heading, and no horizontal overflow.
- Follow-up workflow pass: Playwright `/admin?tab=menu` desktop 1280x720 confirmed workflow/form/toolbar render and no horizontal overflow.

## Iteration Log

- 2026-06-05: Plan created from user decisions.
- 2026-06-05: Implemented DB-backed menu service, admin menu management, sold-out customer cards, and mobile admin readability changes.
- 2026-06-05: Verification passed locally. Supabase write/read could not be fully authenticated in local browser because Playwright used a fake admin session for UI-only inspection; database policies are represented in migration.
- 2026-06-05: Improved admin menu workflow after user feedback: added three-step workflow state, clearer editing context, visible form labels/sections, selected item state, and clearer list heading.
