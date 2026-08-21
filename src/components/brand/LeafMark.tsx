import { StyleSheet, View } from 'react-native';

import LeafMarkSvg from '../../../assets/design/logo main.svg';

type Props = {
  width: number;
  height: number;
};

// The leaf is padded inside its source file: the viewBox is a square
// 1080x1080, but the mark itself only occupies the 684x756 box at (209, 114).
// Rendering the raw SVG at the size a design frame asks for therefore drew
// the leaf ~44% too small with dead space around it — the design's rects
// (35x38 in welcome's top bar, 112x123 on intro, 364x399 for the watermark)
// all measure the *mark*, not the padded canvas.
//
// So `width`/`height` here are the mark's own box. The padding is scaled out
// and clipped away; a box whose aspect doesn't match the mark's (684:756)
// centers the mark rather than stretching it.
const MARK = { x: 209, y: 114, width: 684, height: 756, viewBox: 1080 };

export function LeafMark({ width, height }: Props) {
  const scale = Math.min(width / MARK.width, height / MARK.height);
  const canvas = MARK.viewBox * scale;

  return (
    <View style={[styles.clip, { width, height }]}>
      <LeafMarkSvg
        width={canvas}
        height={canvas}
        style={{
          position: 'absolute',
          left: (width - MARK.width * scale) / 2 - MARK.x * scale,
          top: (height - MARK.height * scale) / 2 - MARK.y * scale,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
});
