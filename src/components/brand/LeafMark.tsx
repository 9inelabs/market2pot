import LeafMarkSvg from '../../../assets/design/logo main.svg';

type Props = {
  width: number;
  height: number;
};

// Source SVG viewBox is a square (1080x1080). Screens that use a non-square
// box (e.g. the intro screen's ~112x123) will get the mark scaled to fit and
// centered, not stretched — SVG's default preserveAspectRatio ("xMidYMid
// meet") handles that, so expect a little empty space on one axis rather
// than distortion.
export function LeafMark({ width, height }: Props) {
  return <LeafMarkSvg width={width} height={height} />;
}
