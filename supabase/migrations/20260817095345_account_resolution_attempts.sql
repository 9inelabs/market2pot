-- Server-side rate limiting for the resolve-account Edge Function (spec
-- section 8.1: "Rate-limit per user (10/hour) — this endpoint is an
-- account-enumeration vector"). RLS-scoped (owner-only select/insert) so
-- the Edge Function can enforce this using the calling user's own JWT via
-- ctx.supabase, without needing service-role access at all.
create table public.account_resolution_attempts (
  id uuid primary key default gen_random_uuid (),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.account_resolution_attempts enable row level security;

create policy "account_resolution_attempts_select_own" on public.account_resolution_attempts for select
using (auth.uid () = profile_id);

create policy "account_resolution_attempts_insert_own" on public.account_resolution_attempts for insert
with check (auth.uid () = profile_id);
