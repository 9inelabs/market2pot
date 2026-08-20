-- Consumer-side build. Replaces the local-only useCartStore with a real,
-- persistent cart. One farmer per household's cart at a time (enforced
-- client-side — see useCart.ts's clear-before-switch-farmer logic; the DB
-- itself doesn't need to know about that rule, it just stores line items).
create table public.cart_items (
  id uuid primary key default gen_random_uuid (),
  household_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity numeric not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (household_id, product_id)
);

alter table public.cart_items enable row level security;

create policy "cart_items_select_own" on public.cart_items for select
using (household_id = auth.uid ());

create policy "cart_items_insert_own" on public.cart_items for insert
with check (household_id = auth.uid ());

create policy "cart_items_update_own" on public.cart_items
for update
using (household_id = auth.uid ())
with check (household_id = auth.uid ());

create policy "cart_items_delete_own" on public.cart_items for delete
using (household_id = auth.uid ());
