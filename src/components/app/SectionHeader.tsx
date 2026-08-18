import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  title: string;
  onSeeAll?: () => void;
  seeAllLabel?: string;
};

// Section title + optional "See all" link — Farmers Near You, Fresh Picks,
// Recent Orders, My Listings all use this exact header shape.
export function SectionHeader({ title, onSeeAll, seeAllLabel = 'See all' }: Props) {
  return (
    <View style={styles.row}>
      <Text style={[typography.button, styles.title]}>{title}</Text>
      {onSeeAll ? (
        <Pressable
          onPress={onSeeAll}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${seeAllLabel} ${title}`}
        >
          <Text style={[typography.label, styles.seeAll]}>{seeAllLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[12],
  },
  title: {
    color: colors.textPrimary,
  },
  seeAll: {
    color: colors.harvestGreen,
    textDecorationLine: 'underline',
  },
});
