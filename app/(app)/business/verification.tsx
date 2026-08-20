import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useVerificationProgress } from '@/hooks/useVerificationProgress';
import { strings } from '@/i18n/strings';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function VerificationScreen() {
  const { steps, completeCount, total } = useVerificationProgress();
  const allDone = total > 0 && completeCount === total;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={strings.back}
        >
          <Text style={styles.backLabel}>‹ {strings.back}</Text>
        </Pressable>
        <Text style={typography.button}>{strings.verificationTitle}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <Text style={[typography.label, styles.summary]}>
          {allDone
            ? strings.verificationAllDoneTitle
            : strings.businessSettingsVerificationCount(completeCount, total || 4)}
        </Text>
        {allDone ? (
          <Text style={[typography.caption, styles.allDoneMessage]}>
            {strings.verificationAllDoneMessage}
          </Text>
        ) : (
          <>
            <Text style={[typography.caption, styles.sectionLabel]}>
              {strings.verificationRemainingTitle}
            </Text>
            <View style={styles.list}>
              {steps.map((step) => (
                <View key={step.key} style={styles.row}>
                  <FontAwesome5
                    name={step.complete ? 'check-circle' : 'circle'}
                    solid={step.complete}
                    size={16}
                    color={step.complete ? colors.harvestGreen : colors.skeleton}
                  />
                  <Text
                    style={[
                      typography.body,
                      styles.stepLabel,
                      step.complete && styles.stepLabelComplete,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
  backLabel: {
    ...typography.label,
    fontSize: 16,
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[12],
  },
  summary: {
    color: colors.textPrimary,
  },
  allDoneMessage: {
    color: colors.textMuted,
    marginTop: spacing[4],
  },
  sectionLabel: {
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing[16],
    marginBottom: spacing[8],
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing[12],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    paddingVertical: spacing[8],
    minHeight: 44,
  },
  stepLabel: {
    color: colors.textPrimary,
  },
  stepLabelComplete: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
});
