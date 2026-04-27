alter table public.menu_comments
  add column if not exists rating integer not null default 5
  check (rating between 1 and 5);
