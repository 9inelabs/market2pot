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

## What's next

Phase 4: Phone entry and OTP verification screens (`(auth)/phone.tsx`, `(auth)/verify.tsx`),
including the dev OTP bypass, captcha, and rate limiting called for in spec section 4.2 and
7.3–7.4.
