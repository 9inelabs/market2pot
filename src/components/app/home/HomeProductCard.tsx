import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatNaira } from '@/lib/currency';
import { colors, spacing } from '@/theme/tokens';
import { bodyFont } from '@/theme/typography';

type Props = {
  name: string;
  unit: string;
  price: number;
  photoUrl: string | null;
  onPress: () => void;
};

// Home's Fresh Picks card. Separate from the shared ProductCard on purpose:
// that one is the 2-up card Search/Categories/Farmer Profile render, and this
// is the denser 3-up card from the Home reference — different image
// proportions, a green price, and the "+" sitting in the card's bottom-right
// corner rather than in a row beside the price. Changing the shared card to
// match would have silently restyled four other screens.
export function HomeProductCard({ name, unit, price, photoUrl, onPress }: Props) {
  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${formatNaira(price)} per ${unit}`}
    >
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]} />
      )}

      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.unit} numberOfLines={1}>
        {unit}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.price} numberOfLines={1}>
          {formatNaira(price)}
        </Text>
        {/* Decorative: the whole card is the tap target (it opens the
            quick-view, where quantity is actually chosen), so this must not
            be a second focusable element announcing itself separately. */}
        <View style={styles.addButton} pointerEvents="none">
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
    borderRadius: 12,
    padding: spacing[8],
  },
  image: {
    width: '100%',
    // 106x85 in the reference — the card is denser than a square crop allows
    // at three across.
    aspectRatio: 106 / 85,
    borderRadius: 8,
  },
  imagePlaceholder: {
    backgroundColor: '#E3E9E3',
  },
  name: {
    ...bodyFont('bold'),
    fontSize: 11,
    color: colors.textPrimary,
    marginTop: spacing[8],
  },
  unit: {
    ...bodyFont('regular'),
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing[8],
  },
  price: {
    ...bodyFont('bold'),
    fontSize: 13,
    color: colors.harvestGreen,
    flexShrink: 1,
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
