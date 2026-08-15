import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { LeafMark } from '@/components/brand/LeafMark';

const OPACITY = 0.07;

// Decorative background mark, absolutely positioned behind all screen
// content. Non-interactive so it never intercepts touches.
export function LeafWatermark() {
  const { width } = useWindowDimensions();
  const size = width * 1.4;

  return (
    <View style={[styles.container, { opacity: OPACITY }]} pointerEvents="none">
      <LeafMark width={size} height={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
