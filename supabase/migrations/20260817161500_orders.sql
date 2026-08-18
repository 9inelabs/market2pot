-- Marketplace shell (app spec section 1). Orders + order_items exist now
-- so the Farmer Home dashboard's stat cards and the Orders tab have a real
-- (currently empty) table to query — checkout/payment/order creation is
-- explicitly a later phase; nothing writes to these tables yet.
create table public.orders (
  id uuid primary key default gen_random_uuid (),
  household_id uuid not null references public.profiles (id) on delete cascade,
  farmer_id uuid not null references public.farmer_profiles (id) on delete cascade,
  status text not null default 'pending',
  fulfillment_type text,
  delivery_address text,
  subtotal numeric not null default 0,
  total numeric not null default 0,
  payment_status text not null default 'pending',
  paystack_reference text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.orders enable row level security;

create policy "orders_select_household_or_farmer" on public.orders for select
using (
  household_id = auth.uid ()
  or farmer_id in (
    select id from public.farmer_profiles where profile_id = auth.uid ()
  )
);

-- Household can read/write their own; farmer can only READ their own (spec
-- section 1) — no farmer update/delete policy, since order status
-- management is the next phase's concern, not this one's.
create policy "orders_insert_household" on public.orders for insert
with check (household_id = auth.uid ());

create policy "orders_update_household" on public.orders
for update
using (household_id = auth.uid ())
with check (household_id = auth.uid ());

create table public.order_items (
  id uuid primary key default gen_random_uuid (),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name_snapshot text not null,
  quantity numeric not null,
  unit_price numeric not null,
  line_total numeric not null
);

alter table public.order_items enable row level security;

-- Scoped via the parent order's ownership — same household-or-farmer rule
-- as orders itself, since order_items has no owner column of its own.
create policy "order_items_select_via_order" on public.order_items for select
using (
  exists (
    select 1
    from public.orders
    where
      orders.id = order_items.order_id
      and (
        orders.household_id = auth.uid ()
        or orders.farmer_id in (
          select id from public.farmer_profiles where profile_id = auth.uid ()
        )
      )
  )
);

create policy "order_items_insert_via_own_order" on public.order_items for insert
with check (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id and orders.household_id = auth.uid ()
  )
);
