import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '@/i18n/strings';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

// Static placeholder content — per the app spec, "static placeholder
// content is fine" for Help & Support.
export default function HelpScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={styles.topBar}
        accessibilityRole="button"
        accessibilityLabel={strings.back}
      >
        <Text style={styles.backLabel}>‹ {strings.back}</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[typography.button, styles.title]}>{strings.helpTitle}</Text>
        <Text style={[typography.body, styles.body]}>{strings.helpBody}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  topBar: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[16],
    alignSelf: 'flex-start',
  },
  backLabel: {
    ...typography.label,
    fontSize: 16,
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[12],
    paddingBottom: spacing[40],
  },
  title: {
    color: colors.textPrimary,
  },
  body: {
    color: colors.textPrimary,
    marginTop: spacing[16],
  },
});
