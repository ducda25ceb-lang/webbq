# Supabase Setup

Use this folder to create the backend for Ember BBQ.

## What this scaffold includes

- `migrations/0001_init.sql`: creates `bookings`, `menu_comments`, `contact_requests` and row-level security policies.
- `migrations/0002_booking_slot_conflict.sql`: blocks duplicate time slots for the same date.
- `migrations/0003_booking_confirmation_email.sql`: adds timestamps for the post-QR confirmation email flow.
- `migrations/0004_booking_cancellation.sql`: releases booked slots again after a customer cancellation with lost deposit.
- `migrations/0005_menu_comment_rating.sql`: adds a 1-5 star rating to menu comments.
- `functions/send-booking-confirmation`: confirms a booking and sends the confirmation email.

## How to use

### Option 1: Supabase Dashboard SQL Editor

1. Create a new Supabase project.
2. Open the SQL Editor.
3. Paste the content of `migrations/0001_init.sql`.
4. Run the SQL.
5. Copy your project URL and anon key into [index.html](../index.html).

### Option 2: Supabase CLI

If you use the Supabase CLI, place the migration file in the local migrations folder and push it to your project.

## Required tables

The frontend expects these tables:

- `bookings`
  - `booking_code`
  - `user_id`
  - `customer_name`
  - `customer_email`
  - `phone`
  - `booking_date`
  - `booking_time`
  - `guests`
  - `status`
- `menu_comments`
  - `name`
  - `comment_text`
  - `rating`
  - `created_at`
- `contact_requests`
  - `name`
  - `email`
  - `message`
  - `created_at`

## Important

- Keep RLS enabled.
- Only authenticated users should be able to insert and read their own bookings.
- Menu comments are public read/write (anon + authenticated).
- Contact requests are insertable by everyone and readable by authenticated users.
- The frontend already falls back to mock data when Supabase is not configured.

## Google Login And Account Linking

The frontend uses Supabase OAuth for Google login. Users do not type their Google email or password into the app. They click the Google button, complete Google's consent screen, and Supabase creates or reuses the same auth user.

To enable it:

1. In Supabase Dashboard, open Authentication > Providers.
2. Enable Google and paste the Google OAuth Client ID and Client Secret.
3. In Google Cloud Console, add this authorized redirect URI:
   `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
4. In Supabase Authentication > URL Configuration, add your local and deployed site URLs.
   Example local URL: `http://localhost:3000`
5. Return to the app and use "Đăng ký với Google" or "Tiếp tục với Google".

If a user already has an email/password account, the dashboard shows a "Liên kết Google" button. That calls `supabase.auth.linkIdentity({ provider: "google" })` so the same Supabase user can sign in with Google later.

## Booking Confirmation Email

The QR completion button now calls the `send-booking-confirmation` Edge Function.
The QR image itself can remain a static asset on the frontend. The email flow is separate from how you host or embed the QR image.

Set these secrets before deploying the function:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `BOOKING_FROM_EMAIL`

Suggested deploy flow with Supabase CLI:

```bash
supabase secrets set SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... RESEND_API_KEY=... BOOKING_FROM_EMAIL=...
supabase functions deploy send-booking-confirmation
```

The function:

- validates the logged-in user
- loads the matching booking by `booking_code`
- updates the booking status to `Đã xác nhận`
- sends the email via Resend
- stores `confirmation_email_sent_at` so repeated clicks do not resend duplicates

## Booking Cancellation

Customers can cancel a booking from the dashboard. The booking is marked as `Đã hủy - mất cọc`.

Apply `0004_booking_cancellation.sql` so that:

- cancelled bookings no longer block their old time slot
- `get_booked_slots` ignores cancelled bookings
- the released time slot can be booked again
