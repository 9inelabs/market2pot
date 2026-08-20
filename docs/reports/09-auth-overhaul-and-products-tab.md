# Phase 9: Phone+Password Auth, Session-Aware Landing, and a Real Products Tab

## What was built, by file

### Products tab

- [app/(app)/(tabs)/search.tsx](app/(app)/(tabs)/search.tsx) — repurposed from a search
  screen into the "Products" tab: category chips (`useProductCategories`), 3-column
  `ProductGrid` fed by `useFreshProducts({ category, limit: 60 })`, a toggleable header
  search icon that switches to `useProductSearch` results once a query is entered, and
  `useAutoRefresh(refresh)` for background polling. Route file name is unchanged (`search`)
  so the tab's internal URL doesn't move.
- [src/components/app/ProductGrid.tsx](src/components/app/ProductGrid.tsx) — added a
  `columns?: number` prop (default 2). Row-chunking and empty-slot spacer logic generalized
  from a hardcoded 2-column assumption to any N.
- [app/(app)/(tabs)/_layout.tsx](app/(app)/(tabs)/_layout.tsx) — the `search` tab's
  `title`/icon changed to "Products" / `th-large`.

### Auth flow

- [supabase/migrations/20260823090000_password_pending_step.sql](supabase/migrations/20260823090000_password_pending_step.sql) —
  adds `'password_pending'` to the `onboarding_step` enum, positioned before
  `identity_pending`. Pushed live; types regenerated into
  [src/lib/database.types.ts](src/lib/database.types.ts).
- [supabase/functions/check-phone-status/index.ts](supabase/functions/check-phone-status/index.ts)
  (+ `deno.json`) — new `auth:'none'` Edge Function. Looks up `profiles` by phone via the
  service role and returns only `{ status: 'new' | 'incomplete' | 'complete' }`, never any
  profile data. Deployed, registered in `supabase/config.toml` with `verify_jwt = false`,
  smoke-tested live.
- [src/lib/authResume.ts](src/lib/authResume.ts) — new `resumeRouteForProfile(profile)`
  resume-map, shared by `intro.tsx` and `login.tsx`, mapping each `onboarding_step` value to
  its resume destination.
- [app/(profile)/set-password.tsx](app/(profile)/set-password.tsx) — new shared
  signup/reset password screen. Min 8 characters, confirm-match validation, calls
  `supabase.auth.updateUser({ password })`. Signup mode also advances
  `profiles.step` to `'identity_pending'` and pushes `identity-name`; reset mode replaces to
  `/(app)`.
- [app/(auth)/login.tsx](app/(auth)/login.tsx) — new phone+password login screen
  (`supabase.auth.signInWithPassword`), prefillable via `?phone=` (used when redirected from
  the existing-account dialog), routes post-login via `resumeRouteForProfile`.
- [app/(onboarding)/welcome-back.tsx](app/(onboarding)/welcome-back.tsx) — new interstitial
  for returning users whose profile `step === 'complete'`. Shows farm/full name greeting,
  bell/cart shortcuts, "Browse Produce", "Log Out", and a "Sign Up" link.
- [src/components/marketing/PhotoBackdrop.tsx](src/components/marketing/PhotoBackdrop.tsx) —
  new shared background component (full-bleed image + gradient fade to `warmCream`), used by
  both `welcome.tsx` and `welcome-back.tsx`.
- [app/(auth)/phone.tsx](app/(auth)/phone.tsx) — `Mode` narrowed to `'signup' | 'reset'`
  (login no longer goes through OTP). Signup mode now checks `check-phone-status` before
  sending an OTP; a `'complete'` result shows a `ConfirmDialog` routing to `/(auth)/login`
  with the phone pre-filled. Reset mode added, with its own copy and a "no account found"
  error branch.
- [app/(auth)/verify.tsx](app/(auth)/verify.tsx) — replaced with a single
  `resolveRouteAfterVerify()` used by both the dev-bypass and real `verifyOtp` success paths.
  Fetches the existing profile's `step` first; if already `'complete'`, returns straight to
  `welcome-back` without touching role/step (account-corruption guard). Otherwise sets
  `step: 'password_pending'` and routes to `set-password?mode=signup`. Reset mode skips
  role/step entirely and routes to `set-password?mode=reset`.
