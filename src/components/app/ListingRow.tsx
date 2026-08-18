import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { formatNaira } from '@/lib/currency';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  name: string;
  unit: string;
  price: number;
  photoUrl: string | null;
  isAvailable: boolean;
  onToggleAvailable: (next: boolean) => void;
  onPress: () => void;
  // Only the full Listings tab offers delete inline — Farmer Home's
  // preview just links out to "View all" instead.
  onDelete?: () => void;
};

// A farmer's own product row — My Listings tab, and Farmer Home's "My
// listings" preview. Tapping the row (or its edit icon) opens the
// add-listing screen in edit mode; the switch toggles availability inline
// without leaving the list.
export function ListingRow({
  name,
  unit,
  price,
  photoUrl,
  isAvailable,
  onToggleAvailable,
  onPress,
  onDelete,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${name}`}
    >
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <FontAwesome5 name="seedling" size={18} color={colors.textMuted} />
        </View>
      )}

      <View style={styles.info}>
        <Text style={[typography.label, styles.name]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[typography.caption, styles.priceLine]}>
          {formatNaira(price)} • {unit}
        </Text>
      </View>

      <Switch
        value={isAvailable}
        onValueChange={onToggleAvailable}
        trackColor={{ true: colors.harvestGreen, false: colors.skeleton }}
        thumbColor={colors.surface}
        accessibilityRole="switch"
        accessibilityLabel={`${name} is ${isAvailable ? 'available' : 'unavailable'}`}
      />

      <FontAwesome5
        name="pencil-alt"
        size={14}
        color={colors.textMuted}
        style={styles.editIcon}
      />

      {onDelete ? (
        <Pressable
          onPress={onDelete}
          hitSlop={10}
          style={styles.deleteButton}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${name}`}
        >
          <FontAwesome5 name="trash-alt" size={14} color={colors.danger} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    paddingVertical: spacing[12],
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  thumbPlaceholder: {
    backgroundColor: colors.skeleton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    color: colors.textPrimary,
  },
  priceLine: {
    color: colors.textMuted,
    marginTop: 2,
  },
  editIcon: {
    marginLeft: spacing[8],
  },
  deleteButton: {
    marginLeft: spacing[12],
  },
});
