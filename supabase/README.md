# Supabase Setup

Use this folder to create the backend for Ember BBQ.

## What this scaffold includes

- `migrations/0001_init.sql`: creates `bookings`, `menu_comments`, `contact_requests` and row-level security policies.

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
