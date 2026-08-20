import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Checkbox } from '@/components/ui/Checkbox';
import { formatNaira } from '@/lib/currency';
import { colors, spacing, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  name: string;
  unit: string;
  price: number;
  photoUrl: string | null;
  photoCount?: number;
  isAvailable: boolean;
  onToggleAvailable: (next: boolean) => void;
  onPress: () => void;
  // Only the full Listings tab offers delete inline — Farmer Home's
  // preview just links out to "View all" instead.
  onDelete?: () => void;
  // Listings tab only — low-stock/active-promotion tags under the name.
  lowStockLabel?: string | null;
  promotionLabel?: string | null;
  // Selection mode ("Select" link on Listings) — when true, tapping the row
  // toggles the checkbox instead of opening edit; the pencil icon still
  // always opens edit, matching the mockup (both controls coexist).
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
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
  photoCount = 0,
  isAvailable,
  onToggleAvailable,
  onPress,
  onDelete,
  lowStockLabel,
  promotionLabel,
  selectable,
  selected,
  onToggleSelect,
}: Props) {
  return (
    <View style={styles.row}>
      {selectable ? (
        <Checkbox
          checked={!!selected}
          onChange={() => onToggleSelect?.()}
          accessibilityLabel={`Select ${name}`}
        />
      ) : null}

      <Pressable
        onPress={selectable ? onToggleSelect : onPress}
        style={styles.mainArea}
        accessibilityRole="button"
        accessibilityLabel={selectable ? `Select ${name}` : `Edit ${name}`}
      >
        <View style={styles.thumbWrap}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <FontAwesome5 name="seedling" size={18} color={colors.textMuted} />
            </View>
          )}
          {photoCount > 1 ? (
            <View style={styles.photoCountBadge}>
              <Text style={styles.photoCountText}>{photoCount}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.info}>
          <Text style={[typography.label, styles.name]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[typography.caption, styles.priceLine]}>
            {formatNaira(price)} • {unit}
          </Text>
          {lowStockLabel ? (
            <View style={[styles.tag, styles.lowStockTag]}>
              <Text style={[styles.tagText, styles.lowStockTagText]}>{lowStockLabel}</Text>
            </View>
          ) : promotionLabel ? (
            <View style={[styles.tag, styles.promoTag]}>
              <Text style={[styles.tagText, styles.promoTagText]}>{promotionLabel}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      <Switch
        value={isAvailable}
        onValueChange={onToggleAvailable}
        trackColor={{ true: colors.harvestGreen, false: colors.skeleton }}
        thumbColor={colors.surface}
        accessibilityRole="switch"
        accessibilityLabel={`${name} is ${isAvailable ? 'available' : 'unavailable'}`}
      />

      <Pressable
        onPress={onPress}
        hitSlop={10}
        style={styles.editButton}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${name}`}
      >
        <FontAwesome5 name="pencil-alt" size={14} color={colors.textMuted} />
      </Pressable>

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
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    paddingVertical: spacing[12],
  },
  mainArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  thumbWrap: {
    position: 'relative',
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
  photoCountBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.deepSoil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCountText: {
    color: colors.warmCream,
    fontSize: 9,
    fontWeight: '600',
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
  tag: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    marginTop: spacing[4],
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  lowStockTag: {
    backgroundColor: '#F9E8C8',
  },
  lowStockTagText: {
    color: colors.goldenWheatText,
  },
  promoTag: {
    backgroundColor: '#F4E4D4',
  },
  promoTagText: {
    color: colors.terracotta,
  },
  editButton: {
    padding: spacing[4],
  },
  deleteButton: {
    marginLeft: spacing[4],
  },
});
