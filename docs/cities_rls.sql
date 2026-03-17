-- Enable RLS on public.cities (reference table for city search).
-- Policy: allow read (SELECT) for all; no insert/update/delete from API.

alter table public.cities enable row level security;

drop policy if exists "cities_select_public" on public.cities;
create policy "cities_select_public"
  on public.cities
  for select
  to public
  using (true);
