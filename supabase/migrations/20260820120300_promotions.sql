-- Farmer-side build (app spec sections 1 & 5): Insights & Growth's "Active
-- promotions" card and "Create a promotion" form.
create table public.promotions (
  id uuid primary key default gen_random_uuid (),
  product_id uuid not null references public.products (id) on delete cascade,
  discount_percent integer not null check (discount_percent > 0 and discount_percent <= 100),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.promotions enable row level security;

-- Public read (mirrors products' own public-read pattern) so a browsing
-- household can eventually see "20% OFF" tags on listings; the farmer-only
-- write policies below are the actual access control the spec asks for.
create policy "promotions_select_all" on public.promotions for select
using (true);

create policy "promotions_insert_own" on public.promotions for insert
with check (
  product_id in (
    select p.id
    from public.products p
    join public.farmer_profiles fp on fp.id = p.farmer_id
    where fp.profile_id = auth.uid ()
  )
);

create policy "promotions_update_own" on public.promotions
for update
using (
  product_id in (
    select p.id
    from public.products p
    join public.farmer_profiles fp on fp.id = p.farmer_id
    where fp.profile_id = auth.uid ()
  )
)
with check (
  product_id in (
    select p.id
    from public.products p
    join public.farmer_profiles fp on fp.id = p.farmer_id
    where fp.profile_id = auth.uid ()
  )
);

create policy "promotions_delete_own" on public.promotions for delete
using (
  product_id in (
    select p.id
    from public.products p
    join public.farmer_profiles fp on fp.id = p.farmer_id
    where fp.profile_id = auth.uid ()
  )
);
