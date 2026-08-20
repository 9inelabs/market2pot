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
    // A session lost mid-app-use (expired token, manual sign-out from
    // elsewhere) lands on the fast phone+password login path now, not the
    // marketing welcome screen — matches the new "Log Out requires signing
    // back in with phone + password" flow.
    return <Redirect href="/(auth)/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
