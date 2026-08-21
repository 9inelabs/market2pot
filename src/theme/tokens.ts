export const colors = {
  harvestGreen: '#3F7A52', // primary actions
  terracotta: '#C97C4B', // accent (wordmark)
  warmCream: '#F7F1E6', // app background
  deepSoil: '#2A2420', // primary text, dark pills
  goldenWheat: '#E0A63D', // decorative accent ONLY — see note

  // Accessible variant of goldenWheat for text on cream.
  // goldenWheat on warmCream is 1.93:1 and fails WCAG AA.
  // This is 5.01:1. Use for all warning/helper copy.
  goldenWheatText: '#8A5F10',

  surface: '#FFFFFF', // input fields
  skeleton: '#EAE2D4', // skeleton base
  skeletonHi: '#F4EEE2', // skeleton shimmer highlight
  textPrimary: '#2A2420',
  textMuted: '#6B625B',
  danger: '#B3261E',
} as const;

// 8pt spacing scale. Keyed by the raw point value (not semantic tiers like
// sm/md/lg) so nothing beyond what's specified in the design doc is invented.
export const spacing = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
} as const;

// Geometry measured from the reference SVGs (section 2 of the build spec).
export const geometry = {
  screenPaddingButtons: 20,
  screenPaddingInputs: 36,
  primaryButton: {
    height: 60,
    radius: 30,
  },
  // Fill is harvestGreen at 20% (the design frame's own
  // fill-opacity="0.2"), with a deepSoil label — NOT a green one. Both
  // measured off assets/design/Onboarding.svg, replacing an earlier
  // 0.15/green-label guess.
  secondaryButton: {
    height: 60,
    radius: 30,
    opacity: 0.2,
  },
  // "Log Out" on welcome-back: deepSoil at 30%, which lands on the warm grey
  // (#B9B3AB over cream) the design shows.
  mutedButton: {
    height: 60,
    radius: 30,
    opacity: 0.3,
  },
  textInput: {
    height: 70,
    radius: 25,
  },
  // Exact rect from the design frame: 188.5x40.5 @ r20.25, goldenWheat
  // fill at 20% behind a 0.5pt goldenWheat stroke, 10.5 apart.
  socialButton: {
    height: 40.5,
    radius: 20.25,
    width: 188.5,
    gap: 10.5,
    borderWidth: 0.5,
    opacity: 0.2,
  },
  signInPill: {
    width: 90,
    height: 39,
    radius: 19.5,
  },
  // Rounded card the brand lock-up sits in on the photo backdrop. Sized from
  // its contents (leaf + gap + wordmark = 186x38) plus the padding measured
  // off the uploaded welcome mockup.
  brandCard: {
    radius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
} as const;

// Converts a "#rrggbb" color token into an rgba() string at the given alpha.
// For translucent fills (e.g. secondaryButton's 20% tint) — needed because
// View's own `opacity` style cascades to children/text, which is not what
// "fill X @ N% opacity" means in the design doc.
export function withOpacity(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
