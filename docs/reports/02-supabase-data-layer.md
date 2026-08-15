# Phase 2 — Supabase Client, Migration, RLS, Auth Store

Supabase client upgrade, the profiles/farm_locations/bank_accounts schema, Row Level
Security with a real cross-user test, and the auth/zustand store.

This report was updated after an initial review requested three fixes before phase 3: a
fuller RLS test (writes, not just reads, plus positive own-row assertions), column-level
protection on `bank_accounts`' verification fields, and a decision on `profiles.phone` for
providers that don't supply a phone number. All three are folded into the sections below;
see "Post-review fixes" for what changed and why, including a real bug caught by the
extended test.

## What was built, by file

**Created**

- `supabase/migrations/20260814142850_initial_schema.sql` — the full schema from build spec
  section 6: `user_role` and `onboarding_step` enums; `profiles`, `farm_locations`,
  `bank_accounts` tables; a `set_updated_at` trigger on `profiles`; a `handle_new_user`
  trigger on `auth.users` that auto-inserts the matching `profiles` row; RLS enabled on all
  three tables with owner-only select/insert/update policies. See "Deviations" for two
  additions not explicitly requested (a PostGIS column, the `updated_at` trigger) and one
  deliberate omission (no consumer-read policy on `bank_accounts`).
- `src/lib/database.types.ts` — generated via `supabase gen types typescript --linked`
  against the live, migrated schema, rather than hand-typed, to avoid drift between the
  migration and the app's types.
- `src/store/useAuthStore.ts` — zustand store exposing `session`, `profile`,
  `initializing`, `loadingProfile`, `fetchProfile()`, `signOut()`. Subscribes to
  `supabase.auth.onAuthStateChange` at module scope and re-fetches the profile whenever the
  signed-in user id changes. Does not implement routing/resume logic — that's phase 5's
  routing gate, which will read this store rather than subscribing to Supabase itself.
- `scripts/test-rls.ts` — standalone RLS test (see "Verification" for output). Extended
  post-review — see "Post-review fixes".
- `supabase/config.toml`, `supabase/.gitignore` — created by `supabase init`.
- `supabase/migrations/20260814145820_profiles_phone_or_email.sql` — post-review fix, see
  below.
- `supabase/migrations/20260814145823_bank_accounts_column_grants.sql` and
  `supabase/migrations/20260814151656_bank_accounts_column_grants_fix.sql` — post-review
  fix and its correction, see below.

**Changed**

- `src/lib/supabase.ts` — added the `AppState` listener that calls
  `supabase.auth.startAutoRefresh()` / `stopAutoRefresh()` on foreground/background, per
  spec section 4.1 ("without this, tokens silently stop refreshing when backgrounded").
  Also now constructed as `createClient<Database>(...)` using the generated types, so every
  query in the app is typed against the real schema.
- `.env.example` — added `SUPABASE_SERVICE_ROLE_KEY` as a documented, blank placeholder,
  with a comment explaining it's server/script-only and must never be `EXPO_PUBLIC_`-prefixed.
- `CLAUDE.md` — added the standing phase-report rule (this report follows it).
- `package.json` — added `zustand`, and devDependencies `tsx` + `dotenv` for running
  standalone scripts like `scripts/test-rls.ts` outside the Expo/Metro bundle.

## Deviations from the spec and why

- **Added a PostGIS `geography(point, 4326)` column on `farm_locations`.** The spec phrased
  this as "consider" rather than mandating it, but explicitly named the reason (proximity
  search is inevitable, backfilling coordinates later is painful) and it's a nullable,
  additive column with no cost to the current app, which still reads/writes `latitude`/
  `longitude` directly. Added the `postgis` extension in the `extensions` schema to support it.
- **Added an `updated_at` auto-update trigger on `profiles`.** The spec's schema includes an
  `updated_at` column but no trigger; without one it would only ever reflect insert time.
  Standard hygiene tied directly to a column the spec already specified, not new scope.
- **RLS test written as a standalone `tsx` script, not a formal test framework.** The spec
  asked for "an actual test" with specific create/select/assert behavior but didn't specify
  jest/vitest, and neither is set up in this project yet. `scripts/test-rls.ts` performs real
  assertions (throws and exits non-zero on failure) against the live database rather than
  eyeballing output, but it's not wired into a test runner or CI. Flagging in case a formal
  test framework should be introduced — that's a decision for a dedicated phase, not
  something to bolt on unilaterally here.
