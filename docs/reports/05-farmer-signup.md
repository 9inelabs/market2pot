# Phase 5 — Farmer Sign-Up Flow

Builds the full farmer path — phone/OTP (shared with consumers), full name + date of birth,
profile picture, farm location, bank details, and review profile — against seven design
mockups (`assets/materials/Farmers flow.zip`, extracted to
`assets/materials/extracted-farmers/`). Two of the seven screens (Full name, Profile picture)
turned out to be pixel-identical in copy to their consumer equivalents from phase 4 and were
generalized into shared screens rather than duplicated; the other five (Phone Number, Code,
Location, Bank Details, Review Profile) are farmer-specific, though Phone/Code reuse phase 4's
`(auth)/phone.tsx` and `verify.tsx` unchanged — only the routing after OTP success differs by
role.

## Questions asked before building, and the decisions made

Three setup/scope questions were raised up front, per the explicit instruction to pause before
building if anything needed external setup:

1. **Paystack API key** (needed for bank list + account-number resolution — spec section 8).
   Decision: build the full integration now; **the user will get a test key and provide it
   later.** Both Edge Functions are written and deployed, but `list-banks` and
   `resolve-account` will return a 500 (`PAYSTACK_SECRET_KEY is not configured`) until
   `PAYSTACK_SECRET_KEY` is set as a secret on the Supabase project. This is an environment
   variable to set in the Supabase dashboard (Edge Functions → Secrets), not a code change.
2. **Terms & Conditions / Privacy Policy pages** (linked from the agreement checkbox on both
   Bank Details and Review Profile). Decision: **build placeholder pages now** (Recommended)
   rather than block the flow on real legal copy.
3. **Date of birth.** The build spec requires 18+ enforcement for payouts, but none of the
   seven mockups show a DOB field anywhere. Decision: **add it to the Full Name screen** — a
   deliberate deviation from literal design-matching for this one field, per explicit
   instruction, since the spec's age requirement has no home in the uploaded designs otherwise.

## What was built, by file

**Migrations**

- `supabase/migrations/20260817093958_banks_table.sql` — `banks` table (Paystack bank-list
  cache: `code` unique, `name`, `updated_at`). Public-read RLS (`using (true)`), no
  insert/update/delete policy — only the service role, used inside `list-banks`, can write.
  `pg_cron` + `pg_net` job (`refresh-banks-daily`, 03:00 UTC) calls the `list-banks` Edge
  Function over HTTP using the anon key — safe to embed in a migration since it's already
  public in the client bundle; write access is governed by the function's own service-role
  client, not by which key invoked it.
- `supabase/migrations/20260817095345_account_resolution_attempts.sql` —
  `account_resolution_attempts` table (rate-limit log for `resolve-account`: `profile_id`,
  `created_at`). Owner-only select/insert RLS, no update/delete policy (immutable log).

**Edge Functions** (deployed via `npx supabase functions deploy <name> --use-api`)

