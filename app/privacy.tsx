// TEMPORARY: placeholder content. Linked from the agreement checkbox on
// bank-details.tsx and review-profile.tsx so those links are real and
// functional today. Swap in real Privacy Policy copy when available —
// nothing else needs to change, the route stays /privacy.
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '@/i18n/strings';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Text style={styles.backLabel}>‹ {strings.back}</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.stepHeadline}>Privacy Policy</Text>
        <Text style={[typography.body, styles.body]}>
          This is placeholder content. Market2pot's real Privacy Policy will appear here
          before this app is used by real farmers or consumers.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  back: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[16],
  },
  backLabel: {
    ...typography.label,
    fontSize: 16,
    color: colors.textPrimary,
  },
  content: {
    padding: geometry.screenPaddingButtons,
    gap: spacing[16],
  },
  body: {
    color: colors.textMuted,
  },
});
