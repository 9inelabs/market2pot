-- Marketplace shell (app spec section 1/7): a user's `role` (set once at
-- signup, unchanged) still decides which onboarding flow they take, but
-- capability is no longer fixed to it — a consumer can later add farmer
-- capability via "Register as a farmer" without losing their household
-- identity, and a farmer can browse as a household too. `active_view`
-- tracks which tab set/home screen is currently shown, independent of how
-- the account originally signed up.
--
-- Named `profile_view` (not `active_view`) to avoid a type/column name
-- collision — Postgres allows it, but it reads confusingly in every query.
create type public.profile_view as enum ('household', 'farmer');

alter table public.profiles
add column active_view public.profile_view;

-- Backfill: every existing row gets a starting view matching their
-- signup role (farmer -> farmer, consumer -> household). Rows with no role
-- yet (still mid-signup) default to household — harmless, since verify.tsx
-- sets this properly alongside role moments later in the same flow, before
-- any screen that reads active_view is ever reached.
update public.profiles
set active_view = case
  when role = 'farmer' then 'farmer'::public.profile_view
  else 'household'::public.profile_view
end
where active_view is null;
