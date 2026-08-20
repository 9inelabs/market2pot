import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useEffect, useState } from 'react';
import { Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { strings } from '@/i18n/strings';
import { formatNaira } from '@/lib/currency';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export type QuickViewProduct = {
  id: string;
  name: string;
  price: number;
  unit: string;
  photoUrls: string[];
  quantityAvailable: number;
  farmerId: string;
};

type Props = {
  visible: boolean;
  product: QuickViewProduct | null;
  onClose: () => void;
  onAddToCart: (
    productId: string,
    farmerId: string,
    quantity: number,
    options?: { clearFirst?: boolean }
  ) => Promise<'ok' | 'needs-clear-confirmation' | string>;
  onViewFull: (productId: string) => void;
};

const screenWidth = Dimensions.get('window').width;

// Tapping a product anywhere in the app (Home, Search, Categories, Farmer
// Profile) opens this — photo carousel, a quantity stepper, and either Add
// to Cart or "View full details" -> Product Detail. No native bottom-sheet
// library is installed, so this is a plain RN Modal sliding up from the
// bottom rather than a true bottom sheet — same visual result, no new
// dependency.
export function ProductQuickViewModal({ visible, product, onClose, onAddToCart, onViewFull }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClearVisible, setConfirmClearVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setQuantity(1);
      setError(null);
    }
  }, [visible, product?.id]);

  if (!product) return null;

  const handleAdd = async (clearFirst?: boolean) => {
    setSubmitting(true);
    setError(null);
    const result = await onAddToCart(product.id, product.farmerId, quantity, { clearFirst });
    setSubmitting(false);
    if (result === 'needs-clear-confirmation') {
      setConfirmClearVisible(true);
      return;
    }
    if (result !== 'ok') {
      setError(result);
      return;
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={strings.back}
          >
            <FontAwesome5 name="times" size={16} color={colors.textPrimary} />
          </Pressable>

          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.carousel}>
            {(product.photoUrls.length > 0 ? product.photoUrls : [null]).map((url, index) => (
              <View key={index} style={[styles.photoPage, { width: screenWidth - spacing[24] * 2 }]}>
                {url ? (
                  <Image source={{ uri: url }} style={styles.photo} />
                ) : (
                  <View style={[styles.photo, styles.photoPlaceholder]}>
                    <FontAwesome5 name="seedling" size={28} color={colors.textMuted} />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <Text style={[typography.button, styles.name]} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={[typography.label, styles.price]}>
            {formatNaira(product.price)} • {product.unit}
          </Text>

          <View style={styles.quantityRow}>
            <Pressable
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              style={styles.stepperButton}
              accessibilityRole="button"
              accessibilityLabel="Decrease quantity"
            >
              <FontAwesome5 name="minus" size={12} color={colors.textPrimary} />
            </Pressable>
            <Text style={[typography.label, styles.quantityText]}>{quantity}</Text>
            <Pressable
              onPress={() => setQuantity((q) => Math.min(product.quantityAvailable, q + 1))}
              style={styles.stepperButton}
              accessibilityRole="button"
              accessibilityLabel="Increase quantity"
            >
              <FontAwesome5 name="plus" size={12} color={colors.textPrimary} />
            </Pressable>
            <Text style={[typography.caption, styles.availableText]}>
              {product.quantityAvailable} available
            </Text>
          </View>

          {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}

          <Pressable
            onPress={() => handleAdd()}
            disabled={submitting || product.quantityAvailable === 0}
            style={[styles.addButton, (submitting || product.quantityAvailable === 0) && styles.addButtonDisabled]}
            accessibilityRole="button"
            accessibilityLabel={strings.productQuickViewAddToCart}
          >
            <Text style={styles.addButtonText}>{strings.productQuickViewAddToCart}</Text>
          </Pressable>

          <Pressable
            onPress={() => onViewFull(product.id)}
            style={styles.viewFullButton}
            accessibilityRole="button"
            accessibilityLabel={strings.productQuickViewViewFull}
          >
            <Text style={styles.viewFullText}>{strings.productQuickViewViewFull}</Text>
          </Pressable>
        </SafeAreaView>
      </View>

      <ConfirmDialog
        visible={confirmClearVisible}
        icon="exchange-alt"
        title={strings.productQuickViewClearCartTitle}
        message={strings.productQuickViewClearCartMessage}
        confirmLabel={strings.productQuickViewClearCartConfirm}
        cancelLabel={strings.settingsCancelAction}
        onConfirm={() => {
          setConfirmClearVisible(false);
          handleAdd(true);
        }}
        onCancel={() => setConfirmClearVisible(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(42, 36, 32, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.warmCream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing[24],
    paddingTop: spacing[12],
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.skeleton,
    alignSelf: 'center',
    marginBottom: spacing[8],
  },
  closeButton: {
    position: 'absolute',
    top: spacing[12],
    right: spacing[16],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  carousel: {
    marginTop: spacing[8],
  },
  photoPage: {
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    backgroundColor: colors.skeleton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: colors.textPrimary,
    marginTop: spacing[16],
  },
  price: {
    color: colors.harvestGreen,
    marginTop: spacing[4],
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    marginTop: spacing[16],
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.skeleton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    color: colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  availableText: {
    color: colors.textMuted,
    marginLeft: spacing[8],
  },
  error: {
    color: colors.danger,
    marginTop: spacing[12],
  },
  addButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.harvestGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[20],
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  viewFullButton: {
    alignItems: 'center',
    paddingVertical: spacing[16],
    minHeight: 44,
    justifyContent: 'center',
  },
  viewFullText: {
    ...typography.label,
    color: colors.harvestGreen,
  },
});
