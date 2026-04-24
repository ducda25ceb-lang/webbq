alter table public.bookings
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmation_email_sent_at timestamptz;

update public.bookings
set confirmed_at = coalesce(confirmed_at, updated_at, created_at)
where status = 'Đã xác nhận'
  and confirmed_at is null;

create index if not exists bookings_confirmation_email_sent_at_idx
  on public.bookings (confirmation_email_sent_at);
