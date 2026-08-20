import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { IntroAnimation } from '@/components/motion/IntroAnimation';
import { resumeRouteForProfile } from '@/lib/authResume';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme/tokens';

const MIN_DISPLAY_MS = 1200;

export default function IntroScreen() {
  const initializing = useAuthStore((state) => state.initializing);
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const loadingProfile = useAuthStore((state) => state.loadingProfile);
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

  // The routing gate (build spec section 9, previously unbuilt — see
  // app/index.tsx, still a thin redirect straight here). A session alone
  // isn't enough to decide where to go: the profile itself (specifically
  // its onboarding_step) determines whether this is a fully-onboarded
  // returning user (-> Welcome Back), someone mid-signup (-> resume exactly
  // where they left off), or a first-time visitor (-> Welcome). Waiting on
  // loadingProfile too, not just initializing, matters — fetchProfile()
  // runs async off the auth-state-change listener and isn't guaranteed to
  // have resolved the instant a session first appears.
  useEffect(() => {
    if (hasNavigated.current || initializing || !minDurationElapsed) {
      return;
    }
    if (session && loadingProfile) {
      return;
    }

    hasNavigated.current = true;

    if (!session) {
      router.replace('/(onboarding)/welcome');
      return;
    }
    if (!profile) {
      // Session exists but the profile fetch failed outright (not just
      // still loading) — safest fallback is the plain welcome screen
      // rather than a route that assumes profile data exists.
      router.replace('/(onboarding)/welcome');
      return;
    }
    router.replace(resumeRouteForProfile(profile));
  }, [initializing, minDurationElapsed, session, profile, loadingProfile]);

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
