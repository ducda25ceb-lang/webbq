create or replace function public.get_booked_slots(target_date date)
returns table (booking_time text)
language sql
security definer
set search_path = public
as $$
  select distinct b.booking_time
  from public.bookings b
  where b.booking_date = target_date
  order by b.booking_time;
$$;

revoke all on function public.get_booked_slots(date) from public;
grant execute on function public.get_booked_slots(date) to anon, authenticated;

create unique index if not exists bookings_unique_slot_idx
  on public.bookings (booking_date, booking_time);