- **Test users authenticate via email+password, not phone+password.** RLS policies only
  check `auth.uid()`, which is identical regardless of which auth provider established the
  session — so email was used to avoid depending on the Phone auth provider being fully
  configured in this brand-new project. A phone number is still set on each test user (via
  `admin.createUser({ phone, ... })`) so the `handle_new_user` trigger's
  `profiles.phone not null` constraint is satisfied, matching the real app's invariant.

## Bugs found and fixed

- **Supabase CLI was authenticated to the wrong account.** `npx supabase projects list`
  initially returned three unrelated projects (`UniPurse`, `supabase-lime-notebook`,
  `sagefinan`) — none matching the project ref in `.env`
  (`gcnwhamvirqtkipeyggm`). `supabase link --project-ref gcnwhamvirqtkipeyggm` failed with a
  privileges error, confirming the authenticated account had no access to the actual
  market2pot project. Stopped and asked rather than linking to any of the unrelated projects
  or guessing at credentials. Resolved when the project owner logged in with the correct
  account; `supabase projects list` then showed `gcnwhamvirqtkipeyggm` as `linked: true`.
- **`supabase db push` emitted a non-fatal Docker warning** ("failed to cache migrations
  catalog... the default daemon configuration on Windows..."). This is about an optional
  local edge-runtime image cache, unrelated to the actual migration push, which completed
  successfully per `supabase migration list --linked` showing the migration recorded on both
  local and remote. No action needed; noting it so it isn't mistaken for a push failure if
  seen again in a later phase.

## Verification: exact commands run and results

- `npx supabase db push --dry-run --linked` → `Would push these migrations:
  20260814142850_initial_schema.sql`.
- `npx supabase db push --linked --yes` → `Finished supabase db push.` (Docker warning noted
  above, non-fatal.)
- `npx supabase migration list --linked` →
  `{"migrations":[{"local":"20260814142850","remote":"20260814142850", ...}]}` — confirms the
  migration is applied and recorded on the remote project.
- `npx supabase gen types typescript --linked` → generated `src/lib/database.types.ts`
  cleanly against the live schema.
- `npx tsc --noEmit` → clean, run twice (after the auth store, and again after the RLS
  script).
- `npx expo-doctor` → `20/20 checks passed. No issues detected!`.
- **RLS test, original read-only version** (`npx tsx scripts/test-rls.ts`, superseded — see
  "Post-review fixes" for the extended version and its output):
  ```
  Creating two throwaway users (user A, user B)...
  Seeding user B's rows via the service role (bypasses RLS by design)...
  Signing in as user A...
  Attempting to read user B's rows as user A (expecting 0 rows each)...
  PASS  profiles: 0 rows returned to user A
  PASS  farm_locations: 0 rows returned to user A
  PASS  bank_accounts: 0 rows returned to user A

  All RLS cross-user checks passed.

  Cleaning up test users...
  ```
  Followed by a one-off `listUsers()` check confirming zero users remained afterward
  (`Total users: 0`) — cleanup ran even though the assertions all passed, but this confirms
  the `finally` block's delete path actually works, not just that it's present in the code.
- **Secret-leak check**: ran `npx expo export -p android` and grepped the compiled `.hbc`
  bundle for a substring of the service role key, and for the literal string `service_role`.
  Both returned zero matches. As a sanity check on the grep methodology itself (confirming
  the bundle isn't simply unsearchable), the same grep for a substring of the anon key
  returned one match. This directly verifies — not just assumes — that the service role key
  never reaches the client bundle, per spec ground rule 2. Test export directory deleted
  afterward.

## Open questions or decisions that had to be guessed

- Whether to formalize a test framework (jest/vitest) for `scripts/test-rls.ts` and future
  tests, versus keeping standalone `tsx` scripts. Left as a standalone script for now;
  flagging for a decision before more tests accumulate.
- Spec section 6's note that consumers must eventually read a farmer's `bank_name`,
  `account_number`, and `resolved_account_name` (never `name_match_score` or
  `verification_status`) for an active order was explicitly deferred by the spec itself
  ("flag this rather than implementing it now") — no policy, view, or Edge Function for it
  exists yet. Restating here since it's a real gap until checkout is built.
- **New**: whether to also close the INSERT-time self-verification gap on `bank_accounts`
  (see "Post-review fixes" #2) before or during phase 7, given it requires moving row
  creation to a service-role Edge Function rather than a client-side insert.
- Two items from phase 1 remain open and unaffected by this phase: the logo SVGs are still
  Photoshop rasters, and iOS still has no SF Pro font files.

## Post-review fixes

Three fixes requested before phase 3 began.

### 1. Extended the RLS test to cover writes and own-row access

`scripts/test-rls.ts` previously only checked cross-user SELECT. It now checks, for all
three tables (`profiles`, `farm_locations`, `bank_accounts`):

- Cross-user SELECT, UPDATE, and DELETE each affect 0 rows for user A against user B's rows.
- User A's own-row SELECT returns exactly 1 row, and own-row UPDATE affects exactly 1 row
  with the new value actually persisted — this guards against a policy that blocks
  everything, which would otherwise pass every negative check above trivially.
- A `bank_accounts` self-verify attempt (below) is rejected, and the protected columns are
  confirmed unchanged via the service role afterward.

Cross-user DELETE returns 0 rows, but that's not evidence of ownership-scoped protection by
itself: none of the three tables have a DELETE policy at all (by design — the spec only
calls for select/insert/update), so DELETE is fully blocked for every authenticated user,
including a user deleting their own row. Noted in the script and here so this isn't
mistaken for a delete policy that exists and works, when actually no delete policy exists.

Setup was extended to seed a `farm_locations` and `bank_accounts` row for **both** test
users (previously only user B), since testing "user A can read/update their own row"
requires user A to have one.

### 2. Column-level protection on `bank_accounts` verification fields — and a bug in the first attempt

**The bug.** The first migration
(`20260814145823_bank_accounts_column_grants.sql`) ran:

```sql
revoke update (resolved_account_name, name_match_score, verification_status)
  on public.bank_accounts from authenticated;
```

This executed without error and looked correct, but had **no effect** — confirmed two ways:
querying `information_schema.column_privileges` showed `authenticated` still held UPDATE on
all three columns after the migration, and the extended RLS test's self-verify assertion
failed outright (`expected the write to be rejected, but it succeeded`) when run against it.

**Root cause.** `authenticated`'s UPDATE privilege on `bank_accounts` was granted at the
*table* level, via Supabase's default `GRANT ALL ON ALL TABLES IN SCHEMA public` applied
when the table was created. Postgres column-privilege checks fall back to the table-level
ACL when no column-specific entry exists for a role — so a column-specific REVOKE only
removes column-specific grants, and has no effect on a privilege the role holds at the
table level. There's no way to "subtract one column" from a table-wide grant with REVOKE
alone.

**The fix.** A corrective migration
(`20260814151656_bank_accounts_column_grants_fix.sql`) revokes UPDATE on the whole table
from `authenticated`, then re-grants UPDATE only on the columns that should remain
client-writable:

```sql
revoke update on public.bank_accounts from authenticated;
grant update (bank_code, bank_name, account_number) on public.bank_accounts to authenticated;
```

`id`, `profile_id`, and `created_at` were deliberately left out of the re-grant too — the
client has no legitimate reason to update those either. Verified afterward via the same
`information_schema.column_privileges` query (now shows exactly `bank_code`, `bank_name`,
`account_number` for `authenticated`) and via the RLS test's self-verify assertion, which
now correctly fails with `permission denied for table bank_accounts`.

**Scope, as asked: UPDATE only, not INSERT.** The instruction was to revoke UPDATE
specifically, which is what's implemented. The identical bypass still exists at INSERT
time: `bank_accounts_insert_own` lets a farmer INSERT their own row with
`resolved_account_name`/`name_match_score`/`verification_status` set to anything, since
those columns are `not null` with no default and their INSERT privilege was never touched.
Closing that would mean the client can no longer create a `bank_accounts` row directly at
all (the not-null columns couldn't be populated without INSERT privilege on them), forcing
row creation entirely through a service-role Edge Function instead of a client-side insert —
a bigger structural change than this fix makes on its own, and one that lines up with how
phase 7's Paystack `resolve-account` function will need to work anyway. Flagged for that
phase, not resolved here.

### 3. `profiles.phone` and providers with no phone number

Decision: **made `phone` nullable, added an `email` column, and added a
`phone is not null or email is not null` check constraint** (`profiles_phone_or_email_check`
in `20260814145820_profiles_phone_or_email.sql`), rather than having the trigger fall back
to writing an email address into the `phone` column.

Reasoning: the fallback-to-email option would put an email-shaped value in a column named
(and semantically understood as) `phone`, which breaks anything downstream that assumes
`phone` is E.164-formatted (the phone-entry screen's own validation, per spec section 7.3,
and any future phone-based lookups). Adding a real `email` column and requiring at least one
identifier is the same fix real auth systems use for multi-provider signup, and costs
nothing today since Google/Apple auth are still feature-flagged off
(`ENABLE_GOOGLE_AUTH`/`ENABLE_APPLE_AUTH` in `src/config/features.ts`) — but the trigger
runs unconditionally at the database level regardless of client flags, so it needed to be
correct now rather than left to break silently whenever those providers are enabled.

`handle_new_user` now inserts both `phone` and `email` from `auth.users`:

```sql
insert into public.profiles (id, phone, email)
values (new.id, new.phone, new.email);
```

## Verification, post-review fixes

- `npx supabase db push --dry-run --linked` then `--linked --yes`, run twice (once for the
  two initial post-review migrations, once for the corrective grants-fix migration) →
  `Finished supabase db push.` each time (same non-fatal Docker warning as phase 2's first
  push).
- `npx supabase migration list --linked` → all four migrations now show matching
  `local`/`remote` timestamps:
  `20260814142850`, `20260814145820`, `20260814145823`, `20260814151656`.
- `npx supabase gen types typescript --linked` → regenerated `src/lib/database.types.ts`;
  confirmed by inspection that `profiles.Row.phone` is now `string | null` and
  `profiles.Row.email` exists.
- `npx supabase db query "select grantee, privilege_type, column_name from
  information_schema.column_privileges where table_name = 'bank_accounts' and
  grantee = 'authenticated' and privilege_type = 'UPDATE'..." --linked` → before the fix,
  returned `resolved_account_name`, `name_match_score`, `verification_status` (the bug);
  after the fix, returned exactly `account_number`, `bank_code`, `bank_name`.
- **Extended RLS test** (`npx tsx scripts/test-rls.ts`), full output after the corrective
  migration:
  ```
  Creating two throwaway users (user A, user B)...
  Seeding a farm_locations and bank_accounts row for both users...
  Signing in as user A...

  Attempting to READ user B's rows as user A (expecting 0 rows each)...
  PASS  profiles SELECT (cross-user): 0 rows affected
  PASS  farm_locations SELECT (cross-user): 0 rows affected
  PASS  bank_accounts SELECT (cross-user): 0 rows affected

  Attempting to UPDATE user B's rows as user A (expecting 0 rows each)...
  PASS  profiles UPDATE (cross-user): 0 rows affected
  PASS  farm_locations UPDATE (cross-user): 0 rows affected
  PASS  bank_accounts UPDATE (cross-user): 0 rows affected

  Attempting to DELETE user B's rows as user A (expecting 0 rows each)...
  PASS  profiles DELETE (cross-user): 0 rows affected
  PASS  farm_locations DELETE (cross-user): 0 rows affected
  PASS  bank_accounts DELETE (cross-user): 0 rows affected

  Reading own rows as user A (expecting 1 row each)...
  PASS  profiles SELECT (own row): 1 row affected, as expected for an own-row operation
  PASS  farm_locations SELECT (own row): 1 row affected, as expected for an own-row operation
  PASS  bank_accounts SELECT (own row): 1 row affected, as expected for an own-row operation

  Updating own rows as user A (expecting 1 row each)...
  PASS  profiles UPDATE (own row): 1 row affected, as expected for an own-row operation
  PASS  farm_locations UPDATE (own row): 1 row affected, as expected for an own-row operation
  PASS  bank_accounts UPDATE (own row, unprotected column): 1 row affected, as expected for an own-row operation

  Attempting to self-verify own bank_accounts row as user A (expecting rejection)...
  PASS  bank_accounts self-verify UPDATE (own row, protected columns): rejected — permission denied for table bank_accounts
  PASS  bank_accounts self-verify: protected columns unchanged, confirmed via service role

  All RLS checks passed.

  Cleaning up test users...
  ```
  Followed by a one-off `listUsers()` check confirming zero users remained afterward
  (`Total users: 0`).
- `npx tsc --noEmit` → clean. `npx expo-doctor` → `20/20 checks passed.` Both re-run after
  the corrective migration and type regeneration.

## What's next

Phase 3: Intro and Welcome screens, using the theme/motion/skeleton primitives from phase 1
and the auth store from this phase.
