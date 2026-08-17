# Phase 3 — Intro and Welcome Screens

The two onboarding entry screens (build spec sections 7.1, 7.2), built on the phase 1
theme/motion primitives and the phase 2 auth store.

## Blockers checked before writing code

- **Hero illustration asset.** Welcome calls for a hero illustration filling the upper ~40%
  of the screen. No such asset exists anywhere in `assets/` — only the two logo files and
  the four full-screen mockup SVGs, which section 1.1 explicitly says are reference-only and
  must not be rendered directly. Raised to the project owner, who chose to reserve the space
  with a placeholder for now (see `HeroPlaceholder` below) rather than pause the screen.
- **Wordmark content, verified rather than assumed.** Section 7.1 describes the wordmark as
  reading "market2pot" / "fresh from farm". Rather than guess whether that's baked into the
  `word mark text.svg` asset or needs to be rendered as separate live text, the embedded
  base64 PNG was decoded and viewed directly. It's a single composed image containing both
  "market2pot" and the tagline — actually "fresh from farm **to home**", the spec's line was
  a paraphrase, not a literal quote. Confirms the `Wordmark` component built in phase 1 (a
  single SVG render, no separate tagline text) was already correct.

## What was built, by file

**Created**

- `app/(onboarding)/intro.tsx` — logo/wordmark via `IntroAnimation`, runs the session check
  (via the auth store's `initializing` flag) concurrently with a 1200ms minimum display
  timer, and navigates to `welcome` once both resolve. See "Deviations" for what it does and
  doesn't decide about routing.
- `app/(onboarding)/welcome.tsx` — top bar (leaf mark + wordmark + `SignInPill`), hero
  placeholder, headline/subtitle, `Browse products` / `Get Started` / social row, footer.
  `Get Started` and `Sign In` both route to `/(auth)/phone` with a `mode` param
  (`signup`/`login`) per spec — that route doesn't exist until phase 4, so tapping either
  today lands on Expo Router's default unmatched-route screen. Expected, not a bug.
- `src/components/motion/IntroAnimation.tsx` — the logo+wordmark visual with a fade/scale
  entrance; its entire body is the named swap point for a future Lottie animation.
- `src/components/marketing/HeroPlaceholder.tsx` — the hero-illustration placeholder
  decided above; entire body is the swap point for the real asset once exported.
- `src/components/ui/Button.tsx` — primary/secondary button, shared geometry tokens. See
  "Bugs found and fixed" for a real rendering bug caught here.
- `src/components/ui/SocialButton.tsx` — the ~188×41 Google/Apple buttons.
- `src/components/ui/SignInPill.tsx` — the 90×39 top-right pill. "Chevrons" rendered as a
  plain `»` character rather than pulling in `@expo/vector-icons` for two static glyphs —
  see "Deviations".
- `src/components/feedback/ComingSoonToast.tsx` + `useComingSoonToast.ts` — the toast for
  the three feature-flagged-off buttons (Google, Apple, guest browse), shared across all
  three so only one toast shows at a time.

**Changed**

- `src/theme/tokens.ts` — added `withOpacity(hex, alpha)`. Needed because
  `geometry.secondaryButton.opacity` (0.15) is the *fill's* alpha, not something that can be
  applied as the whole `View`'s `opacity` style — see "Bugs found and fixed".
- `app/_layout.tsx` — added `SafeAreaProvider` (from `react-native-safe-area-context`),
  needed for the first time by `welcome.tsx`'s `SafeAreaView`.
- `app/index.tsx` — replaced the phase-1 proof-of-concept content with
  `<Redirect href="/(onboarding)/intro" />`. Still temporary: phase 5's routing gate
  replaces this file with the real session/resume logic from spec section 9.

## Deviations from the spec and why

- **Intro always proceeds to welcome; it doesn't implement the resume-aware branching from
  section 9.** Section 9's precedence table describes the *root* gate deciding whether intro
  is shown at all (only when there's no session) — by the table's own wording ("No session →
  intro → welcome"), intro's job is the animation/timing mechanics, not re-deciding where to
  go next. Building that branching into intro now would mean implementing phase 5's routing
  table two phases early, based on a guess about a genuinely ambiguous cross-phase detail.
  Deferred to phase 5, with a `TODO` comment at the call site.
- **Wordmark's top-bar width wasn't specified.** Section 7.1 gives intro's wordmark size
  (~190×57) but section 7.2 only gives welcome's leaf mark size (~35×38), not the accompanying
  wordmark's. Scaled the wordmark to the leaf mark's height (38pt) using the asset's own
  aspect ratio (831:231 ≈ 3.6:1), giving ~137×38. Noted inline in the component.
- **"Chevrons" on the Sign In pill rendered as a literal `»` character**, not an icon from a
  library. No icon package was in the dependency list, and `@expo/vector-icons` isn't
  installed in this project (it ships with Expo's default/tabs template, not the
  `blank-typescript` base this project was built from). A double-angle-quote character reads
  as double chevrons without adding a dependency for two static glyphs; swap for a real icon
  if the rendered result doesn't match the design closely enough.
- **`ScrollView` added to welcome.tsx**, not specified explicitly in the spec. With a hero
  block, headline, subtitle, four buttons, and a footer, the content doesn't reliably fit
  375×667 (iPhone SE) without scrolling — and the spec elsewhere requires verifying at that
  exact size. Chose scroll-if-needed over the alternative (shrinking spacing to force a fit),
  since the geometry tokens (button heights, hero proportion) are specified as fixed values,
  not values that should compress under pressure.

## Bugs found and fixed

- **`Button`'s secondary variant would have made its own label unreadable.** The spec gives
  secondary as "fill harvestGreen @ ~15% opacity". The first draft applied that as the
  `View`'s `opacity: 0.15` style — but `opacity` cascades to all children, so the button's
  text would have rendered at 15% opacity too, not just the fill. Fixed by converting the
  fill to an explicit `rgba()` background color instead (via the new `withOpacity` token
  helper), leaving the text fully opaque. Caught by re-reading the spec's own wording ("fill
  ... @ opacity", not "button @ opacity") against what the first draft actually did, before
  ever running it — not caught by a tool, so worth flagging as the kind of thing that only
  shows up on an actual device/simulator otherwise.
- **`height: '40%'` on the hero container would not have resolved.** React Native percentage
  heights need an ancestor with an already-resolved height; the hero `View`'s parent is a
  `ScrollView` content container, which is itself sized by its own content — a circular
  dependency that (depending on RN version behavior) either collapses to 0 height or is
  simply ignored. Fixed by computing the height explicitly from `useWindowDimensions()`
  (`Math.max(windowHeight * 0.4, 240)`) instead of a CSS percentage. Also caught by
  inspection before running — this class of bug doesn't reliably surface as a build error,
  only as a visibly broken layout on device.

## Verification: exact commands run and results

- `npx tsc --noEmit` → clean.
- `npx expo-doctor` → `20/21 checks passed`. The 1 failure is the pre-existing, already-
  deferred patch-version drift on `expo`/`expo-constants`/`expo-linking`/`expo-router`
  (upstream releases between sessions, unrelated to this phase's work, owner already chose
  to leave it for now).
- `npx expo export -p android --output-dir <tmp>` → succeeded, 1834 modules, 33 assets (same
  asset set as phase 2 — no new binary assets were added this phase, since the hero
  placeholder and chevron are drawn with `View`/`Text`, not images). Confirms
  `SafeAreaProvider`, the `(onboarding)` route group, `Redirect`, and all new components
  resolve correctly through Metro, not just `tsc`. Test export directory deleted afterward.

## Open questions or decisions that had to be guessed

- Whether the placeholder hero block and the `»` chevron are acceptable as temporary
  stand-ins, or should be prioritized for real assets before phase 4.
- Whether `@expo/vector-icons` should be added as a real dependency for chevrons/other icons
  needed in later phases (phone country-code selector, OTP screen, etc.) rather than
  continuing to lean on Unicode characters case-by-case.
- Carried over from earlier phases, still open: logo SVGs are still Photoshop rasters, iOS
  still has no SF Pro font files, and the `bank_accounts` INSERT-time self-verification gap
  (phase 2, fix #2) is unresolved.

## Post-review fixes

Six changes requested after reviewing the running Welcome screen.

### What changed, by file

- `src/components/marketing/HeroPlaceholder.tsx` → renamed to
  `src/components/marketing/HeroIllustration.tsx`. The project owner supplied
  `assets/design/hero-illustration.png` (494×716, transparent background); the component now
  renders it via `Image` with `resizeMode="contain"` instead of the placeholder text. The
  "swap point" language in the original report is resolved — this is the real asset now, not
  a stand-in.
- `src/components/brand/GoogleIcon.tsx` — new. A hand-built multi-color SVG "G" (via
  `react-native-svg`, already a dependency) since no official Google asset was supplied. See
  "Deviations" below — this is a best-effort reproduction from memory, not a verified asset.
- `src/components/ui/SocialButton.tsx` — now renders `GoogleIcon` for the Google button and
  `@expo/vector-icons`'s `FontAwesome5` "apple" glyph (monochrome — there's no colored
  variant in Apple's own brand guidelines) for the Apple button. The `disabled` prop and its
  40%-opacity styling were removed entirely: both buttons now always render at full opacity.
  Tapping still shows the "Coming soon" toast when the corresponding feature flag is off —
  that gating now lives entirely in `welcome.tsx`'s `onPress`, not in the button's own
  appearance.
- `src/config/features.ts` — `ENABLE_GUEST_BROWSE` flipped from `false` to `true`. Per the
  project owner: guests can browse without an account; sign-in is only required at order
  time. `ENABLE_GOOGLE_AUTH`/`ENABLE_APPLE_AUTH` remain `false` — only their *visual* dimming
  was removed, not the underlying flags, since actual OAuth isn't implemented.
- `app/browse.tsx` — new, temporary. Marketplace/browse screens are explicitly out of scope
  for this auth/onboarding build (spec section 0), so there's nowhere real for "Browse
  products" to go yet. Raised to the project owner, who chose a real (if bare) placeholder
  route over a silent no-op, so the button is genuinely functional today. Clearly marked
  TEMPORARY; nothing else references it, so it's a clean swap when marketplace scope begins.
- `src/components/marketing/LeafWatermark.tsx` — new. Absolutely positioned, non-interactive
  (`pointerEvents="none"`) `LeafMark` behind all Welcome screen content at 7% opacity, sized
  to `windowWidth * 1.4` so it bleeds off the edges. Not from the original spec — a direct
  request. Scoped to Welcome only (not Intro, which already features the leaf mark
  prominently as primary content).
- `app/(onboarding)/welcome.tsx` — wired in `HeroIllustration`, `LeafWatermark`, and the new
  `GoogleIcon`-bearing `SocialButton`; `Browse products` now calls `router.push('/browse')`
  when enabled; hero→text-block gap reduced to a literal `5` (was `spacing[16]`, i.e. 16);
  Browse→Get Started gap reduced to a literal `5` (was part of a uniform `spacing[16]` gap
  across all three button-stack children). Both `5`s are outside the 8pt spacing scale —
  used as given rather than rounded to the nearest token, since they were specified as exact
  values.

### Deviations from the spec and why

- **`GoogleIcon` is a best-effort reproduction, not a verified asset.** No official Google
  brand asset was supplied. The SVG path data is reproduced from memory of the
  widely-distributed multi-color "G" mark used across countless "Sign in with Google"
  buttons — I'm reasonably confident in it given how common that exact icon is, but I can't
  visually verify my own output. Please check it renders correctly and looks right; swap for
  an official asset if it's off.
- **Apple's icon stays monochrome.** The request said "the google icons should be the
  colored icons," naming Google specifically. Apple's own brand guidelines for "Sign in with
  Apple" specify a black or white silhouette only — there's no colored variant to use even if
  the request had included it.
- **Literal `5` used instead of a spacing-scale token.** The 8pt scale (`spacing.ts`) doesn't
  contain `5`; used the exact value given rather than rounding to `4` or `8`.

### Bugs found and fixed

- **`StyleSheet.absoluteFillObject` doesn't exist in this React Native version** (caught by
  `tsc`, not at runtime). The installed RN version types only export `StyleSheet.absoluteFill`
  — already the plain style object (`{position: 'absolute', left: 0, right: 0, top: 0,
  bottom: 0}`), not a registered style ID as in older RN versions. `LeafWatermark` was
  written against the older API from memory; fixed to spread `StyleSheet.absoluteFill`
  instead.

### Verification: exact commands run and results

- `npx tsc --noEmit` → one error initially (`absoluteFillObject` above), clean after the fix.
- `npx expo-doctor` → `20/21 checks passed` — same pre-existing, already-deferred
  patch-version finding as before, nothing new.
- `npx expo export -p android --output-dir <tmp>` → succeeded, 1853 modules, 37 assets.
  `assets/design/hero-illustration.png` (421KB) now appears in the asset list, confirming the
  real image is bundled and resolves correctly through Metro (not just `tsc`). The
  `FontAwesome5` subpath import (established in an earlier fix this session) kept the icon
  font footprint to the same 3 files as before — confirmed by re-inspecting the asset list
  rather than assuming the earlier fix still held. Test export directory deleted afterward.

### Open questions or decisions that had to be guessed

- Whether `GoogleIcon`'s reproduced path data is visually correct — needs a look at the
  actual rendered button, not just confirmation that it compiles and bundles.
- Whether `app/browse.tsx`'s placement (top-level route, not in any of the spec's route
  groups) is where a future real marketplace entry point should live, or whether it'll move
  when that scope begins.
- Everything listed as open in the original phase 3 report is now narrower: the hero
  illustration blocker is resolved (real asset in place). Still open: logo SVGs are still
  Photoshop rasters, iOS still has no SF Pro font files, the `bank_accounts` INSERT-time
  self-verification gap (phase 2, fix #2) is unresolved, and the Sign In pill's chevron is
  still a plain `»` character (not touched by this round of fixes, even though
  `@expo/vector-icons` is now a real dependency — could be revisited for consistency).

## Post-review fixes, round 2 — staggered section reveal

One change: the welcome screen was appearing all at once (or, depending on the platform's
default stack transition, as a single whole-screen fade) instead of revealing section by
section — the cascading reveal pattern named explicitly in build spec section 10.1 and
described by the project owner as "like the Access Bank app."

**Root cause: the primitive existed but was never used.** `src/components/motion/Stagger.tsx`
was built in phase 1 specifically for this — each direct child gets its own delayed
fade+slide-up entrance — but no screen actually rendered its content through it.
`app/(onboarding)/welcome.tsx` had no `entering` animation anywhere in its tree, so React
Native just rendered it synchronously; whatever fade the project owner was seeing was coming
from somewhere else (most likely the platform-default Stack screen transition, not any
per-section animation this codebase controls).

**Fix.** Wrapped `welcome.tsx`'s five visual sections in `<Stagger initialDelay={80}>`,
matching the exact section breakdown from spec section 10.1's own usage example
(Header/Hero/Title/Subtitle/ButtonGroup): the top bar, the hero illustration, the
headline+subtitle block, the button stack (Browse/Get Started/social row grouped as one
section — not staggered individually, per the rule against giving the primary CTA a long
delay), and the footer. Used `Stagger`'s existing defaults (`step={70}`, 380ms duration) —
nothing about the primitive itself needed to change, only its actual use.

No other screens were touched. `app/(onboarding)/intro.tsx` still uses a single `FadeIn` on
its one logo block via `IntroAnimation`, not `Stagger` — intro has one visual unit, not
multiple sections, so there's nothing to cascade there. Every screen from phase 4 onward
should use `Stagger` for its content by default, per spec section 10 — this was a gap in
execution, not a gap in the plan.

### Verification

- `npx tsc --noEmit` → clean.
- `npx expo-doctor` → `20/21 checks passed`, same pre-existing patch-version finding.
- `npx expo export -p android --output-dir <tmp>` → succeeded, 1854 modules, same 37 assets
  as before (pure behavior change, no new assets). Test export directory deleted afterward.

### Open question

Whether the resulting timing/feel actually matches what "like the Access Bank app" means in
practice — that's a subjective call that needs eyes on the running app, not something a
bundle check can confirm.

## Post-review fixes, round 3 — removed spring bounce, switched to timing/ease-out

Feedback after seeing round 2 running: the stagger reveal bounced too much and the fade read
as glitchy, not clean. Wanted: no bounce, minimal/generic, "Apple style."

**Root cause.** Both `Stagger.tsx` (used by `welcome.tsx`) and `IntroAnimation.tsx` (used by
`intro.tsx`) drove their entrances with `.springify().damping(18)` — spring *physics*, not a
fixed-duration curve. A damping value of 18 is on the lower/underdamped side for Reanimated's
spring defaults, which is exactly what produces visible overshoot: the view moves past its
final position and settles back, read as "bouncing." That's independent of the staggering
logic itself, which was untouched and correct.

**Fix.** Replaced spring physics with plain timing animations using an ease-out cubic curve
in both components:

```
FadeInDown.delay(...).duration(350).easing(Easing.out(Easing.cubic))
```

No `.springify()`, no `.damping()` — a fixed-duration deceleration into place with no
overshoot, which is the actual mechanism behind the "clean, seamless, Apple-style" motion
being asked for (iOS system transitions are timing-curve-based, not spring-based, for exactly
this kind of entrance). `Stagger`'s `duration` went from 380ms to 350ms and `IntroAnimation`'s
from 700ms to 500ms — shorter, since a curve with no bounce reads as complete earlier than a
spring that's still oscillating.

Also dropped `Stagger`'s `distance` prop. It was never wired to anything in the original
implementation (verbatim from the build spec's own snippet) — `FadeInDown` uses its own fixed
preset offset, and the prop had no effect on it. Removing it makes the component honest about
what it actually controls; confirmed nothing calls it with `distance` before deleting.

### Verification

- `npx tsc --noEmit` → clean.
- `npx expo-doctor` → `20/21 checks passed`, same pre-existing patch-version finding.
- `npx expo export -p android --output-dir <tmp>` → succeeded, 1854 modules, same 37 assets
  (pure behavior change). Test export directory deleted afterward.

### Open question

Whether 350ms/500ms durations feel right, or need further tuning once seen running — timing
"feel" isn't something a bundle check can confirm either way.

## What's next

Phase 4: Phone entry and OTP verification screens (`(auth)/phone.tsx`, `(auth)/verify.tsx`),
including the dev OTP bypass, captcha, and rate limiting called for in spec section 4.2 and
7.3–7.4.
