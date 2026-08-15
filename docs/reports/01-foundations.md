# Phase 1 — Foundations

Theme, tokens, fonts, strings file, Stagger + Skeleton primitives, brand components.

Written retroactively after the phase-report convention was adopted; content matches what
was reported in-session at the time.

## Blockers surfaced before writing code

Two explicit stop-conditions from the build spec's own ground rules were checked before any
files were created:

1. **Logo SVGs are Photoshop rasters wrapped in SVG.** `grep -c "<image"` returned `1` for
   both `assets/design/logo main.svg` and `assets/design/word mark text.svg` — they are PNGs
   in an SVG wrapper, not real vector paths. Also: these files live in `assets/design/`, not
   `assets/` root as spec section 1.2 assumed.
2. **No SF Pro files in `assets/fonts/`.** Only the three Archivo Expanded `.ttf` instances
   were present (Android fully covered). Nothing for iOS.

Both were raised to the project owner, who decided:

1. Use the raster-wrapped logo SVGs as-is for now; swap for true vectors or `@1x/@2x/@3x`
   PNGs later.
2. iOS temporarily falls back to the OS system font, loudly flagged (dev-time
   `console.warn` + `TODO` comments), until the licensed SF Pro `.otf` files are supplied.

A secondary finding: both embedded data URIs use `xlink:href="data:img/png;base64,...` —
`img/png` is not a valid MIME type (should be `image/png`). Native image decoders typically
sniff PNG magic bytes and ignore the label, so this was expected to still render, but is
flagged here as a latent risk if any stricter parser is introduced later.

## What was built, by file

**Created**

- `src/theme/tokens.ts` — colors, 8pt spacing scale (keyed by raw point value, not semantic
  tiers, to avoid inventing a naming scheme not in the spec), button/input/pill geometry.
  Values taken verbatim from build spec section 2.
- `src/theme/typography.ts` — platform-split type scale (h1/h2/body/label/button/caption).
  Android uses Archivo Expanded (header) + Inter (body), fully bundled. iOS falls back to
  the system font per the decision above; the Android/custom-font code path deliberately
  omits `fontWeight` (see Bugs section) while the iOS system-font fallback uses it.
- `src/theme/useAppFonts.ts` — `expo-font` hook loading Archivo Expanded (3 weights) and
  Inter (3 weights, via per-weight subpath imports — see Bugs section).
- `src/i18n/strings.ts` — flat typed object with every copy string given verbatim in the
  spec. Screens with unspecified copy (OTP resend/expired/incorrect states, consumer flow,
  farm location) are called out in a header comment rather than invented.
- `src/components/motion/Stagger.tsx` — spec's staggered-entrance wrapper, with one
  compile-fix (see Bugs section).
- `src/components/skeleton/Skeleton.tsx` — palette-matched wrapper over `moti/skeleton`.
- `src/components/skeleton/useMinimumLoadingDuration.ts` — 300ms-floor hook implementing the
  "no skeleton flash" rule from spec section 10.2.
- `src/components/brand/LeafMark.tsx`, `src/components/brand/Wordmark.tsx` — typed SVG
  wrappers. `width`/`height` are required props with no default, since usage sizes vary a
  lot between screens (e.g. ~112×123 on intro vs ~35×38 on welcome).
- `src/config/features.ts` — `ENABLE_GOOGLE_AUTH`, `ENABLE_APPLE_AUTH`,
  `ENABLE_GUEST_BROWSE`, `DEV_OTP_BYPASS`, gated exactly as specified.
- `src/types/svg.d.ts` — TypeScript module declaration for `*.svg` imports.
- `metro.config.js` — SVG-as-component transform via `react-native-svg-transformer`.

**Changed**

- `src/lib/supabase.ts` — moved from root `lib/` to `src/lib/` to match the spec's `src/`
  layout convention (content unchanged; the AppState-refresh upgrade is phase 2 work).
- `tsconfig.json` — `@/*` path alias repointed from `./*` to `./src/*`.
- `app/_layout.tsx` — now loads fonts via `useAppFonts` and holds the native splash screen
  until fonts are ready or errored. Still just `GestureHandlerRootView` + `Stack` otherwise;
  auth provider and routing gate are phases 2 and 5.
- `app.json` — `expo-font` and `expo-splash-screen` config plugins added automatically by
  `expo install`.
- `app/index.tsx` (still the temporary proof screen) — extended to also render the brand
  marks, typography tokens, a `Stagger` entrance, and a `Skeleton`, so all phase-1
  primitives could be visually and mechanically verified through one screen.
