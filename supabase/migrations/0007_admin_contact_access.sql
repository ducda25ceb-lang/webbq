drop policy if exists "Authenticated users can view contact requests" on public.contact_requests;
drop policy if exists "Admin can view contact requests" on public.contact_requests;

create policy "Admin can view contact requests"
  on public.contact_requests
  for select
  to authenticated
  using (lower(auth.jwt() ->> 'email') = 'ducanh12082007dn@gmail.com');
