-- Farmer-side build (app spec sections 1 & 5): Insights & Growth's rating
-- average/count/latest-comment card, and the "View all reviews" list.
-- Household-side review submission UI is out of scope for this build, but
-- the table/RLS is complete so that phase doesn't need its own migration.
create table public.reviews (
  id uuid primary key default gen_random_uuid (),
  order_id uuid not null references public.orders (id) on delete cascade,
  farmer_id uuid not null references public.farmer_profiles (id) on delete cascade,
  household_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

-- Public read — Insights & Growth's average/count reads this as the farmer,
-- but a farmer's aggregate rating is also meant to be visible to browsing
-- households (mirrors farmer_profiles' own public-read policy).
create policy "reviews_select_all" on public.reviews for select
using (true);

create policy "reviews_insert_household_own_order" on public.reviews for insert
with check (
  household_id = auth.uid ()
  and exists (
    select 1 from public.orders
    where orders.id = order_id
      and orders.household_id = auth.uid ()
      and orders.farmer_id = farmer_id
  )
);

-- No update/delete policy — reviews are permanent once left, same
-- reasoning the project already applies to most tables (bank_accounts,
-- account_resolution_attempts, ...).

create index reviews_farmer_id_idx on public.reviews (farmer_id);

-- Fan-out: a new review notifies the farmer. SECURITY DEFINER because the
-- inserting session is the household's, which has no write access to a
-- notifications row owned by the farmer's profile_id.
create function public.notify_farmer_new_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  reviewer_name text;
  farmer_profile_id uuid;
begin
  select full_name into reviewer_name from public.profiles where id = new.household_id;
  select profile_id into farmer_profile_id from public.farmer_profiles where id = new.farmer_id;

  if farmer_profile_id is not null then
    insert into public.notifications (profile_id, type, title, body)
    values (
      farmer_profile_id,
      'new_review',
      coalesce(reviewer_name, 'Someone') || ' left a ' || new.rating || '-star review',
      coalesce(new.comment, '')
    );
  end if;
  return new;
end;
$$;

create trigger reviews_notify_farmer
after insert on public.reviews
for each row execute function public.notify_farmer_new_review();
