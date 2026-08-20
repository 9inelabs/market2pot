import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/app/StatusBadge';
import { relativeTime } from '@/lib/relativeTime';
import type { OrderStatus } from '@/lib/orderStatus';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  // Farmer's list shows the customer's name; household's list shows the
  // farm's name — same row shape either way.
  title: string;
  itemSummary: string;
  createdAt: string;
  status: OrderStatus;
  onPress: () => void;
};

// One row of the Orders list, and Home hub's Recent Orders preview — same
// shape in both mockups (name, item summary + relative time, status badge).
export function OrderPreviewRow({ title, itemSummary, createdAt, status, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`Order — ${title}, ${status}`}
    >
      <View style={styles.info}>
        <Text style={[typography.label, styles.name]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[typography.caption, styles.meta]} numberOfLines={1}>
          {itemSummary} • {relativeTime(createdAt)}
        </Text>
      </View>
      <StatusBadge status={status} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
    paddingVertical: spacing[12],
  },
  info: {
    flex: 1,
  },
  name: {
    color: colors.textPrimary,
  },
  meta: {
    color: colors.textMuted,
    marginTop: 2,
  },
});
