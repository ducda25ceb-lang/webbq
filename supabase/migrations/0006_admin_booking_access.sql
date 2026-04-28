drop policy if exists "Admin can view all bookings" on public.bookings;
drop policy if exists "Admin can update all bookings" on public.bookings;
drop policy if exists "Admin can delete bookings" on public.bookings;

create policy "Admin can view all bookings"
  on public.bookings
  for select
  to authenticated
  using (lower(auth.jwt() ->> 'email') = 'ducanh12082007dn@gmail.com');

create policy "Admin can update all bookings"
  on public.bookings
  for update
  to authenticated
  using (lower(auth.jwt() ->> 'email') = 'ducanh12082007dn@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'ducanh12082007dn@gmail.com');

create policy "Admin can delete bookings"
  on public.bookings
  for delete
  to authenticated
  using (lower(auth.jwt() ->> 'email') = 'ducanh12082007dn@gmail.com');
