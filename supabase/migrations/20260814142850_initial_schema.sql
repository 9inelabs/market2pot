-- Onboarding/auth data model (build spec section 6).
-- Three tables: profiles, farm_locations, bank_accounts. RLS is mandatory on
-- all three and is the real security boundary — client-side role checks are
-- UX only.

create type public.user_role as enum ('farmer', 'consumer');

create type public.onboarding_step as enum (
  'role_pending',
  'identity_pending',
  'location_pending',
  'bank_pending',
  'complete'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role,
  full_name text,
  date_of_birth date,
  avatar_url text,
  phone text not null,
  step public.onboarding_step not null default 'role_pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.farm_locations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  address_line text not null,
  state text,
  lga text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  bank_code text not null,
  bank_name text not null,
  account_number text not null,
  resolved_account_name text not null,
  name_match_score numeric not null,
  verification_status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (profile_id)
);

-- Proximity search ("farmers near you") is inevitable per the build spec, and
-- backfilling coordinates later is painful — so a geography column is added
-- now, nullable and unused by the app until that feature exists. latitude/
-- longitude above remain the columns the app actually reads/writes today.
create extension if not exists postgis with schema extensions;

alter table public.farm_locations
  add column geolocation extensions.geography (point, 4326);

-- Keeps profiles.updated_at honest — without this trigger the column would
-- only ever reflect insert time, never actual updates.
create function public.set_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at ();

-- Auto-creates a profiles row when a new auth.users row appears, so the app
-- never has to do that insert itself from the client.
create function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users for each row
  execute function public.handle_new_user ();

-- Row Level Security -----------------------------------------------------
-- Baseline for all three tables: a user can only select/insert/update rows
-- they own (profile_id = auth.uid(), or id = auth.uid() on profiles itself).
-- No delete policies are defined — delete stays fully blocked for everyone
-- except via the service role, which bypasses RLS. That's deliberate: the
-- spec only calls for select/insert/update.
--
-- bank_accounts deliberately has NO policy letting a consumer read a
-- farmer's bank details, even though checkout will eventually need that.
-- Per spec section 6: expose bank_name/account_number/resolved_account_name
-- to a consumer only for a farmer they have an active order with, and never
-- name_match_score or verification_status — via a restricted view or an
-- Edge Function scoped to a specific order, not a blanket public-read
-- policy. Checkout is out of scope for this migration; this is flagged, not
-- implemented.

alter table public.profiles enable row level security;
alter table public.farm_locations enable row level security;
alter table public.bank_accounts enable row level security;

create policy "profiles_select_own" on public.profiles for select
using (auth.uid () = id);

create policy "profiles_insert_own" on public.profiles for insert
with check (auth.uid () = id);

create policy "profiles_update_own" on public.profiles
for update
using (auth.uid () = id)
with check (auth.uid () = id);

create policy "farm_locations_select_own" on public.farm_locations for select
using (auth.uid () = profile_id);

create policy "farm_locations_insert_own" on public.farm_locations for insert
with check (auth.uid () = profile_id);

create policy "farm_locations_update_own" on public.farm_locations
for update
using (auth.uid () = profile_id)
with check (auth.uid () = profile_id);

create policy "bank_accounts_select_own" on public.bank_accounts for select
using (auth.uid () = profile_id);

create policy "bank_accounts_insert_own" on public.bank_accounts for insert
with check (auth.uid () = profile_id);

create policy "bank_accounts_update_own" on public.bank_accounts
for update
using (auth.uid () = profile_id)
with check (auth.uid () = profile_id);
