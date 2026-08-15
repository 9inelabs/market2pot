import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { IntroAnimation } from '@/components/motion/IntroAnimation';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme/tokens';

const MIN_DISPLAY_MS = 1200;

export default function IntroScreen() {
  const initializing = useAuthStore((state) => state.initializing);
  const [minDurationElapsed, setMinDurationElapsed] = useState(false);
  const hasNavigated = useRef(false);

  // Minimum display timer runs independently of the session check, so the
  // screen never flickers on fast devices and never blocks on slow ones
  // (build spec section 7.1). The logo animation itself is never gated on
  // either — see IntroAnimation.
  useEffect(() => {
    const timeout = setTimeout(() => setMinDurationElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (hasNavigated.current || initializing || !minDurationElapsed) {
      return;
    }
    hasNavigated.current = true;
    // TODO(phase 5): the routing gate decides whether intro is shown at all
    // (only when there's no session — build spec section 9). Until that
    // exists, intro always proceeds to welcome once the session check and
    // the minimum display time have both resolved.
    router.replace('/(onboarding)/welcome');
  }, [initializing, minDurationElapsed]);

  return (
    <View style={styles.container}>
      <IntroAnimation />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warmCream,
  },
});
