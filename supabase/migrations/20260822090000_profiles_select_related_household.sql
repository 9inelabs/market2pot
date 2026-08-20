-- Fixes a real bug: profiles has always been owner-only SELECT
-- (profiles_select_own, from the initial schema), which silently breaks
-- every embed of `household:profiles(full_name, phone)` a farmer's own
-- queries rely on — useFarmerOrders/useOrderDetail/useConversations/the
-- chat thread's header all read this embed expecting a real name, but
-- PostgREST returns null for a row RLS blocks, not an error, so it never
-- surfaced as a query failure — just a silently wrong "Unknown"/"Household"
-- fallback in the UI.
--
-- Fix: let a farmer read a household's profiles row only when a real
-- business relationship already exists between them (an order or a
-- conversation) — not a blanket public-read policy, since profiles holds
-- PII (phone number) that shouldn't be readable by every farmer for every
-- household regardless of any relationship.
create policy "profiles_select_related_household" on public.profiles for select
using (
  exists (
    select 1
    from public.orders
    join public.farmer_profiles on farmer_profiles.id = orders.farmer_id
    where orders.household_id = profiles.id
      and farmer_profiles.profile_id = auth.uid ()
  )
  or exists (
    select 1
    from public.conversations
    join public.farmer_profiles on farmer_profiles.id = conversations.farmer_id
    where conversations.household_id = profiles.id
      and farmer_profiles.profile_id = auth.uid ()
  )
);
