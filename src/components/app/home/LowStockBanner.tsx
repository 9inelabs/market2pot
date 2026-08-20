import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Pressable, StyleSheet, Text } from 'react-native';

import { strings } from '@/i18n/strings';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  count: number;
  onPress: () => void;
};

// Home hub's low-stock banner — only rendered by the caller when count > 0.
export function LowStockBanner({ count, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.banner}
      accessibilityRole="button"
      accessibilityLabel={strings.farmerHubLowStockBanner(count)}
    >
      <FontAwesome5 name="exclamation-triangle" size={14} color={colors.goldenWheatText} />
      <Text style={[typography.caption, styles.text]} numberOfLines={1}>
        {strings.farmerHubLowStockBanner(count)}
      </Text>
      <FontAwesome5 name="chevron-right" size={12} color={colors.goldenWheatText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    backgroundColor: '#F9E8C8',
    borderColor: '#E8C888',
    borderWidth: 0.5,
    borderRadius: 12,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[12],
    marginTop: spacing[12],
    minHeight: 44,
  },
  text: {
    flex: 1,
    color: colors.goldenWheatText,
  },
});