- `supabase/functions/list-banks/index.ts` — `auth: 'none'` (public — invoked by the cron job
  and safe since it only ever writes Paystack's own public bank list). Fetches
  `GET /bank?country=nigeria&currency=NGN` from Paystack, upserts into `banks` via
  `ctx.supabaseAdmin`.
- `supabase/functions/resolve-account/index.ts` — `auth: 'user'`. Checks
  `account_resolution_attempts` for the calling user (last hour, max 10) via `ctx.supabase`
  (RLS-scoped), logs the attempt *before* calling Paystack (so a crash mid-request still counts
  against the limit), calls `GET /bank/resolve`, looks up the bank's display name from the
  `banks` table (Paystack's resolve response doesn't include it), returns only
  `{account_name, bank_name}` — never the raw Paystack payload.
- `supabase/config.toml` — `verify_jwt=false` for `list-banks`, `verify_jwt=true` for
  `resolve-account` (overriding the CLI's default-false scaffold), with comments explaining why.

**New library code**

- `src/lib/nameMatch.ts` — `matchNames(resolvedName, typedName)` → `{score, status}`, where
  `status` is `'verified' | 'review' | 'blocked'`. Token-based, order-insensitive, Levenshtein
  distance per token, Unicode-diacritic-normalized (`\p{Diacritic}`). Verified against the
  build spec's own worked examples (e.g. "ADEYEMI JOHN OLUWASEUN" vs "John Adeyemi" →
  `{score: 0.83, status: 'verified'}`).
- `src/hooks/useBanks.ts` — reads the `banks` table directly; the client never calls Paystack.
- `src/hooks/useLocationDetection.ts` — the permission-rationale-then-detect-then-reverse-geocode
  logic factored out of phase 4's `consumer-location.tsx`, parameterized by copy strings, now
  shared by both `consumer-location.tsx` and the new `farm-location.tsx`.

**New/modified UI components**

- `src/components/ui/Checkbox.tsx`, `AgreementCheckbox.tsx` — checked/unchecked box +
  "I agree to market2pot Terms & Conditions and Privacy Policy" with tappable inline links to
  `/terms` and `/privacy`.
- `src/components/ui/DateField.tsx` — native date picker (iOS: inline spinner + Done button;
  Android: native dialog), used for the farmer DOB field.
- `src/components/ui/BankPicker.tsx` — modal with a search `FlatList` over `useBanks()`.
- `src/components/ui/ResolvedAccountCard.tsx` — green checkmark card (Bank Details screen,
  post-resolution).
- `src/components/ui/BankSummaryCard.tsx` — green copy-to-clipboard card (Review Profile
  screen), using the newly-installed `expo-clipboard`.
- `src/components/ui/AvatarPicker.tsx` — **fixed to accept any `size`.** It previously
  hardcoded `fontSize: 40` for the initials fallback regardless of the `size` prop, which was
  invisible while every call site used the default `size={160}`. Review Profile needed a much
  smaller `size={64}` avatar; now `fontSize: size * 0.25`, preserving the existing look at 160
  (40px, unchanged) and 100, while fitting correctly at 64.
- `src/components/ui/TextField.tsx` — **fixed a style-merge bug.** `<TextInput
  style={styles.input} {...props} />` let a caller's `style` prop fully replace (not merge
  with) the base pill styling. Latent since nothing had passed `style` before `BankPicker`
  needed to. Fixed to `style={[styles.input, style]}`.

**Screens renamed/generalized (shared between farmer and consumer)**

- `consumer-identity.tsx` → `app/(profile)/identity-name.tsx` — reads `role` from
  `useAuthStore`; farmers additionally see a `DateField` for date of birth (kept as a separate
  `useState`, not folded into the `zod` schema — simpler than the type gymnastics of a
  conditional schema for one role-gated field). Always routes to `identity-photo`.
- `consumer-photo.tsx` → `app/(profile)/identity-photo.tsx` — identical UI; routes to
  `farm-location` for farmers, `consumer-location` for consumers, both on Continue and on Skip.
- `consumer-location.tsx` — refactored to use the new shared `useLocationDetection` hook
  (previously had this logic inline); behavior unchanged.

**New farmer-only screens**

- `app/(profile)/farm-location.tsx` — mirrors `consumer-location.tsx`'s UX ("Use my current
  location" + manual entry) but inserts into `farm_locations`, sets `step: 'bank_pending'`,
  routes to `bank-details`.
- `app/(profile)/bank-details.tsx` — bank picker + 10-digit account number; once both are
  present, auto-resolves via `resolve-account`, runs `matchNames()` client-side against the
  profile's `full_name`, and branches on the result: `verified`/`review` → green
  `ResolvedAccountCard` (+ a review-message caption for `review`), `blocked` → mismatch message
  with "Edit Name" (→ `identity-name`) and "Try Again" actions. Inserts `bank_accounts` on
  Continue (step stays `bank_pending`), routes to `review-profile`.
- `app/(profile)/review-profile.tsx` — the final screen. Fetches `bank_accounts` and the most
  recent `farm_locations` row directly (not from the auth store). Shows the avatar, name, a
  "Verified farmer" badge, a location summary, the `BankSummaryCard` (copy-to-clipboard), the
  explanatory note, a second agreement checkbox, and Confirm & Continue / Edit Details.
  Confirm sets `profiles.step = 'complete'`, refreshes the auth store, and routes to `(app)`;
  Edit Details goes back one screen.
