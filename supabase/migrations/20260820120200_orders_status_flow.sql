-- Farmer-side build (app spec section 10). The checkout/order-creation
-- phase was never built (orders has zero real rows, no status flow, and no
-- farmer write policy — see the "orders_insert_household"/"orders_update_
-- household" comments in 20260817161500_orders.sql), so this migration adds
-- the staged status flow the Order Detail screen needs, from scratch:
--
--   pending -> preparing -> ready_for_pickup | out_for_delivery -> delivered
--
-- (plus a terminal 'cancelled', not currently reachable from any UI, kept
-- only so the column's allowed values are documented in one place).
--
-- Which of ready_for_pickup/out_for_delivery applies depends on
-- fulfillment_type ('pickup' vs 'delivery'), matching the two labels the
-- Order Detail mockup shows on a single third stage.
alter table public.orders
add constraint orders_status_check check (
  status in (
    'pending',
    'preparing',
    'ready_for_pickup',
    'out_for_delivery',
    'delivered',
    'cancelled'
  )
);

-- The farmer can advance status but can NEVER set it to 'delivered'
-- themselves — that's reserved for the household's own confirmation (the
-- escrow/release logic referenced in the app spec), enforced here at the
-- RLS layer via `with check`, not just in client UI.
create policy "orders_update_farmer_advance_only" on public.orders
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
  and status <> 'delivered'
);
