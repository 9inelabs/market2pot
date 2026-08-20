import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { strings } from '@/i18n/strings';
import { colors, spacing, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  productName: string;
  harvestDate: string;
  preorderCount: number;
  onPress: () => void;
};

function readyLabel(harvestDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${harvestDate}T00:00:00`);
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (days <= 0) return strings.farmerHubUpcomingHarvestReadyToday;
  return strings.farmerHubUpcomingHarvestReadyInDays(days);
}

// Home hub's "Upcoming harvest" card — the soonest pre-order product.
export function HarvestCard({ productName, harvestDate, preorderCount, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${strings.farmerHubUpcomingHarvestPrefix} ${productName}`}
    >
      <View style={styles.iconWrap}>
        <FontAwesome5 name="calendar-alt" size={16} color={colors.harvestGreen} />
      </View>
      <View style={styles.textBlock}>
        <Text style={[typography.label, styles.title]} numberOfLines={1}>
          {strings.farmerHubUpcomingHarvestPrefix} {productName}
        </Text>
        <Text style={[typography.caption, styles.subtitle]} numberOfLines={1}>
          {readyLabel(harvestDate)} · {strings.farmerHubPreorderCount(preorderCount)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    backgroundColor: withOpacity(colors.harvestGreen, 0.08),
    borderColor: '#C7DBCB',
    borderWidth: 0.5,
    borderRadius: 12,
    padding: spacing[12],
    marginTop: spacing[16],
    minHeight: 44,
  },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: 2,
  },
});
