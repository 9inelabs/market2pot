import { StyleSheet, View } from 'react-native';

import { LeafMark } from '@/components/brand/LeafMark';
import { useDesignScale } from '@/theme/useDesignScale';

// Design frame: <rect x="32" y="169" width="364" height="399"
// fill-opacity="0.07"> — a specific leaf, at a specific place, behind the
// hero. Previously drawn as a screen-centered mark at 1.4x the viewport
// width, which is neither.
const MARK = { x: 32, y: 169, width: 364, height: 399, opacity: 0.07 };

export function LeafWatermark() {
  const { ds } = useDesignScale();

  return (
    <View
      pointerEvents="none"
      style={[styles.container, { left: ds(MARK.x), top: ds(MARK.y), opacity: MARK.opacity }]}
    >
      <LeafMark width={ds(MARK.width)} height={ds(MARK.height)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
});
