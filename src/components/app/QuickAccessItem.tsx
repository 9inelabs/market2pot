import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  icon: ComponentProps<typeof FontAwesome5>['name'];
  label: string;
  onPress: () => void;
};

// Icon-over-label tappable item — the horizontal quick-access row on both
// Home variants (Categories/Nearby Farmers/My Orders/... for household,
// My Listings/Orders/... for farmer).
export function QuickAccessItem({ icon, label, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.item}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.iconWrap}>
        <FontAwesome5 name={icon} size={18} color={colors.harvestGreen} />
      </View>
      <Text style={[typography.caption, styles.label]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    width: 72,
    alignItems: 'center',
    paddingVertical: spacing[4],
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
