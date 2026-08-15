import { StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { LeafMark } from '@/components/brand/LeafMark';
import { Wordmark } from '@/components/brand/Wordmark';
import { spacing } from '@/theme/tokens';

// Entire body is the swap point for a future Lottie animation (build spec
// section 7.1) — nothing outside this component should need to change when
// that happens.
export function IntroAnimation() {
  return (
    <Animated.View
      entering={FadeIn.duration(700).springify().damping(18)}
      style={styles.container}
    >
      <LeafMark width={112} height={123} />
      <Wordmark width={190} height={57} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing[24],
  },
});
