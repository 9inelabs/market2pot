# Phase 4 — Role Selection + Consumer Sign-Up Flow

Restructures the original build order: role selection moved ahead of phone/OTP (per the
project owner's explicit direction), and this phase covers the full consumer path — role
selection, phone entry, OTP verification, full name, profile photo, and delivery location —
built against five design mockups (`assets/materials/Signup Flow for Users.zip`). The farmer
path is explicitly out of scope ("we will work on the farmer sign up flow later").

## Questions asked before building, and the decisions made

Four architectural questions were asked up front, since they'd be expensive to unwind after
the fact:

1. **Role selection timing.** Chosen: before phone/OTP. Welcome → Role → Phone → OTP →
   (consumer: Full name → Photo → Location). Since `profiles.role` can't be written until a
   profile row exists (which requires an authenticated user), role is carried as a route
   param through phone → verify, then written in one combined update right after OTP
   succeeds (`role` + `step: 'identity_pending'`).
2. **Role screen copy.** Chosen: "I am a farmer" / "I am a consumer" (the project owner's
   exact new wording), superseding the placeholder title+subtitle card copy sitting in
   `strings.ts` since phase 1.
3. **OTP length.** Chosen: 6 digits, per the original build spec, even though the mockup
   shows 4 boxes. The mockup's `+41 *** 9885` masking, "Resend Code" link, and dev-bypass
   banner still apply — only the digit count differs from what's shown.
4. **Location screen's Continue button color.** Chosen: harvestGreen, matching every other
   primary CTA in the app, over the mockup's literal dark/deepSoil rendering (treated as a
   one-off mockup inconsistency).

A fifth question came up mid-build, once the schema gap became concrete: consumers need a
delivery address, but the only location table (`farm_locations`) is farmer-scoped by name,
RLS, and the existing RLS test. Chosen: a **new dedicated `delivery_locations` table**, not a
rename/reuse of `farm_locations` — keeps farmer and consumer data structurally independent
even though the columns look similar today.

## What was built, by file

**Migrations**

- `supabase/migrations/20260815163425_consumer_delivery_locations.sql` — `delivery_locations`
  table (`address_line`, `state`, `lga`, `latitude`, `longitude`, plus the same optional
  PostGIS `geolocation` column added to `farm_locations` in phase 2, for parity). `unique
  (profile_id)` — one address per consumer, matching "keep it short" from spec section 7.9.
  Owner-only select/insert/update RLS, same pattern as every other table.
- `supabase/migrations/20260815163428_avatars_storage_bucket.sql` — `avatars` storage
  bucket, public read (avatars are meant to be seen by the other party, not sensitive),
  write access RLS-scoped to a `{user_id}/...` folder convention.

**Screens** (all built on a new shared `AuthStepScreen` layout — Back button + centered leaf
mark + headline/subtitle + content + footer, staggered per phase 3's established motion
pattern; every one of the five mockups uses this exact chrome)

- `app/(profile)/role.tsx` — not in the uploaded designs, built fresh. Two `RoleCard`s
  ("I am a farmer" / "I am a consumer"), each with an icon (`seedling` / `shopping-basket`)
  and a short hint line. Tapping navigates straight to phone entry with the role as a param
  — no separate "Continue" button, matching how immediate the original spec's role-card
  interaction was meant to be.
- `app/(auth)/phone.tsx` — Nigeria-locked phone entry (flag + `+234`, not editable, per
  instruction). `react-hook-form` + `zod` + `libphonenumber-js` validate on blur. Calls
  `signInWithOtp` with `shouldCreateUser` mirroring signup/login mode exactly (spec section
  7.3's explicit warning about orphan accounts on mistyped login numbers). 60s client
  cooldown on Send Code. See "Known gaps" for what abuse protection is and isn't in place.
- `app/(auth)/verify.tsx` — 6-digit `OtpInput` (single hidden `TextInput` with
  `textContentType="oneTimeCode"`/`autoComplete="sms-otp"` driving 6 visual boxes, for
  autofill support), auto-submits on the 6th digit, masked phone display, Resend with the
  same 60s cooldown, distinguishes expired vs. incorrect codes, dev-bypass banner when
  `DEV_OTP_BYPASS` is active. On success, writes `role` + `step: 'identity_pending'` (signup
  only), then routes by role: consumer → `consumer-identity`, farmer →
  `farmer-coming-soon`, login → `(app)`.
- `app/(profile)/consumer-identity.tsx` — full name, `zod`-validated non-empty. Writes
  `full_name`, refreshes the auth store's cached profile (needed by the next screen's avatar
  initials), step stays `identity_pending`.
