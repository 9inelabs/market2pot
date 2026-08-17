// TEMPORARY: placeholder destination for guest browsing. The real
// marketplace/listing screens are out of scope for this auth/onboarding
// build (build spec section 0) — this exists so "Browse products" is a real,
// working button today rather than a dead tap. Replace wholesale once
// marketplace screens are in scope; nothing else references this file.
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function BrowseScreen() {
  return (
    <View style={styles.container}>
      <Text style={typography.stepHeadline}>Browsing — coming soon</Text>
      <Text style={[typography.body, styles.subtitle]}>
        The marketplace isn't built yet. You'll be prompted to sign in only when you're ready
        to place an order.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warmCream,
    paddingHorizontal: spacing[32],
    gap: spacing[12],
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: 'center',
  },
});
