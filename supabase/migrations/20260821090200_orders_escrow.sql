-- Consumer-side build. Adds the escrow bookkeeping columns and the
-- "Packaged" stage, and hardens orders' write surface now that status and
-- payment_status are escrow-critical (they gate a real money transfer).
alter table public.orders add column farmer_confirmed_at timestamptz;
alter table public.orders add column household_confirmed_at timestamptz;
alter table public.orders add column paystack_recipient_code text;

alter table public.orders drop constraint orders_status_check;
alter table public.orders
add constraint orders_status_check check (
  status in (
    'pending',
    'preparing',
    'packaged',
    'ready_for_pickup',
    'out_for_delivery',
    'delivered',
    'cancelled'
  )
);

alter table public.orders
add constraint orders_payment_status_check check (
  payment_status in ('pending', 'paid_held', 'released', 'refund_pending', 'refunded')
);

-- Order creation moves entirely into the new initialize-checkout Edge
-- Function (service role) — subtotal/total/delivery-fee/promotion-discount
-- math has to happen server-side, not be trusted from a client-supplied
-- INSERT payload, now that a real payment is calculated from these numbers.
drop policy "orders_insert_household" on public.orders;

-- Household no longer has any legitimate direct-UPDATE need on orders — an
-- order is created via initialize-checkout (service role), paid via the
-- Paystack webhook (service role), and "Product Received" goes through
-- confirm-order-received (service role, checks both confirmation columns
-- before ever touching payment_status). Leaving a general household UPDATE
-- policy in place would let a household set status/payment_status directly
-- via a raw client write, bypassing the escrow logic entirely — so it's
-- dropped rather than narrowed.
drop policy "orders_update_household" on public.orders;

-- The farmer's own "advance" policy (pending -> preparing -> packaged ->
-- ready/out) still applies directly from the client, but now also blocks
-- 'cancelled' in addition to 'delivered' — cancellation goes through the new
-- cancel-order Edge Function instead, since it has real side effects
-- (refund-request notification, payment_status transition) that a bare
-- status write would silently skip.
drop policy "orders_update_farmer_advance_only" on public.orders;
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
  and status not in ('delivered', 'cancelled')
);

-- Column-level hardening (see 20260814151656_bank_accounts_column_grants_fix.sql
-- for why this has to be a full revoke + selective re-grant, not a
-- column-specific revoke alone — a table-wide grant otherwise still applies).
-- `status` is the only column any client-side RLS-gated write ever needs to
-- touch now (the farmer's advance action); every escrow-sensitive column
-- (payment_status, farmer_confirmed_at, household_confirmed_at,
-- paystack_recipient_code) is service-role-only.
revoke
update on public.orders
from authenticated;

grant
update (status) on public.orders to authenticated;

-- order_items' pricing (unit_price/line_total) has to be server-computed for
-- the same reason as orders' totals above — drops the client-INSERT policy
-- now that initialize-checkout (service role) is the only path that creates
-- order_items rows.
drop policy "order_items_insert_via_own_order" on public.order_items;

