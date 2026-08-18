import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme/tokens';

// Wraps the tab navigator plus every full-screen route pushed on top of it
// (Farmer Profile, add/edit listing, Register as a farmer). A minimal auth
// guard, not the real resume-at-step routing gate (still phase 5, not yet
// built) — this only covers the case of (app) being reached without a live
// session (e.g. a restored navigation state after sign-out), which the
// existing signup screens' router.replace('/(app)') calls don't otherwise
// protect against.
export default function AppLayout() {
  const initializing = useAuthStore((state) => state.initializing);
  const session = useAuthStore((state) => state.session);

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warmCream }}>
        <ActivityIndicator color={colors.harvestGreen} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(onboarding)/intro" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
