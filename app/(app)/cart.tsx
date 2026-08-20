import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router } from 'expo-router';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/hooks/useCart';
import { strings } from '@/i18n/strings';
import { formatNaira } from '@/lib/currency';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function CartScreen() {
  const cart = useCart();
  const farmName = cart.lines[0]?.farmName;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={strings.back}
        >
          <Text style={styles.backLabel}>‹ {strings.back}</Text>
        </Pressable>
        <Text style={typography.button}>{strings.cartTitle}</Text>
        <View style={{ width: 44 }} />
      </View>

      {cart.loading ? null : cart.lines.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState icon="shopping-cart" title={strings.cartEmptyTitle} message={strings.cartEmptyMessage} />
          <Button
            label={strings.cartBrowseProducts}
            onPress={() => router.push('/(app)/(tabs)')}
            style={styles.browseButton}
          />
        </View>
      ) : (
        <>
          {farmName ? (
            <Text style={[typography.caption, styles.farmLabel]}>
              {strings.cartFrom} {farmName}
            </Text>
          ) : null}

          <FlatList
            data={cart.lines}
            keyExtractor={(item) => item.cartItemId}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <View style={styles.row}>
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <FontAwesome5 name="seedling" size={18} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={[typography.label, styles.name]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[typography.caption, styles.unitPrice]}>
                    {formatNaira(item.price)} • {item.unit}
                  </Text>
                  <View style={styles.stepperRow}>
                    <Pressable
                      onPress={() => cart.updateQuantity(item.cartItemId, item.quantity - 1)}
                      style={styles.stepperButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Decrease ${item.name} quantity`}
                    >
                      <FontAwesome5 name="minus" size={11} color={colors.textPrimary} />
                    </Pressable>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <Pressable
                      onPress={() =>
                        cart.updateQuantity(
                          item.cartItemId,
                          Math.min(item.quantityAvailable, item.quantity + 1)
                        )
                      }
                      style={styles.stepperButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Increase ${item.name} quantity`}
                    >
                      <FontAwesome5 name="plus" size={11} color={colors.textPrimary} />
                    </Pressable>
                    <Pressable
                      onPress={() => cart.removeItem(item.cartItemId)}
                      hitSlop={10}
                      style={styles.removeButton}
                      accessibilityRole="button"
                      accessibilityLabel={`${strings.cartRemoveLabel} ${item.name}`}
                    >
                      <Text style={styles.removeText}>{strings.cartRemoveLabel}</Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={[typography.label, styles.lineTotal]}>
                  {formatNaira(item.price * item.quantity)}
                </Text>
              </View>
            )}
          />

          <View style={styles.footer}>
            <View style={styles.subtotalRow}>
              <Text style={[typography.label, styles.subtotalLabel]}>{strings.cartSubtotal}</Text>
              <Text style={[typography.button, styles.subtotalValue]}>{formatNaira(cart.subtotal)}</Text>
            </View>
            <Button
              label={strings.cartCheckout}
              onPress={() => router.push('/(app)/checkout')}
              style={styles.checkoutButton}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
  backLabel: {
    ...typography.label,
    fontSize: 16,
    color: colors.textPrimary,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: geometry.screenPaddingButtons,
  },
  browseButton: {
    marginTop: spacing[8],
    alignSelf: 'stretch',
  },
  farmLabel: {
    color: colors.textMuted,
    paddingHorizontal: geometry.screenPaddingButtons,
    marginBottom: spacing[8],
  },
  listContent: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingBottom: spacing[16],
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.skeleton,
  },
  row: {
    flexDirection: 'row',
    gap: spacing[12],
    paddingVertical: spacing[12],
  },
  thumb: {
    width: 56,
    height: 56,
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
  unitPrice: {
    color: colors.textMuted,
    marginTop: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    marginTop: spacing[8],
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.skeleton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    ...typography.label,
    color: colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    marginLeft: spacing[8],
    minHeight: 28,
    justifyContent: 'center',
  },
  removeText: {
    ...typography.caption,
    color: colors.danger,
  },
  lineTotal: {
    color: colors.textPrimary,
  },
  footer: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[12],
    paddingBottom: spacing[16],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.skeleton,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[12],
  },
  subtotalLabel: {
    color: colors.textPrimary,
  },
  subtotalValue: {
    color: colors.harvestGreen,
  },
  checkoutButton: {},
});