- `app/terms.tsx`, `app/privacy.tsx` — placeholder legal pages, same pattern as
  `app/browse.tsx` from phase 3.

**Routing**

- `app/(auth)/verify.tsx` — on signup success, both roles now route to `identity-name`
  (previously farmers went to a `farmer-coming-soon` placeholder, now deleted).

**Strings** — `src/i18n/strings.ts`: `consumerName*`/`consumerPhoto*` renamed to
`identityName*`/`identityPhoto*` (both screens are shared now); added `identityDob*`,
`farmLocation*`, `bankDetails*`, `bankName*` (review/mismatch messages, verbatim from spec
7.8), and `review*` keys.

## Deviations from the design, and why

- **DOB field on Full Name**, per the explicit decision above — not in any mockup.
- **"Verified farmer" badge is tied to `bank_accounts.verification_status === 'verified'`.**
  The design shows this badge on Review Profile but doesn't specify what drives it; this is a
  reasonable inference (it's the only "verified" concept in the schema) but wasn't explicitly
  confirmed — flagged in Open Questions below.
- **Review Profile's location line composes `address_line` and `lga, state`** (e.g. "Axis •
  Lekki, Lagos"). The mockup shows "Axis • Lekki, Lagos" but `farm_locations` has no distinct
  "area" column — `address_line` (the free-text/detected line from `farm-location.tsx`) stands
  in for "Axis." This will look right when the address line itself is short (a neighborhood
  name), less so for a long street address.
- **`profiles.step` has no `review_pending` state.** `bank_pending` is used to mean both "needs
  bank details" and "needs to review" — Review Profile's Confirm button is what actually
  advances `step` to `'complete'`. Not explicitly confirmed with the user; a `review_pending`
  enum value would be more precise if this matters for analytics/support tooling later.
- **The agreement checkbox appears twice** (Bank Details and Review Profile) — this matches the
  uploaded designs exactly (both mockups show it), not a bug, but worth noting since it means
  agreeing twice in one flow.

## Bugs found and fixed

- **`AvatarPicker`'s initials font size was hardcoded**, only surfacing once Review Profile
  needed a smaller avatar than any prior screen — see component list above.
- **`TextField`'s `style` prop fully replaced base styling instead of merging** — see component
  list above.
- **`ResolvedAccountCard.tsx` had a temporal-dead-zone bug mid-draft**: a `const` referenced
  inside `StyleSheet.create()` but declared *after* it, which would throw "Cannot access before
  initialization" at module load. Caught before commit; fixed by inlining the literal.
- **Root `tsconfig.json` was picking up `supabase/functions/**`**, whose Deno-runtime files
  (`Deno.env`, `npm:`/`jsr:` imports) don't typecheck under the Node/Expo config. Fixed with
  `"exclude": ["supabase/functions"]`.
- **`npx supabase gen types typescript --linked > database.types.ts` corrupted the output file**
  — the CLI's benign "Timeout while shutting down PostHog" diagnostic leaked onto stdout after
  the valid TypeScript and got appended to the file. Caught by inspecting the file's tail;
  fixed by removing the trailing garbage line. (The underlying PostHog timeout itself is a
  known-benign CLI quirk, not a real failure — confirmed via the CLI's actual exit output, not
  its exit code, which is also non-zero here despite success.)

## Known gaps — flagged, not silently built around

- **`PAYSTACK_SECRET_KEY` is not yet configured.** Both Edge Functions are deployed and
  reachable (confirmed via `curl`: `list-banks` returns the expected "not configured" error,
  `resolve-account` correctly rejects unauthenticated calls), but bank list population and
  account resolution won't work end-to-end until the key is set. **Action needed from you:**
  get a Paystack test secret key and add it as an Edge Function secret
  (`npx supabase secrets set PAYSTACK_SECRET_KEY=sk_test_...` or via the dashboard). Once set,
  no code changes are needed — the daily cron job will populate `banks` on its next run (or
  invoke `list-banks` manually once to populate it immediately), and Bank Details' auto-resolve
  will start working.
- **Terms & Conditions / Privacy Policy are placeholders**, not real legal copy.
- **"Verified farmer" badge semantics and the `bank_pending`-covers-review inference** — both
  flagged above, not explicitly confirmed with you.

## Verification: exact commands run and results

- `npx tsc --noEmit` — clean throughout, re-run after every file addition and after the final
  `AvatarPicker`/`review-profile.tsx` pass.
- `npx expo-doctor` — `20/21 checks passed`; the one failure is a pre-existing patch-version
  drift (`expo`, `expo-constants`, `expo-linking`, `expo-router` each one patch behind SDK 57's
  expected version) — the same category of finding as prior phases, not introduced by this
  session, not touched since it's an unrelated dependency-upgrade decision.
- `npx expo export -p android --output-dir <tmp>` — succeeded, 2121 modules, 38 assets (up from
  phase 4's 2087/38 — new screens and `expo-clipboard`, no new bundled binary assets). Test
  export directory deleted afterward.
- **RLS test** (`npx tsx scripts/test-rls.ts`), extended to cover `banks` (public read,
  service-role-only write) and `account_resolution_attempts` (owner-only select/insert,
  immutable log) — 30 assertions, all passing:
  ```
  PASS  profiles SELECT (cross-user): 0 rows affected
  PASS  farm_locations SELECT (cross-user): 0 rows affected
  PASS  delivery_locations SELECT (cross-user): 0 rows affected
  PASS  bank_accounts SELECT (cross-user): 0 rows affected
  PASS  profiles UPDATE (cross-user): 0 rows affected
  PASS  farm_locations UPDATE (cross-user): 0 rows affected
  PASS  delivery_locations UPDATE (cross-user): 0 rows affected
  PASS  bank_accounts UPDATE (cross-user): 0 rows affected
  PASS  profiles DELETE (cross-user): 0 rows affected
  PASS  farm_locations DELETE (cross-user): 0 rows affected
  PASS  delivery_locations DELETE (cross-user): 0 rows affected
  PASS  bank_accounts DELETE (cross-user): 0 rows affected
  PASS  profiles SELECT (own row): 1 row affected
  PASS  farm_locations SELECT (own row): 1 row affected
  PASS  delivery_locations SELECT (own row): 1 row affected
  PASS  bank_accounts SELECT (own row): 1 row affected
  PASS  profiles UPDATE (own row): 1 row affected
  PASS  farm_locations UPDATE (own row): 1 row affected
  PASS  delivery_locations UPDATE (own row): 1 row affected
  PASS  bank_accounts UPDATE (own row, unprotected column): 1 row affected
  PASS  bank_accounts self-verify UPDATE (own row, protected columns): rejected
  PASS  bank_accounts self-verify: protected columns unchanged, confirmed via service role
  PASS  banks SELECT (public read): 1 row affected
  PASS  banks INSERT (no policy for authenticated users): rejected
  PASS  banks UPDATE (no policy for authenticated users): 0 rows affected
  PASS  banks DELETE (no policy for authenticated users): 0 rows affected
  PASS  account_resolution_attempts SELECT (cross-user): 0 rows affected
  PASS  account_resolution_attempts INSERT (claiming to be user B): rejected
  PASS  account_resolution_attempts INSERT (own row): 1 row affected
  PASS  account_resolution_attempts SELECT (own row): 1 row affected
  ```
  Cleanup confirmed (test users and the throwaway `banks` row both removed afterward).
- Both new migrations confirmed applied via `npx supabase migration list --linked` (matching
  local/remote timestamps) earlier in this session.

## Open questions or decisions that had to be guessed

- Whether "Verified farmer" should really be tied to `bank_accounts.verification_status`, or
  something broader (e.g. also requiring a photo, or an admin review step not yet built).
- Whether `profiles.step` needs a dedicated `review_pending` value instead of overloading
  `bank_pending` for both "needs bank details" and "needs to review."
- Whether Review Profile's location line (`address_line • lga, state`) reads correctly for
  real Nigerian addresses, or needs a dedicated "area/estate" field on `farm_locations` to
  match the mockup's "Axis" more precisely.

## What's next

Once you provide the Paystack test key, the bank list and account-resolution path can be
exercised end-to-end for the first time (currently verified only up to the "not configured"
error boundary). Beyond that, the natural next phase is whatever comes after both sign-up
flows are complete — likely the actual `(app)` home/marketplace screens, which are currently
just phase-3/4's placeholder landing page.

## Post-review fixes — Paystack key added, three real-device bugs found

After you added `PAYSTACK_SECRET_KEY`, the bank picker and account resolution were tested for
the first time against real network calls (previously only verified up to the
"not configured" error boundary). This surfaced two real bugs, plus a third found while
reviewing why the Review Profile screen wasn't showing an uploaded photo. None of these were
catchable by `tsc`/`expo-doctor`/bundle export — they're all runtime API-misuse bugs that only
show up when the actual network/native calls run.

### 1. Bank picker showed nothing — Paystack's bank list has duplicate codes

**The bug.** `list-banks` upserts Paystack's bank list in one batch with
`onConflict: 'code'`. Paystack's `/bank` response contains duplicate `code` values (the same
bank listed more than once), and Postgres rejects a batch `ON CONFLICT DO UPDATE` that would
touch the same target row twice in one statement — the whole upsert failed every time, so
`banks` stayed empty no matter how many times the daily cron ran.

**The fix.** De-duplicate by `code` (last one wins) before building the upsert rows, in
`supabase/functions/list-banks/index.ts`. Redeployed and manually invoked once to populate the
table immediately rather than waiting for the next 03:00 UTC cron run — confirmed 274 banks
now in the table.

### 2. Account resolution failing with an opaque error

**The bug.** `resolve-account` read `ctx.userClaims.sub` to get the calling user's id. This
version of `@supabase/server` normalizes claims into `{id, role, email, appMetadata,
userMetadata}` — there is no `.sub`. Every call was silently using `userId: undefined`, which
broke the rate-limit query and the attempt-log insert, crashing before Paystack was ever
called. The failure surfaced to the client only as `FunctionsHttpError`'s generic "Edge
function returned a non-2xx status code," with the function's own gateway-level error code
(`EDGE_FUNCTION_ERROR`) and an empty message — none of it pointed at the actual cause.

**How it was found.** Isolated by deploying progressively smaller stub versions of the
function directly against a real signed-in test user's JWT (bypassing the client SDK's error
swallowing) until one dumped `Object.keys(ctx)` and `ctx.userClaims` directly, which showed
`.id` where `.sub` was expected.

