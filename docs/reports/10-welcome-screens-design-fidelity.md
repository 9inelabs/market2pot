# Report 10 — Welcome and Welcome Back rebuilt to the design frames

Not a new build phase — a fidelity pass over the two brand screens from phase 3/9, which
the project owner reported did not match the uploaded designs.

## The source of truth that was found

`assets/design/Onboarding.svg` is not a flattened mockup: it is the **Welcome screen's own
428x926 Figma frame**, still carrying every rect's exact `x/y/width/height/fill/fill-opacity`
and every text run as outlined paths. Rather than re-eyeball the raster, the frame was mined
directly:

- Rect geometry read straight out of the markup.
- Text positions/sizes recovered by parsing each outlined path's subpaths, clustering them
  into lines, and taking each line's ink box.
- Font sizes then solved exactly, by parsing `hmtx`/`cmap` out of
  `assets/fonts/ArchivoExpanded-*.ttf` and fitting the measured ink widths. Both headline
  lines independently solve to ~23.5pt in Archivo Expanded SemiBold, confirming **24**, not
  the 32 (`typography.h1`) the screen was using.

Everything in `welcome.tsx`'s `D` constant is a number from that frame. The uploaded
Welcome Back mockup has no vector equivalent, so its numbers are read off the raster — see
"Guessed" below.

## What was built, by file

**Created**

- `src/theme/useDesignScale.ts` — `ds(designPx)` scaling off viewport width against the
  428x926 frame, plus `DESIGN_STATUS_BAR`. 428:926 is within half a percent of every modern
  phone aspect, so the frame maps essentially 1:1 on real hardware.
- `src/components/brand/ChevronPair.tsx` — the Sign In pill's `»` as the two stroked
  chevrons the frame actually draws (2pt, round caps, 14x11.2). Closes a "known open item"
  that had been carried since phase 3.

**Rewritten**

- `app/(onboarding)/welcome.tsx` — brand card + Sign In pill, hero, headline, subtitle,
  the two full-width buttons, the social row, footer. Laid out in flow using the frame's
  box-to-box gaps; the hero is the single flexing block, so every element above and below
  it lands on its frame coordinate (verified numerically, below).
- `app/(onboarding)/welcome-back.tsx` — wordmark, leaf, "Welcome Back." / name / green
  subtitle, the two circular shortcuts with badges, Browse Produce / Log Out, hint, sign-up
  row.
- `src/components/brand/LeafMark.tsx`, `Wordmark.tsx` — `width`/`height` now mean the
  *mark's* box, not the padded canvas (see Bugs).
- `src/components/marketing/PhotoBackdrop.tsx` — full-bleed, no added gradient (see Bugs).
- `src/components/marketing/LeafWatermark.tsx` — the frame's actual rect
  (`x=32 y=169 364x399 @ 7%`) instead of a screen-centred mark at 1.4x viewport width.
- `src/components/marketing/HeroIllustration.tsx` — takes an explicit box; `maxHeight: 100%`
  so it gives height back on a short viewport instead of pushing the buttons off-screen.
- `src/components/ui/Pill.tsx` / `SignInPill.tsx` — real chevrons, warmCream label, the
  frame's soft `dy=4 / σ=17.2 / 17% black` shadow, `scale` prop.
- `src/components/ui/SocialButton.tsx` — goldenWheat fill at 20% behind a 0.5pt goldenWheat
  border (was white on a grey hairline), mark **after** the label, label shortened to
  "Continue with" / "Sign in with" with the full phrase kept as the accessible name.
- `src/components/ui/Button.tsx` — `secondary` corrected to the frame's 20% fill with a
  deepSoil label; new `muted` variant (deepSoil at 30%) for Log Out; primary label is
  warmCream, which is what the frame uses, not pure white; new `textStyle` prop so the
  brand screens can scale their type.

**Changed**

- `src/theme/tokens.ts` — `secondaryButton.opacity` 0.15 → 0.2, new `mutedButton`, exact
  `socialButton` geometry (188.5x40.5 @ r20.25, gap 10.5, 0.5 border), new `brandCard`.
- `src/theme/typography.ts` — `bodyFont()` / `headerFont()` exports (family only, no size),
  since the brand screens scale their own sizes; `fontFamilies.bodyBold` added.
- `src/i18n/strings.ts` — explicit `\n` in the headline and subtitle to match the frame's
  two-line wrap; `welcomeContinueWith` / `welcomeSignInWith` added.
- `src/components/app/CountBadge.tsx` — optional `color` / `size` (welcome-back's cart badge
  is goldenWheat, not the default terracotta).

## Deviations from the design, and why

