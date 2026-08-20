-- Farmer-side build (app spec sections 1 & 6): Business Settings' delivery
-- zones & fees list.
create table public.delivery_zones (
  id uuid primary key default gen_random_uuid (),
  farmer_id uuid not null references public.farmer_profiles (id) on delete cascade,
  zone_name text not null,
  fee numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.delivery_zones enable row level security;

-- Public read — a household choosing a farmer needs to see delivery fees
-- before ordering, even though creating/editing zones is farmer-only.
create policy "delivery_zones_select_all" on public.delivery_zones for select
using (true);

create policy "delivery_zones_insert_own" on public.delivery_zones for insert
with check (
  farmer_id in (
    select id from public.farmer_profiles where profile_id = auth.uid ()
  )
);

create policy "delivery_zones_update_own" on public.delivery_zones
for update
using (
  farmer_id in (
    select id from public.farmer_profiles where profile_id = auth.uid ()
  )
)
with check (
  farmer_id in (
    select id from public.farmer_profiles where profile_id = auth.uid ()
  )
);

create policy "delivery_zones_delete_own" on public.delivery_zones for delete
using (
  farmer_id in (
    select id from public.farmer_profiles where profile_id = auth.uid ()
  )
);