- `package.json` — added `expo-font`, `@expo-google-fonts/inter`, `moti`, `react-native-svg`,
  `react-native-svg-transformer`, `expo-splash-screen`, `expo-linear-gradient` (a runtime
  dependency of `moti/skeleton` not listed in the spec's install command, but required for
  it to not crash), `babel-preset-expo` (see phase-0 report note below).

## Deviations from the spec and why

- Logo components render the Photoshop-raster SVGs as-is per the owner's decision above,
  rather than true vector paths.
- iOS typography temporarily uses the system font instead of SF Pro Expanded/Text, per the
  owner's decision above.
- `src/lib/supabase.ts` was relocated from the project's prior `lib/supabase.ts` (set up in
  an earlier session) to match this spec's `src/`-rooted layout, since the spec consistently
  places supporting code under `src/` (theme, i18n, components, config, lib) while `app/`
  stays at the project root for expo-router.

## Bugs found and fixed

- **`Stagger.tsx` compile error**: the spec's snippet used `React.ReactNode` as a type
  without importing the `React` namespace (only named imports `Children`, `isValidElement`
  were imported). Fixed by importing the named `ReactNode` type instead. Same runtime
  behavior, different import.
- **`moti/skeleton` import shape**: the package's `index.js` re-exports `Skeleton` as a
  *named* export (`export { default as Skeleton } from './expo'`), not a default export.
  An initial default import compiled to a nonsensical JSX element type. Fixed with
  `import { Skeleton as MotiSkeleton } from 'moti/skeleton'`. Caught by `tsc`.
- **Inter font over-bundling — only surfaced at `expo export`, not at typecheck.** Importing
  weights from the package's top-level barrel (`@expo-google-fonts/inter`) caused Metro to
  bundle all 20 weight files (~7MB, every weight + italic) because CommonJS interop
  evaluates every `require()` in the barrel file regardless of which named exports are
  actually destructured. `tsc` had no way to catch this since it's a bundle-size effect, not
  a type error. Fixed by importing each weight from its own subpath
  (`@expo-google-fonts/inter/400Regular`, etc.). Confirmed fixed by re-running the export and
  checking the asset list dropped from 48 to 33 entries, with only the 3 requested Inter
  files present.
- **Missing `expo-linear-gradient` dependency**: `moti/skeleton`'s implementation imports
  `expo-linear-gradient` directly at the top of its module, but it wasn't installed (and
  wasn't in the spec's dependency list either). Would have failed to resolve at bundle time.
  Installed explicitly.
- **`babel-preset-expo` resolution failure** (carried over from the phase-0 infrastructure
  setup, re-verified still fixed here): npm nested it under `expo/node_modules` instead of
  hoisting it to the project root, which broke Babel's preset resolution for the
  project-root `babel.config.js` that references it directly. Fixed by pinning it as an
  explicit root-level devDependency.

## Verification: exact commands run and results

- `npx tsc --noEmit` — clean, no errors, run twice (after initial primitives, and again
  after wiring them into the temp screen).
- `npx expo-doctor` — `20/20 checks passed. No issues detected!`, run three times across the
  phase (after dependency installs, after wiring the temp screen, and after the Inter fix).
- `npx expo export -p android --output-dir <tmp>` — first run: succeeded, 2180 modules, but
  asset list showed 48 entries including all 20 Inter weight files (the over-bundling bug
  above). Second run after the Inter subpath fix: succeeded, 2165 modules, 33 assets, only
  the 3 requested Inter weights present. Confirms the SVG transform, font `require()` paths,
  and the `moti` → `expo-linear-gradient` chain all resolve correctly through Metro, not
  just through `tsc`.
- `grep -c "<image" assets/design/*.svg` (targeted at the two logo files) — returned `1` for
  both, confirming the raster-wrapper finding above.
- Test export output directories were deleted after each verification pass; nothing was left
  in the repo or the temp filesystem beyond the session.

## Open questions or decisions that had to be guessed

- Spec section 1.1 says screen copy is "specified verbatim in section 6," but section 6 is
  the data model — the actual copy lives in section 7. Not a blocker; copy was sourced from
  section 7 instead. Flagging in case the mismatch matters elsewhere in the source doc.
- The 8pt spacing scale is keyed by raw point value (`spacing[16]`) rather than semantic
  tier names (`spacing.lg`) — the spec gives values but no naming convention, so a numeric
  key avoids inventing one.

## What's next

Phase 2: Supabase client upgrade (`AppState` auto-refresh listener), the
`profiles`/`farm_locations`/`bank_accounts` migration with RLS, and the auth/zustand store.
