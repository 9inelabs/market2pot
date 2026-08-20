-- Farmer-side build (app spec section 12). Notifications tab: real query,
-- grouped Today/Earlier by created_at, marked read on tap.
--
-- Rows are only ever written by triggers (SECURITY DEFINER, below and in
-- 20260820120400_reviews.sql for new_review) — there is deliberately no
-- insert policy for `authenticated`, since a client should never be able to
-- fabricate its own notification.
create table public.notifications (
  id uuid primary key default gen_random_uuid (),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('new_order', 'low_stock', 'new_review', 'verification')),
  title text not null,
  body text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications for select
using (profile_id = auth.uid ());

create policy "notifications_update_own" on public.notifications
for update
using (profile_id = auth.uid ())
with check (profile_id = auth.uid ());

create index notifications_profile_id_created_at_idx on public.notifications (profile_id, created_at desc);

-- Fan-out: a new order notifies the farmer. SECURITY DEFINER because the
-- inserting session is the household's.
create function public.notify_farmer_new_order() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  household_name text;
  farmer_profile_id uuid;
begin
  select full_name into household_name from public.profiles where id = new.household_id;
  select profile_id into farmer_profile_id from public.farmer_profiles where id = new.farmer_id;

  if farmer_profile_id is not null then
    insert into public.notifications (profile_id, type, title, body)
    values (
      farmer_profile_id,
      'new_order',
      'New order from ' || coalesce(household_name, 'a household'),
      ''
    );
  end if;
  return new;
end;
$$;

create trigger orders_notify_farmer_new_order
after insert on public.orders
for each row execute function public.notify_farmer_new_order();

-- Fan-out: a product crossing at/under its low-stock threshold notifies the
-- farmer — only on the crossing edge (was above, now at-or-under), not on
-- every subsequent update while it stays low, to avoid spamming the same
-- listing repeatedly.
create function public.notify_farmer_low_stock() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  farmer_profile_id uuid;
  was_low boolean;
  is_low boolean;
begin
  was_low := old.low_stock_threshold is not null and old.quantity_available <= old.low_stock_threshold;
  is_low := new.low_stock_threshold is not null and new.quantity_available <= new.low_stock_threshold;

  if is_low and not was_low then
    select profile_id into farmer_profile_id from public.farmer_profiles where id = new.farmer_id;
    if farmer_profile_id is not null then
      insert into public.notifications (profile_id, type, title, body)
      values (farmer_profile_id, 'low_stock', new.name || ' is running low on stock', '');
    end if;
  end if;
  return new;
end;
$$;

create trigger products_notify_farmer_low_stock
after update on public.products
for each row execute function public.notify_farmer_low_stock();
