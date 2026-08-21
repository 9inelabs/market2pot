import { useWindowDimensions } from 'react-native';

// Both brand screens (welcome, welcome-back) were drawn against a single
// 428x926 Figma frame — assets/design/Onboarding.svg is that frame, with
// every rect's exact x/y/w/h still in it. Rather than re-guess each value as
// a "close enough" 8pt-scale number, those coordinates are used verbatim and
// scaled uniformly off the viewport width. 428:926 is within half a percent
// of every modern iPhone/Android aspect (390x844, 393x852, 430x932), so the
// frame maps essentially 1:1 on real hardware.
export const DESIGN_WIDTH = 428;
export const DESIGN_HEIGHT = 926;

// The design frame includes the status bar area (its photo bleeds to the
// physical top of the screen), but the mockups don't draw a status bar. Its
// y-coordinates are therefore treated as measured from the top of a nominal
// 44pt status bar — screens subtract this when converting a design y into an
// offset below the real safe-area inset.
export const DESIGN_STATUS_BAR = 44;

// Phones only. Past ~1.2x the design stops reading as a phone layout blown
// up and starts reading as a broken tablet layout, so the frame is pinned and
// centered instead.
const MAX_SCALE = 1.2;

export function useDesignScale() {
  const { width } = useWindowDimensions();
  const scale = Math.min(width / DESIGN_WIDTH, MAX_SCALE);

  return {
    scale,
    // Design px -> device px.
    ds: (value: number) => value * scale,
    frameWidth: DESIGN_WIDTH * scale,
  };
}
