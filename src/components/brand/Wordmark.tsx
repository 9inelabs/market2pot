import { StyleSheet, View } from 'react-native';

import WordmarkSvg from '../../../assets/design/word mark text.svg';

type Props = {
  width: number;
  height: number;
};

// Same padded-canvas problem as LeafMark: the "market2pot / fresh from farm
// to home" lock-up sits at (19, 16) at 790x196 inside an 831x231 viewBox.
// `width`/`height` are the lock-up's own box, matching what the design frames
// measure (146x36 in welcome's top bar, 190x57 on intro).
const MARK = { x: 19, y: 16, width: 790, height: 196, viewBoxWidth: 831, viewBoxHeight: 231 };

export function Wordmark({ width, height }: Props) {
  const scale = Math.min(width / MARK.width, height / MARK.height);

  return (
    <View style={[styles.clip, { width, height }]}>
      <WordmarkSvg
        width={MARK.viewBoxWidth * scale}
        height={MARK.viewBoxHeight * scale}
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
