-- Consumer-side build. Audit trail for escrow disbursements/refunds,
-- separate from `orders` itself so a failed/retried Paystack Transfer
-- doesn't need to overload order columns. Both are written only by service-
-- role Edge Functions (confirm-order-delivered/received and process-refund)
-- — no insert/update policy for `authenticated` on either table.
create table public.payouts (
  id uuid primary key default gen_random_uuid (),
  order_id uuid not null references public.orders (id) on delete cascade,
  farmer_id uuid not null references public.farmer_profiles (id) on delete cascade,
  amount numeric not null,
  paystack_transfer_code text,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.payouts enable row level security;

create policy "payouts_select_own" on public.payouts for select
using (
  farmer_id in (
    select id from public.farmer_profiles where profile_id = auth.uid ()
  )
);

create table public.refunds (
  id uuid primary key default gen_random_uuid (),
  order_id uuid not null references public.orders (id) on delete cascade,
  household_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric not null,
  paystack_transfer_code text,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.refunds enable row level security;

create policy "refunds_select_own" on public.refunds for select
using (household_id = auth.uid ());