- `app/(profile)/consumer-photo.tsx` — `AvatarPicker` (dashed ring, initials fallback via a
  new `getInitials` helper), Take Photo/Select Gallery (`expo-image-picker`), Skip pill.
  Compresses via `expo-image-manipulator` (1024px max, 0.7 quality, per spec 7.6) before
  uploading to the `avatars` bucket. Writes `avatar_url` (or `null` if skipped) and advances
  `step` to `location_pending` either way — the photo step is genuinely optional, per spec.
- `app/(profile)/consumer-location.tsx` — "Use my current location" (green, per decision 4)
  shows a rationale `Alert` **before** the OS permission prompt (spec 7.7's explicit
  requirement), then detects + reverse-geocodes via a new `detectCurrentAddress` helper,
  filling the address field. Manual entry always available — permission denial isn't a dead
  end. Writes to `delivery_locations` (upsert on `profile_id`), advances `step` to
  `complete`, routes to `(app)`.
- `app/(profile)/farmer-coming-soon.tsx`, `app/(app)/index.tsx` — temporary placeholders so
  a farmer who completes OTP, or an existing user logging in, lands somewhere real instead
  of an unmatched route. Same pattern as `app/browse.tsx` from phase 3.

**New shared components**

- `src/components/layout/AuthStepScreen.tsx` — the shared chrome described above.
- `src/components/ui/TextField.tsx`, `PhoneField.tsx`, `OtpInput.tsx`, `RoleCard.tsx`,
  `AvatarPicker.tsx`, `PhotoActionPill.tsx`, `Pill.tsx` (generic pill — `SignInPill` now just
  wraps it, since the profile-photo screen's Skip pill is visually identical).
- `src/hooks/useCooldown.ts`, `src/lib/initials.ts`, `src/lib/avatarUpload.ts`,
  `src/lib/reverseGeocode.ts`.
- `src/i18n/strings.ts` — every string on this phase's five screens matches the uploaded
  mockups verbatim; the role screen's headline/subtitle (not in any mockup) were written to
  match this flow's established question-form pattern ("What's your...", "Where should...").

## Deviations from the spec and why

- **Phone field is underlined, not the filled-pill `TextField` used everywhere else.** The
  mockup shows a distinct style for this one field (large inline `+234` prefix, bottom
  border, no fill) — matched exactly rather than forcing consistency with `geometry.textInput`.
- **Country code is hardcoded, not a real picker.** Per instruction ("that cannot be editable
  for now"). `libphonenumber-js` is still used for Nigeria-specific validation/E.164
  formatting — swapping in a real country picker later is additive, not a rewrite.
- **`Button` gained an optional `icon` prop** (used by "Use my current location"'s crosshair
  icon) rather than a one-off variant, since it's a natural, minimal extension of an existing
  primitive already used everywhere.
- **`delivery_locations`' `lga` field is approximated from the geocoder's `subregion`.**
  Nigeria's LGA administrative tier doesn't map cleanly onto the generic iOS/Android
  reverse-geocoding categories; `subregion` is the closest available field. Flagging in case
  this needs to be more precise later (e.g. a proper Nigeria LGA lookup service).

## Bugs found and fixed

- **`Button`'s `disabled` prop never actually disabled the button.** It dimmed the opacity
  but never passed RN's native `disabled` to the underlying `Pressable`, so `onPress` still
  fired every time regardless. Harmless while Welcome's feature-flagged buttons wanted
  exactly that (dimmed but still tappable, to show a "Coming soon" toast), but wrong for this
  phase's loading/cooldown states, where a disabled Send Code button must not double-submit.
  Confirmed nothing in the codebase still relied on the old "disabled but tappable" behavior
  before fixing it to genuinely block `onPress`.
- **`expo-image-picker`'s `MediaTypeOptions` and `expo-image-manipulator`'s `manipulateAsync`
  are both deprecated** in the installed SDK 57 versions (confirmed by reading their type
  definitions before writing code against them, not discovered via a build failure) — used
  the current APIs instead (`mediaTypes: ['images']`, and the `ImageManipulator.manipulate()`
  chainable context class) to avoid shipping against APIs already marked for removal.

## Known gaps — flagged, not silently built around

- **Abuse protection is incomplete.** The spec calls for captcha on the send step and "60s
  client cooldown enforced server-side, max 5 sends per number per hour." Implemented: the
  60s client-side cooldown (real UX protection against double-taps). Not implemented: captcha
  (no site key/provider configured — same "build the real path, flag the gap" pattern as
  `DEV_OTP_BYPASS` for Twilio in phase 1) and genuine server-side per-number rate limiting
  (would need either an Edge Function wrapping the OTP send, since a client can't be trusted
  to self-enforce a security control, or configuring Supabase's dashboard-level SMS rate
  limits — which are global/per-project, not literally "per number," so only a coarser
  approximation of what the spec asks for). Both need a decision before this ships for real
  users, not just before more phases are built.
- **`app/(profile)/role.tsx` sits in the `(profile)` route group** even though it's now
  reached *before* authentication — kept the original spec's file location since expo-router
  groups are purely organizational and don't affect behavior, but flagging the naming
  mismatch in case it's confusing later.
- Carried over, still open: logo SVGs are Photoshop rasters, iOS has no SF Pro fonts, the
  `bank_accounts` INSERT-time self-verification gap (phase 2), and the Sign In/Skip pill's
  chevron is a plain `»` character even though `@expo/vector-icons` is now a dependency.

## Verification: exact commands run and results

- `npx tsc --noEmit` — run after every major addition (role screen, phone, verify, each
  consumer screen, RLS test extension); clean throughout, no accumulated errors.
- `npx expo-doctor` — `20/21 checks passed`, same pre-existing, already-deferred
  patch-version finding as prior phases, nothing new.
- `npx expo export -p android --output-dir <tmp>` — succeeded, 2085 modules (up from 1854
  pre-phase, expected given 8 new screens + 6 new native/form dependencies), same 37 assets
  as before — confirms none of the new native modules (image-picker, image-manipulator,
  location) needed their own bundled binary assets, and the `FontAwesome5` subpath-import
  fix from phase 3 held even with the new icon usage on `Button`. Test export directory
  deleted afterward.
- **RLS test** (`npx tsx scripts/test-rls.ts`), extended to cover `delivery_locations`
  alongside the existing three tables — 22 assertions, all passing:
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
  ```
  Cleanup confirmed (zero users remained afterward).
- `npx supabase migration list --linked` — both new migrations show matching local/remote
  timestamps.

## Open questions or decisions that had to be guessed

- The captcha/server-side-rate-limit gap above needs an explicit decision, not just a flag,
  before this flow handles real phone numbers.
- Whether `delivery_locations.lga`'s geocoder-`subregion` approximation is accurate enough
  for Nigerian addresses in practice — untested against real GPS coordinates in Nigeria.
- Whether `(profile)/role.tsx`'s location in the route-group structure should be reorganized
  now that its position in the user journey has changed, or left as-is.

## Post-review fixes

Two issues raised after running the phone screen on a real device (Android, per the
screenshot): a typography mismatch against the design, and a runtime error on Send Code.

### 1. Typography — Archivo Expanded was leaking into every screen, not just Welcome

**The bug.** `AuthStepScreen` (used by every screen this phase — role, phone, verify, all
three consumer screens) rendered its headline with `typography.h2` and subtitle with
`typography.body`. `h2` shares the same `header` family as Welcome's `h1` — Archivo Expanded
on Android — so "What's your Mobile Number?" was rendering in the brand/display typeface
meant only for Welcome, not the neutral system-ish typeface the design actually calls for.

**The fix.** Two new tokens in `typography.ts`, built on the existing `body` family (Inter on
Android, system-font fallback on iOS — never Archivo Expanded) rather than a new one:

```ts
stepHeadline: { ...body('semibold'), fontSize: 30 },
stepSubtitle: { ...body('semibold'), fontSize: 13, letterSpacing: -2 },
```

`AuthStepScreen` now uses these instead of `h2`/`body`. Requested values: SF Pro Semibold 30
for the headline, 13/semibold/-2 letter-spacing for the subtitle. "SF Pro" specifically can
only ship on iOS (Apple's license doesn't permit it on Android — the reason this project's
whole platform-split typography system exists in the first place, per phase 1). On iOS, the
existing system-font fallback already renders as real San Francisco/SF Pro at the requested
weight, so no further change was needed there. On Android, Inter Semibold is what was already
established as the licensed substitute for anything in the "body" family — applied here too,
now that Archivo Expanded is correctly scoped to Welcome only.

One correction mid-fix: initially wrote the subtitle's `letterSpacing` as `-0.2`, not the
`-2` actually requested — caught and fixed before running the export/typecheck pass, not
after.

Verified: `npx tsc --noEmit` clean, `npx expo export -p android` succeeded (2085 modules,
same 37 assets — a pure styling change, no new assets).

### 2. "Unsupported phone provider" — not a bug, but the error message was unhelpful

**What's happening.** This is Supabase Auth's own error, returned because no SMS provider
(Twilio) is configured for the project yet — exactly the state phase 1's `DEV_OTP_BYPASS`
and this phase's "known gaps" section already flagged as expected during development. It
isn't a client-side validation failure (the number itself parsed and validated correctly);
it's the real `signInWithOtp` call failing server-side because there's nowhere to send the
SMS.

**What was fixed.** Per the request, moving to Supabase's dashboard-configured test phone
numbers (Authentication → Sign In / Providers → Phone → Test OTPs) — the path the original
build spec itself already named as preferable to the dev bypass — rather than continuing to
block on Twilio. No code change was required for test numbers to work: they go through the
exact same `signInWithOtp`/`verifyOtp` calls already in `phone.tsx`/`verify.tsx`; Supabase
recognizes a configured test number internally and skips the real SMS dispatch. What *was*
fixed: both screens previously surfaced Supabase's raw internal error string verbatim
("Unsupported phone provider"), which is meaningless to anyone testing the flow. Both now
detect this specific error and show `strings.phoneNoSmsProvider` — a message that names the
actual fix (configure a test number) instead of repeating Supabase's internal wording.

**Action needed from you, not code:** add a test phone number + fixed OTP in the Supabase
dashboard, using the same E.164 format `libphonenumber-js` produces (e.g. `+2347037403649`
for `07037403649`). Once added, the existing code should work against it without further
changes — this wasn't a code path that needed building, just configuration this session
can't do from here (it's in the Supabase dashboard, not the repo).

Verified: `npx tsc --noEmit` clean, `npx expo-doctor` 20/21 (same pre-existing patch-version
finding), `npx expo export -p android` succeeded.

## Post-review fixes, round 2 — phone screen layout and typography, more precisely

The round-1 typography fix (Archivo Expanded scoped to Welcome only) was correct in
direction but incomplete against the actual design. Six more corrections, all confirmed by
running the phone screen and comparing directly against `assets/materials/Phone Number.png`.

### What changed, by file

- `src/theme/typography.ts`, `src/theme/useAppFonts.ts` — added a `bold` weight (`Inter_700Bold`,
  loaded from its own subpath per the established barrel-import lesson) since the header
  needed to be bolder than `semibold`. `stepHeadline` now uses `body('bold')`. `stepSubtitle`'s
  `letterSpacing` reverted from `-2` to `0` — the tight tracking from the previous round read
  as cramped/too-close text, which is what "too close" meant here, not the gap between
  headline and subtitle blocks.
- `src/i18n/strings.ts` — `phoneHeadline` now has an explicit `\n` ("What's your\nMobile
  Number?") so "Number" reliably wraps onto the second line with "Mobile," regardless of how
  container width and font metrics would otherwise auto-wrap it.
- `src/components/ui/PhoneField.tsx` — removed the inline `TextInput` placeholder entirely,
  and switched its `typography.h2` (Archivo Expanded) styling to `typography.stepHeadline`
  (the same Inter/system-font family as everywhere else now). "Fill in your correct mobile
  number" was rendering *inside* the input row at 22px — matching neither the design (where
  it's a small caption below the underline) nor making sense as literal placeholder text once
  the "+234" prefix already fills that visual role.
- `app/(auth)/phone.tsx` — the removed placeholder reappears as a static caption below the
  field, in the same slot the validation error uses: hint text by default, replaced by the
  error message when one exists, rather than living inside the input.
- `src/components/layout/AuthStepScreen.tsx` — three changes:
  - `justifyContent: 'center'` on the scroll content (was top-anchored via a large
    `leafWrap` top margin, now centers as a group and reverts to normal top-down scrolling
    once content exceeds viewport height — the standard `flexGrow: 1` + `justifyContent:
    'center'` pattern).
  - `KeyboardAvoidingView`'s Android `behavior` changed from `undefined` (no compensation at
    all) to `'height'` (iOS keeps `'padding'`) — the requested "adjust up when the keypad
    displays" wasn't wired up for Android at all before this.
  - A `footerWrap` with `marginTop: spacing[20]` between the content section and the button —
    previously there was no gap at all between them, relying entirely on incidental spacing
    that wasn't there.

### Verification

- `npx tsc --noEmit` → clean.
- `npx expo-doctor` → `20/21`, same pre-existing patch-version finding.
- `npx expo export -p android --output-dir <tmp>` → succeeded, 2087 modules, 38 assets (one
  more than before: `Inter_700Bold.ttf`, appearing as its own single file — confirms the
  subpath-import fix from phase 1/3 held for this new weight too, not just the original
  three). Test export directory deleted afterward.

### Open question

The Android `KeyboardAvoidingView` behavior change (`'height'` instead of no behavior) is a
standard, commonly-recommended fix for this exact symptom, but keyboard interaction is
something I can't verify without a device — confirm it actually feels right when you run it,
particularly that it isn't double-compensating if the OS's own `adjustResize` window mode is
also doing something here.

## What's next

Phase 5 per the original build order (routing gate + resume logic) still applies, but now
needs to account for this phase's restructuring — specifically, the gate's precedence table
needs a role-selection branch for users who signed up but haven't picked a role yet (a state
that didn't exist in the original spec, where role selection came after auth). Farmer
identity/location/bank screens (originally phase 7) remain explicitly deferred per this
session's direction.
