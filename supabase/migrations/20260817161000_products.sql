-- Marketplace shell (app spec section 1). Product listings, created now
-- even though checkout/cart/orders are a later phase, per the explicit
-- instruction to avoid painful migrations once real data depends on this.
create table public.products (
  id uuid primary key default gen_random_uuid (),
  farmer_id uuid not null references public.farmer_profiles (id) on delete cascade,
  name text not null,
  category text not null,
  price numeric not null,
  unit text not null,
  quantity_available numeric not null default 0,
  harvest_date date,
  photo_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

-- Public read only for available listings — a farmer can still see their
-- own unavailable/archived listings (needed for the My Listings screen's
-- availability toggle to show the full list, not just what's live).
create policy "products_select_available_or_own" on public.products for select
using (
  is_available = true
  or farmer_id in (
    select id from public.farmer_profiles where profile_id = auth.uid ()
  )
);

create policy "products_insert_own" on public.products for insert
with check (
  farmer_id in (
    select id from public.farmer_profiles where profile_id = auth.uid ()
  )
);

create policy "products_update_own" on public.products
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

-- Unlike most tables in this project, products DOES get a delete policy —
-- the spec explicitly calls for a real delete/archive action on My Listings
-- (with a confirmation prompt client-side), not just an availability toggle.
create policy "products_delete_own" on public.products for delete
using (
  farmer_id in (
    select id from public.farmer_profiles where profile_id = auth.uid ()
  )
);
