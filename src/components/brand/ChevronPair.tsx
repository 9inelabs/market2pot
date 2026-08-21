import Svg, { Path } from 'react-native-svg';

type Props = {
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
};

// The Sign In pill's "»". Drawn rather than typed: the design frame renders
// it as two stroked chevrons (2pt, round caps, 14x11.2 overall), which a
// literal » glyph doesn't match at any weight — it's a solid, much smaller
// punctuation mark whose size and position are at the mercy of the font.
export function ChevronPair({ width, height, color, strokeWidth }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 14 11.2" fill="none">
      <Path
        d="M1 1.4 L5.2 5.6 L1 9.8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7.8 1.4 L12 5.6 L7.8 9.8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