- **The white brand card on Welcome is not in the vector frame.** The frame draws the leaf
  and wordmark straight onto cream at `x=20 y=60`; the uploaded mockup puts them in a
  rounded near-white card, because the photo backdrop now sits behind them. The card was
  sized from its contents (leaf 35 + gap 5 + wordmark 146 = 186 wide) plus padding measured
  off the mockup, and left-aligned to the same 20pt column as the buttons so the top bar
  lines up with the stack below it.
- **Welcome Back's buttons are 348x52 @ r26**, not the design system's 388x60 @ r30 — that
  screen insets its column by 40 rather than 20, and its buttons are visibly shorter
  relative to the 44pt circular shortcuts above them.
- **Bell/cart shortcuts use Feather**, not FontAwesome5. The mockup's icons are line art;
  FontAwesome5's free set has no regular-weight `shopping-cart`, so matching it within one
  family wasn't possible. One extra 56KB font. This is narrowly about matching two icons in
  a mockup and is *not* a reopening of the settled lucide-react-native question.
- **The `secondary` Button change is global**, affecting five call sites outside these two
  screens (`bank-details` x3, `review-profile`, `ConfirmDialog`). The old green-on-green-tint
  label was a phase-3 guess; the frame's own answer is a deepSoil label on a 20% fill, and
  it is both more legible and more consistent. Flagging it because those screens will look
  slightly different even though they weren't in scope.
- **`LeafMark` / `Wordmark` sizing is likewise a global fix** — `intro.tsx`,
  `AuthStepScreen`, `nearby-farmers`, and `review-profile` will all render their marks
  larger now. That is the correction, not a regression: their sizes were always specified as
  the mark's size, and were silently being shrunk (see Bugs).

## Bugs found and fixed

1. **Both logo SVGs pad their artwork inside a larger viewBox, so every mark in the app was
   drawn far too small.** `logo main.svg` puts a 684x756 image inside a 1080x1080 viewBox;
   `word mark text.svg` puts a 790x196 image at (19, 16) inside 831x231. Rendering the raw
   SVG at `35x38` therefore produced a ~22x24 leaf floating in dead space — 44% undersized —
   and every design frame in this repo measures the *mark*. Both components now scale the
   canvas up, offset it, and clip, so the requested box is the mark's box. Only visible by
   rendering; nothing about it is a type error.
2. **`PhotoBackdrop` double-faded the photo.** `Back Screen.jpg` is an 856x1852 export of
   the whole frame with the fade into warmCream already painted in. The component was
   cropping it to the top 55% and layering a `LinearGradient` over it, which both re-faded
   an already-faded photo and cut it off well above where the design does.
3. **`SafeAreaView` was wrapping `PhotoBackdrop`**, so the photo started below the status bar
   instead of bleeding to the physical top the way the frame does. The nesting is now
   inverted on both screens: backdrop is the root, safe area insets only the content on top
   of it. This also makes the leaf watermark's absolute `y=169` measure from the right
   origin.
4. **The subtitle would not have wrapped where the design wraps it.** "Buy directly from
   local farmers near you" is ~304pt at 16pt in a 388pt column — it fits on one line, but
   the frame breaks it after "farmers". Both the headline and subtitle now carry explicit
   `\n`, following the existing `phoneHeadline` precedent (and iOS's system-font fallback
   would have wrapped them differently again).
5. **Stagger's per-child wrapper swallows `flex`.** The hero is the one block that has to
   absorb the difference between the frame and the real viewport; wrapped by `Stagger` it
   would have collapsed to its content height. It's now animated directly with its own
   `FadeIn`, timing-based with `Easing.out(Easing.cubic)`, consistent with the house rule
   against springs. Same class of trap in welcome-back: a centre-aligned parent shrinks the
   `Stagger` wrappers to their content, which would have left the "stretched" buttons only
   as wide as their labels — the frame stays stretch-aligned and individual items centre
   themselves.

## Verification

```
npx tsc --noEmit
```
Clean, no output.

```
npx expo export --platform android --output-dir <tmp> --no-minify
```
Bundles clean, 6.3MB. Confirmed `Feather.ttf (56KB)` is picked up by the new icon import.

```
node /tmp/verify-layout.js
```
A simulation of `welcome.tsx`'s flow layout at scale 1 on a 428x926 viewport with 44/34
safe-area insets, compared against the coordinates measured out of the design frame:

| element | computed top | frame | delta |
|---|---|---|---|
| brand card | 50.5 | 50.5 | 0.0 |
| sign-in pill | 60.0 | 60.0 | 0.0 |
| hero image | 138.1 | 138.0 | +0.1 |
| title box | 506.0 | 505.9 | +0.1 |
| subtitle box | 568.4 | 568.3 | +0.1 |
| browse products | 632.1 | 632.0 | +0.1 |
| get started | 697.1 | 697.0 | +0.1 |
| social row | 772.4 | 772.3 | +0.1 |
| footer | 827.9 | 828.0 | −0.1 |

