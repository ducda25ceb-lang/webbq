# Ember BBQ Frontend

Single-page frontend for Ember BBQ restaurant with menu browsing, booking flow, contact page, media page, and a protected dashboard route.

## Tech Stack

- React 18 (ES Modules via CDN)
- React Router 6 (HashRouter)
- Supabase for auth and booking storage when configured
- Vanilla CSS (modular style files in `styles/`)

## Project Structure

- `index.html`: app shell and global style imports
- `src/main.js`: app bootstrap and router/auth providers
- `src/App.js`: route configuration and layout shell
- `src/components/`: reusable UI components
- `src/pages/`: page-level views
- `src/context/`: authentication context
- `src/data/`: mock data source
- `styles/`: variables, base, component, page, animation styles
- `assets/videos/`: static media assets

## Run Locally

Because this project uses ES modules in browser, run it with a local static server.

Example with VS Code Live Server:

1. Open `D:\frontend-bbq-test` as the VS Code folder.
2. Right-click `index.html`.
3. Choose `Open with Live Server`.
4. Open `http://127.0.0.1:5500/#/dang-nhap?mode=login`.

The workspace includes `.vscode/settings.json`, so Live Server uses the project root and port `5500`.

Example with the built-in Python static server:

```bash
npm run dev
```

Then open `http://127.0.0.1:5500/`.

## Supabase Setup

The app reads Supabase credentials from `index.html` through `window.__SUPABASE_CONFIG__`.

Replace the placeholder values with your project URL and anon key:

```html
<script>
  window.__SUPABASE_CONFIG__ = {
    url: "https://YOUR_PROJECT_ID.supabase.co",
    anonKey: "YOUR_SUPABASE_ANON_KEY",
  };
</script>
```

Recommended tables:

- `bookings`: `booking_code`, `user_id`, `customer_name`, `customer_email`, `phone`, `booking_date`, `booking_time`, `guests`, `status`
- `menu_comments`: `name`, `comment_text`, `created_at`
- `contact_requests`: `name`, `email`, `message`, `created_at`

Suggested row-level security policies:

- Allow authenticated users to insert into `bookings`.
- Allow authenticated users to select only rows where `user_id = auth.uid()`.
- Allow anon/authenticated users to select and insert `menu_comments`.
- Allow anon/authenticated users to insert `contact_requests`.

The matching SQL scaffold lives in [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) and setup notes are in [supabase/README.md](supabase/README.md).

## Routing Notes

- Routing is configured with `HashRouter`.
- Main routes include:
  - `/`
  - `/thuc-don`
  - `/lien-he`
  - `/dat-ban`
  - `/video`
  - `/dang-nhap`
  - `/dashboard` (protected)

## Repository Conventions

- Keep source files in plain ES module format.
- Keep styles split by concern (`base`, `components`, `pages`, `animations`, `variables`).
- Use meaningful commit messages for each change set.

## Author

Created and maintained by ducda25ceb-lang.
