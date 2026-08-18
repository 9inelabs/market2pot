import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  label: string;
  value: string;
};

// One of Farmer Home's three dashboard stat cards.
export function StatCard({ label, value }: Props) {
  return (
    <View style={styles.card}>
      <Text style={[typography.stepHeadline, styles.value]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[typography.caption, styles.label]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[12],
  },
  value: {
    fontSize: 24,
    color: colors.harvestGreen,
  },
  label: {
    color: colors.textMuted,
    marginTop: spacing[4],
  },
});
