-- Consumer delivery address. Deliberately a separate table from
-- farm_locations rather than a shared/renamed one — farmer and consumer
-- location data are kept conceptually and structurally independent, even
-- though the columns happen to look similar today.
--
-- unique(profile_id): one delivery address per consumer for now. Multiple
-- saved addresses isn't in scope for this build.
create table public.delivery_locations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  address_line text not null,
  state text,
  lga text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  unique (profile_id)
);

-- Same rationale as farm_locations' geography column (phase 1/2): cheap to
-- add now, nullable and unused by the app until proximity-based farmer
-- matching exists.
create extension if not exists postgis with schema extensions;

alter table public.delivery_locations
add column geolocation extensions.geography (point, 4326);

alter table public.delivery_locations enable row level security;

create policy "delivery_locations_select_own" on public.delivery_locations for select
using (auth.uid () = profile_id);

create policy "delivery_locations_insert_own" on public.delivery_locations for insert
with check (auth.uid () = profile_id);

create policy "delivery_locations_update_own" on public.delivery_locations
for update
using (auth.uid () = profile_id)
with check (auth.uid () = profile_id);
