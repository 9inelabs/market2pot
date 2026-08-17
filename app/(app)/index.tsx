// TEMPORARY placeholder per build spec section 7: "(app)/index.tsx —
// placeholder, 'Authenticated' only." The real marketplace is out of scope
// for this build. Reached today by existing users signing in (mode=login)
// — new-user destinations after signup are role-specific, handled in
// (auth)/verify.tsx.
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function AppPlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={typography.stepHeadline}>Authenticated</Text>
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