- [app/(onboarding)/intro.tsx](app/(onboarding)/intro.tsx) — implements the routing gate
  that was the open phase-5 item. Waits for `!(session && loadingProfile)`, then routes:
  no session → `welcome`; session, no profile → `welcome`; session + profile →
  `resumeRouteForProfile(profile)`.
- [app/(onboarding)/welcome.tsx](app/(onboarding)/welcome.tsx) — wrapped in
  `<PhotoBackdrop>`; `goToSignIn` now pushes `/(auth)/login` directly.
- [app/(app)/_layout.tsx](app/(app)/_layout.tsx) — no-session redirect target changed from
  `/(onboarding)/intro` to `/(auth)/login`.
- [src/screens/AccountSettingsScreen.tsx](src/screens/AccountSettingsScreen.tsx) and
  [src/components/app/profile/FarmerProfileTab.tsx](src/components/app/profile/FarmerProfileTab.tsx) —
  `handleLogout` now routes to `/(auth)/login` after `signOut()`.

## Deviations from the spec and why

- None of substance. The plan's own defensive fallback for `role_pending` (route to
  `welcome`) was kept even though it should be unreachable, exactly as the plan called for.
- `welcome-back.tsx` initially included a placeholder tagline line with no real copy behind
  it; removed before finishing since it added nothing over the existing `Wordmark` +
  `LeafMark` brand lockup used elsewhere.

## Bugs found and fixed

- **Account-corruption risk in `verify.tsx`**: the original single-pass write would have
  unconditionally reset `role`/`step` to `'password_pending'` even for an already-`complete`
  account, if a signup OTP flow ran against an existing number (e.g. the existing-account
  dialog dismissed or its check failing open). Fixed by checking the current profile's
  `step` before any write and short-circuiting to `welcome-back` when already complete.
  Caught during implementation review, not via a test failure.
- **`PhoneField` doesn't accept a `style` prop** (`login.tsx`): its Props type explicitly
  `Omit`s `style`. Fixed by wrapping the field in a plain `<View style={styles.phoneField}>`
  instead of passing `style` through.
- **`supabase gen types` trailing garbage line**: as in prior phases, the CLI appends a
  stray PostHog-shutdown-timeout JSON line to the end of `database.types.ts` on stdout. Caught
  and stripped before trusting the file; this only surfaced at generation time, not at
  typecheck (the extra line broke the file's parseability, not its types, until removed).

## Verification: exact commands run and their results

- `npx tsc --noEmit` — clean, no output.
- `npx expo-doctor` — 20/21 checks passed. The one failure is a pre-existing patch-version
  drift across 9 `expo-*` packages against the SDK 57 manifest, unrelated to this phase's
  changes; not fixed here (out of scope — a dependency bump, not a feature change).
- `npx expo export --platform ios` — succeeded, produced a single 6.1MB Hermes bundle with
  no resolution errors.
- `npx expo export` (both platforms, run earlier in this phase) — 2257 modules resolved
  (up from 2245 pre-phase), including the new `assets/design/Back Screen.jpg` binary asset
  via the existing `require()` convention.
- `curl` smoke test against the deployed `check-phone-status` function — returned
  `{"status":"new"}` for an unregistered number.
- Manual code review pass (no automated coverage possible for OTP-dependent paths — no real
  SMS provider configured) over `verify.tsx` and `phone.tsx` end-to-end, confirming: mode
  branching, the account-corruption guard's placement before any write, `resolveRouteAfterVerify()`
  called identically from both the dev-bypass and real-OTP success branches, and
  `handleResend`/`shouldCreateUser` matching `mode`.

## Open questions or decisions that had to be guessed

- Real SMS/OTP delivery is still not configured in this project (per the existing
  `DEV_OTP_BYPASS` dev banner) — signup verify and forgot-password verify have only been
  exercised via the dev bypass code `000000`, not a real phone number end to end.
- The `expo-doctor` patch-version drift (9 packages behind their SDK 57 `~` ranges) predates
  this phase and wasn't introduced or worsened by it; left unaddressed since it's a dependency
  maintenance task, not part of the requested feature work.

## What's next

- Run the full manual walkthrough once real SMS delivery is available: fresh signup
  interrupted at each step, a `complete`-step session landing on Welcome Back, wrong-password
  login, and forgot-password end to end.
- Consider a separate pass to close the `expo-doctor` dependency drift (`npx expo install
  --check`).
