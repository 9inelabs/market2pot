-- Marketplace shell (app spec section 1). A farmer_profiles row is what
-- grants farmer capability — presence of this row (not `profiles.role`) is
-- the real gate the app checks before showing farmer screens/tabs.
--
-- Deliberately has NO bank/verification columns of its own. bank_accounts
-- already stores bank_name/account_number/resolved_account_name/
-- verification_status, live-verified against Paystack (see the farmer
-- signup phase report) — duplicating those fields here would create two
-- bank-detail stores for the same farmer that could drift out of sync.
-- "Verified farmer" is computed by joining bank_accounts.verification_status
-- at query time, the same inference review-profile.tsx already makes.
create table public.farmer_profiles (
  id uuid primary key default gen_random_uuid (),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  farm_name text not null,
  bio text,
  created_at timestamptz not null default now()
);

alter table public.farmer_profiles enable row level security;

-- Publicly readable — browsing farmer profiles/cards doesn't require an
-- existing relationship with that farmer.
create policy "farmer_profiles_select_all" on public.farmer_profiles for select
using (true);

create policy "farmer_profiles_insert_own" on public.farmer_profiles for insert
with check (auth.uid () = profile_id);

create policy "farmer_profiles_update_own" on public.farmer_profiles
for update
using (auth.uid () = profile_id)
with check (auth.uid () = profile_id);

-- Backfill: existing users who already completed the full farmer signup
-- flow (role = 'farmer', step = 'complete') get a farmer_profiles row now,
-- so they land in Farmer Home instead of appearing farmer-less. No distinct
-- "farm name" was ever collected in that flow — full_name is the only real
-- data available, so it's used as a placeholder farm_name. Farmers can
-- rename it later via Settings' Edit Profile.
insert into public.farmer_profiles (profile_id, farm_name)
select id, full_name
from public.profiles
where
  role = 'farmer'
  and step = 'complete'
  and full_name is not null
on conflict (profile_id) do nothing;