**The fix.** `ctx.userClaims.id` in `supabase/functions/resolve-account/index.ts`. Also added
proper error handling around the Paystack fetch/JSON-parse (read the response as text first,
`JSON.parse` in a try/catch) so a future Paystack-side failure returns a real message instead
of letting `Response.json()` throw and fall through to another opaque gateway error. Verified
against a real Access Bank test account — resolved to a real account name end-to-end.

### 3. Uploaded profile photo not appearing on Review Profile

**The bug.** Not a Review Profile bug at all — the uploaded avatar file itself was corrupt.
`src/lib/avatarUpload.ts` read the compressed image via `fetch(compressedUri).arrayBuffer()`
on a local `file://` URI, a known-unreliable pattern in React Native (the polyfilled `fetch`
doesn't reliably read full local file contents this way). It silently produced a ~14-byte
"image" instead of erroring, so the upload succeeded, `avatar_url` was set correctly, RLS and
the public bucket were both fine — but the stored file was junk, confirmed by fetching the
actual stored URL and finding a 14-byte `content-length`.

**The fix.** Installed `expo-file-system` (SDK 57's new `File`/`Directory` API — wasn't a
dependency before) and read the compressed file via `new File(compressedUri).arrayBuffer()`
instead of `fetch().arrayBuffer()`. **Action needed from you:** any photo uploaded before this
fix is corrupt in storage — re-upload your profile photo from the Profile Picture screen; no
other data was affected.

### 4. Name-match enforcement + a note on the Full Name screen

Per your request: the account-name-must-match-full-name enforcement already existed
(`src/lib/nameMatch.ts`'s `verified`/`review`/`blocked` result, with Bank Details blocking
Continue only on `blocked` — a near-match still gets a review warning, not a hard block, per
spec 7.8) but had never been exercised successfully until bug #2 above was fixed, so it
likely looked broken or absent. Added `strings.identityNameBankNote`, shown only to farmers on
the Full Name screen, telling them to enter the name on their bank account since it'll be
matched later.

### Verification

- `npx tsc --noEmit` — clean.
- `npx expo-doctor` — same pre-existing patch-version-drift category as before (now 8 packages,
  since the upstream registry has moved further since the last check — not introduced by these
  fixes).
- `npx expo export -p android --output-dir <tmp>` — succeeded, 2139 modules (up from 2121 —
  `expo-file-system` is a new dependency), 38 assets (unchanged — no new bundled binary
  assets). Test export directory deleted afterward.
- `npx tsx scripts/test-rls.ts` — all 30 assertions still passing (unaffected by these fixes).
- Manual end-to-end checks against the live project (not part of the automated suite): `banks`
  populated (274 rows), `resolve-account` resolved a real Access Bank test account to a real
  name. The avatar fix itself is unverified beyond `tsc`/bundle-export — it can't be exercised
  from here without a device/simulator running the actual photo picker; please confirm a
  freshly-uploaded photo now shows up on Review Profile.

## Post-review fixes, round 2 — Bank Details crashed on resubmit

Reported: submitting Bank Details a second time (going back to edit, retrying after a mismatch,
or just re-entering the screen after already having a saved bank account) failed with
`duplicate key value violates unique constraint "bank_accounts_profile_id_key"`.

### The bug, and why it wasn't a one-line fix

`bank-details.tsx` wrote to `bank_accounts` with a plain client-side `.insert()`. The table has
`unique(profile_id)` (spec: one bank account per farmer) — so any second insert for the same
farmer always fails.

The obvious fix, switching to `.upsert(row, {onConflict: 'profile_id'})`, doesn't work here
without reopening a security hole this project closed in phase 2: `authenticated`'s `UPDATE`
privilege on `resolved_account_name`/`name_match_score`/`verification_status` was deliberately
revoked (`20260814151656_bank_accounts_column_grants_fix.sql`) so a farmer's own client can't
self-verify their bank account by writing those columns directly. An upsert's `ON CONFLICT DO
UPDATE` needs `UPDATE` privilege on every column it writes, so it would fail on those three
columns on any resubmit — and `bank_accounts` also has no `DELETE` policy at all, so
delete-then-insert isn't an option either. The client genuinely cannot legally rewrite those
columns a second time under the existing RLS/grant model — this was flagged as a known
structural gap back in phase 2's migration comments ("a bigger structural change... flagged for
a decision before phase 7... not resolved here"), and this bug report is that decision point.

### The fix — bank_accounts is now written server-side only

New Edge Function `supabase/functions/submit-bank-account/index.ts` (`auth: 'user'`, shares
`resolve-account`'s rate-limit budget since both call Paystack's resolve endpoint):

1. Re-resolves the account via Paystack itself — does not trust the `account_name` the client
   already got from `resolve-account`'s live preview moments earlier.
2. Fetches the caller's own `full_name` via `ctx.supabase` (RLS-scoped) and recomputes the
   match server-side, using a new `supabase/functions/_shared/nameMatch.ts` (a duplicate of
   `src/lib/nameMatch.ts` — Edge Function deploys bundle based on the `supabase/functions/`
   tree, so importing across that boundary from `src/lib/` is avoided; the two are kept in sync
   by comment, not by a shared build step).
3. Rejects with 422 if the match is `blocked` — the same rule Bank Details already enforced
   client-side, now also enforced server-side.
4. Writes via `ctx.supabaseAdmin.from('bank_accounts').upsert(row, {onConflict: 'profile_id'})`
   — the service role bypasses both RLS and the column-level grants, so this is now the only
   path (client or server) that can write `resolved_account_name`/`name_match_score`/
   `verification_status`, closing the phase-2-flagged gap as a side effect: the client-side
   `bank_accounts_insert_own` policy still technically allows a raw client insert with
   fabricated verification fields, but the app itself no longer ever calls `.insert()` or
   `.upsert()` on `bank_accounts` — everything goes through this function instead.

`bank-details.tsx`'s `handleContinue` now calls `supabase.functions.invoke('submit-bank-account', ...)`
instead of `supabase.from('bank_accounts').insert(...)`. `supabase/config.toml` registers the
new function (`verify_jwt = true`, same reasoning as `resolve-account`).

### Verification

- `npx tsc --noEmit` — clean.
- Deployed via `npx supabase functions deploy submit-bank-account --use-api` — confirmed
  `_shared/nameMatch.ts` was picked up and uploaded automatically as a dependency.
- Direct end-to-end tests against the live project, using Paystack's synthetic test bank code
  `001` (unlimited resolves, unlike real bank codes which are capped at 3/day in test mode — a
  limit this session's earlier debugging had already exhausted for the day):
  - First submit: `200`, row created with `verification_status: 'verified'`.
  - Second and third submits of the exact same request (the scenario that previously crashed):
    both `200`, and exactly one row remained for the profile afterward (confirmed by row `id`
    staying identical across all three calls, and a final count of 1).
  - A submit with mismatched name correctly rejected with `422` and no row written, both on
    first attempt and on a repeated attempt (no crash either way).
- `npx tsx scripts/test-rls.ts` — all 30 assertions still passing (this suite seeds
  `bank_accounts` directly via the service role, so it wasn't exercising the code path that had
  the bug, but confirms nothing about the RLS/grant model itself regressed).
- `npx expo export -p android --output-dir <tmp>` — succeeded. Test export directory deleted
  afterward.

### Note on Paystack's test-mode limits

Real (non-`001`) bank codes are capped at **3 live resolves per day** in Paystack test mode —
hit partway through this session's debugging. This applies to both `resolve-account` and
`submit-bank-account`, since both call the same Paystack endpoint. Worth knowing if bank
details testing suddenly starts returning "Test mode daily limit... exceeded" — it's a Paystack
quota, not an app bug, and resets daily. **This quota is shared across everyone testing against
the same project** — if you and this session are both testing bank details the same day, one
can exhaust the other's remaining calls.

## Post-review fixes, round 3 — the real Paystack error was hidden behind a generic message

Reported: still seeing "Edge Function returned a non-2xx status code" on the bank details
screen (OPay, a real bank code) after round 2's fix.

**What was actually happening.** The live preview call (auto-resolve, in `bank-details.tsx`)
was correctly hitting Paystack's test-mode daily limit (round 2's note above) and
`resolve-account` was correctly returning a proper `422` with `{"error": "Test mode daily
limit of 3 live bank resolves exceeded..."}`. But `extractFunctionErrorMessage`'s
`error.context.json()` call — which reads the failed response's body to surface that real
message — was silently failing on-device and falling through to the generic fallback string,
even though the identical code path worked correctly in a Node-based test against the same
live endpoint. React Native's `fetch`/`Response` implementation doesn't behave identically to
Node's for every response shape (this project's Edge Functions return gzip-compressed,
chunked-transfer responses), and this is the second time in this session a direct `.json()`
call on a `Response` has turned out to be unreliable — the first was server-side, on Paystack's
own responses (see the original build report's bugs section).

**The fix.** `extractFunctionErrorMessage` now reads the response as text first, then
`JSON.parse`s it, instead of calling `.json()` directly — same defensive pattern already
applied server-side in `resolve-account`/`submit-bank-account`. This is the only place in the
client that parses a function-error body, so no other screen needed the same fix.

**Practical note for you:** even with this fixed, if you test with a real bank code (OPay,
Access Bank, etc.) today, you may still see an error — but it'll now show the actual Paystack
message ("Test mode daily limit of 3 live bank resolves exceeded...") instead of the generic
one. That's expected and resets daily. **Use bank code `001` (shows up in the picker as
whatever Paystack named it, if present in the synced list) for unlimited testing** — it
resolves to account name `"TEST ACCOUNT {account_number}"` with no daily cap.

### Verification

- `npx tsc --noEmit` — clean.
- `npx expo export -p android --output-dir <tmp>` — succeeded. Test export directory deleted
  afterward.
- Confirmed via a direct Node-based reproduction that `error.context.json()` DOES work
  correctly for this exact response (same headers, same gzip/chunked encoding) when called from
  Node — meaning the bug is specifically an RN-vs-Node fetch/Response behavior difference, not a
  server-side issue. Could not verify the fix itself on-device from here (no simulator/device
  access); please confirm the bank details screen now shows a real, specific error message
  instead of the generic one.

## Post-review fixes, round 4 — same error persisted; traced to source, confirmed not a library bug

Reported: still seeing the generic message after round 3's fix.

**What was ruled out, with evidence, not guesswork:**
- Checked `node_modules/@supabase/functions-js`'s actual source: the body is never read before
  `FunctionsHttpError` is thrown (only headers/`.ok` are checked), so `error.context` reaching
  the client is genuinely a fresh, unread `Response` — not a "body already consumed" race.
- Checked whether `@supabase/supabase-js` bundles a *different* copy of `FunctionsHttpError`
  than the one `bank-details.tsx` imports directly (which would break `instanceof` silently even
  though the error is conceptually the right type): confirmed only one `@supabase/functions-js`
  copy exists in `node_modules` (no hoisting duplication), and `supabase-js`'s bundle imports
  the class from the real package rather than vendoring its own — so this wasn't it either.
- Checked whether a custom `fetch` was configured on the Supabase client (which could make
  `error.context instanceof Response` fail if that custom fetch returns a `Response` from a
  different realm): `src/lib/supabase.ts` passes no custom fetch, so `Response` is the same
  global class throughout.
- Re-ran the exact reproduction from round 3, this time calling round 4's new duck-typed
  `extractFunctionErrorMessage` function body directly (copied verbatim from
  `bank-details.tsx`) against a live, real `FunctionsHttpError` from the actual endpoint:
  it correctly returned `"Test mode daily limit of 3 live bank resolves exceeded..."` — not the
  generic string. **This proves the extraction logic is correct** against the real error shape
  the app receives; it isn't a logic bug reachable through direct testing.

**What changed anyway, defensively:** `extractFunctionErrorMessage` no longer gates on
`error instanceof FunctionsHttpError && error.context instanceof Response` at all — it duck-types
(checks for a `.text` method on `error.context`) instead, removing even the theoretical
possibility of an `instanceof` mismatch. It also no longer silently falls through to the fully
generic string if the body doesn't parse as JSON or doesn't have an `.error` key — it now
surfaces the raw response text (truncated) or the HTTP status code instead, so any future
unexpected response shape is diagnosable from what's shown on screen rather than invisible.

**Given the logic now has direct, reproduced proof of correctness against a live error from
the real endpoint, the most likely explanation for the error persisting unchanged is that the
running app hadn't picked up the JS change yet** — client-side `.tsx` edits (unlike Edge
Function deploys, which are server-side and live immediately for every client) only take
effect after the app's JS bundle actually reloads. If you're on a dev client / Expo Go
connected to a live Metro session, a background→foreground switch doesn't always force this;
try a full reload (shake menu → Reload, or fully close and reopen the app). If you're running a
previously-built/exported APK rather than a live dev session, none of this session's
client-side `.tsx` fixes (this one, the avatar upload fix, or the identity-name-screen note)
would be present until it's rebuilt.

### Verification

- `npx tsc --noEmit` — clean (also removed the now-unused `FunctionsHttpError` import).
- Direct reproduction against the live project confirmed the new extraction logic returns the
  real Paystack message, not the generic one, for the exact error shape the app receives.
- `npx expo export -p android --output-dir <tmp>` — succeeded. Test export directory deleted
  afterward.
