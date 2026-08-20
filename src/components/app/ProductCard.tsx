import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatNaira } from '@/lib/currency';
import { freshnessLabel } from '@/lib/freshness';
import { colors, spacing, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  name: string;
  unit: string;
  price: number;
  photoUrl: string | null;
  harvestDate: string | null;
  // Opens the product quick-view overlay — quantity selection now happens
  // there, not as a bare increment-on-tap, since a real cart needs a real
  // quantity per line.
  onPress: () => void;
};

// Household-facing grid card — Fresh Picks, Farmer Profile's listings grid,
// Search, and Categories all use this. Tapping anywhere on the card
// (including the "+" affordance) opens the quick-view overlay.
export function ProductCard({ name, unit, price, photoUrl, harvestDate, onPress }: Props) {
  const freshness = freshnessLabel(harvestDate);

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${name}`}
    >
      <View style={styles.imageWrap}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <FontAwesome5 name="seedling" size={20} color={colors.textMuted} />
          </View>
        )}
        {freshness ? (
          <View style={styles.freshnessBadge}>
            <Text style={styles.freshnessText}>{freshness}</Text>
          </View>
        ) : null}
      </View>

      <Text style={[typography.label, styles.name]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[typography.caption, styles.unit]} numberOfLines={1}>
        {unit}
      </Text>

      <View style={styles.footer}>
        <Text style={[typography.label, styles.price]}>{formatNaira(price)}</Text>
        <View style={styles.addButton}>
          <FontAwesome5 name="plus" size={12} color={colors.surface} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing[8],
  },
  imageWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing[8],
  },
  image: {
    width: '100%',
    aspectRatio: 1,
  },
  imagePlaceholder: {
    backgroundColor: colors.skeleton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freshnessBadge: {
    position: 'absolute',
    top: spacing[8],
    left: spacing[8],
    backgroundColor: withOpacity(colors.deepSoil, 0.7),
    borderRadius: 8,
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
  },
  freshnessText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.surface,
  },
  name: {
    color: colors.textPrimary,
  },
  unit: {
    color: colors.textMuted,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[8],
  },
  price: {
    color: colors.textPrimary,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.harvestGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
