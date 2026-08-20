import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export type QuickAction = {
  key: string;
  icon: ComponentProps<typeof FontAwesome5>['name'];
  label: string;
  onPress: () => void;
};

type Props = {
  actions: QuickAction[];
};

// Home hub's 3x3 "Manage your farm" grid — same icon-over-label visual
// language as QuickAccessItem's horizontal-row usage elsewhere, but laid
// out as a wrapping 3-column grid instead of a scrollable row.
export function QuickActionGrid({ actions }: Props) {
  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          onPress={action.onPress}
          style={styles.item}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <View style={styles.iconWrap}>
            <FontAwesome5 name={action.icon} size={18} color={colors.harvestGreen} />
          </View>
          <Text style={[typography.caption, styles.label]} numberOfLines={2}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: spacing[8],
    minHeight: 44,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: withOpacity(colors.harvestGreen, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing[4],
  },
});