Footer bottom to safe bottom: 46.5 (frame: 46.5). Horizontally the buttons are 388 wide at
x=20..408, the pill is 90 wide ending at x=408, and the hero is 247 wide centred at
x=90.5..337.5 — all exact frame values.

**Not verified visually.** No emulator or `adb` is available in this environment, so nothing
here has actually been looked at on a screen. Per this project's own history, a clean
typecheck-and-bundle pass says nothing about how something renders — the leaf-sizing bug
above is exactly that kind of defect, and there may be more of them. The two screens need a
real device pass.

## Guessed, and worth confirming

- **"The login screen" was taken to mean `welcome-back.tsx`.** The second uploaded mockup
  says "Welcome Back.", shows a user's name and a Log Out button, so it is the welcome-back
  interstitial, not `app/(auth)/login.tsx` (phone + password form). `login.tsx` was left
  alone. Say so if the actual login form was meant.
- **`DESIGN_STATUS_BAR = 44`.** The frame's photo bleeds to y=0 but the mockups draw no
  status bar, and the brand card sits at y=50.5 — which a real 59pt status bar would
  overlap. 44 (a typical notch status bar) is the assumed allowance; content is anchored
  that far below the real safe inset. On a device with a taller status bar the top bar sits
  correspondingly lower, and the hero absorbs it.
- **Every Welcome Back number is read off a raster**, so unlike Welcome they are estimates,
  not measurements: wordmark 272 wide, leaf 49x54, "Welcome Back." at 18, the name at 24 bold,
  the green line at 14, and the gap chain between them. Width- and height-derived estimates
  for the name disagreed (~20 vs ~28), so 24 was chosen as the midpoint and because it
  matches Welcome's headline size. A vector export of that screen would settle it.
- Welcome Back's cart badge now needs a real count, so the screen calls `useCart()` and
  `useUnreadNotificationCount()` — two extra queries on an interstitial that previously made
  none.
- The brand card's fill is `rgba(255,255,255,0.92)`; the mockup shows a near-white card but
  the exact value isn't recoverable from a JPEG-compressed raster.

## What's next

- A real device/emulator pass on both screens against the two mockups — the only thing that
  can actually confirm this.
- `expo-linear-gradient` is now unused by app code (PhotoBackdrop was its only consumer).
  Left installed rather than removing a dependency unasked.
- If the Welcome Back mockup can be exported as SVG the way `Onboarding.svg` was, its
  guessed numbers can be replaced with measured ones the same way.

## Follow-up round — backdrop position and Welcome Back type

Owner feedback after the first pass: the photo reached too far down the screen and was
hurting content legibility, and Welcome Back's heading/name pairing didn't have the
design's weight contrast.

**Backdrop is now tunable, and the knobs are documented at the top of
`src/components/marketing/PhotoBackdrop.tsx`:**

- `offsetY` (design pt, negative = up) — slides the photo. The distortion-free control: it
  ends the fade higher and crops the *top* of the band instead, which is uniform produce
  texture. Default **-64**; welcome-back overrides to **-90** via `D.backdropOffsetY`,
  because its wordmark sits higher up the cream than welcome's hero does.
- `heightScale` (1 = the file's own proportions) — squashes/stretches vertically. Pulls the
  fade up without cropping anything, at the cost of compressing the produce; usable to about
  0.85 before round vegetables read as oval.

Both are in design-frame points and scaled per-device, so a value tuned on one phone holds
on all of them. `resizeMode` changed from `cover` to `stretch`: the image box is now
computed to the file's own aspect, so nothing is cropped implicitly and `cover`'s
self-centring crop no longer fights either knob. Whatever the photo doesn't reach is the
container's warmCream, the same color as the photo's own lower two-thirds, so there's no
seam.

The -64/-90 defaults are derived from where the fade lands in the two mockups against where
it lands in the file (~35% of frame height) — still raster estimates, so expect to nudge
them.

**Welcome Back type:**

- New `interFont` export in `src/theme/typography.ts` — Inter by name on *both* platforms.
  `bodyFont()` deliberately doesn't give you Inter on iOS (it honours the spec's SF Pro Text
  intent and currently falls through to the OS system font), but Inter is loaded on both
  platforms by `useAppFonts`, so naming it directly always works. `heading` and `name` now
  use it.
- Sizes rebalanced for the design's contrast: heading **18 → 16** (lineHeight 22 → 20), name
  **24 → 28** bold (lineHeight 29 → 34). Both live in welcome-back's `D` block.

Re-verified: `npx tsc --noEmit` clean, `npx expo export --platform android` bundles clean.
Still not looked at on a real screen.
