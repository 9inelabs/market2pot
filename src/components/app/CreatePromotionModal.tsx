import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppModal } from '@/components/ui/AppModal';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { TextField } from '@/components/ui/TextField';
import type { Product } from '@/hooks/useFreshProducts';
import { strings } from '@/i18n/strings';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  visible: boolean;
  products: Product[];
  onCancel: () => void;
  onSubmit: (productId: string, discountPercent: number, endsAt: Date) => Promise<string | null>;
};

// Insights & Growth's "Create a promotion" form — select one of the
// farmer's products, a discount percent, and an end date.
export function CreatePromotionModal({ visible, products, onCancel, onSubmit }: Props) {
  const [product, setProduct] = useState<Product | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [discount, setDiscount] = useState('');
  const [endsAt, setEndsAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setProduct(null);
    setDiscount('');
    setEndsAt(null);
    setError(null);
  };

  const handleSubmit = async () => {
    const discountNumber = Number(discount);
    if (
      !product ||
      !Number.isFinite(discountNumber) ||
      discountNumber <= 0 ||
      discountNumber > 100 ||
      !endsAt ||
      endsAt.getTime() <= Date.now()
    ) {
      setError(strings.createPromotionInvalid);
      return;
    }
    setSubmitting(true);
    setError(null);
    const submitError = await onSubmit(product.id, discountNumber, endsAt);
    setSubmitting(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    reset();
  };

  return (
    <AppModal
      visible={visible}
      onRequestClose={() => {
        reset();
        onCancel();
      }}
    >
      <Text style={[typography.button, styles.title]}>{strings.createPromotionTitle}</Text>

      <Text style={[typography.label, styles.fieldLabel]}>{strings.createPromotionProductLabel}</Text>
      <Pressable onPress={() => setPickerOpen(true)} style={styles.field}>
        <Text style={product ? styles.value : styles.placeholder} numberOfLines={1}>
          {product?.name ?? strings.createPromotionProductPlaceholder}
        </Text>
      </Pressable>

      <Text style={[typography.label, styles.fieldLabel]}>{strings.createPromotionDiscountLabel}</Text>
      <TextField
        value={discount}
        onChangeText={(text) => setDiscount(text.replace(/[^0-9]/g, ''))}
        placeholder={strings.createPromotionDiscountPlaceholder}
        keyboardType="number-pad"
      />

      <Text style={[typography.label, styles.fieldLabel]}>{strings.createPromotionEndDateLabel}</Text>
      <DateField
        value={endsAt}
        onChange={setEndsAt}
        placeholder={strings.createPromotionEndDateLabel}
        minimumDate={new Date(Date.now() + 86_400_000)}
      />

      {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}

      <Button
        label={strings.createPromotionSubmit}
        onPress={handleSubmit}
        disabled={submitting}
        loading={submitting}
        style={styles.submitButton}
      />

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={typography.stepHeadline}>{strings.createPromotionProductPlaceholder}</Text>
            <Pressable onPress={() => setPickerOpen(false)} hitSlop={12}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => {
                  setProduct(item);
                  setPickerOpen(false);
                }}
              >
                <Text style={typography.body}>{item.name}</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </Modal>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  fieldLabel: {
    color: colors.textPrimary,
    marginTop: spacing[12],
    marginBottom: spacing[8],
  },
  field: {
    height: geometry.textInput.height,
    borderRadius: geometry.textInput.radius,
    backgroundColor: colors.warmCream,
    paddingHorizontal: geometry.screenPaddingInputs,
    justifyContent: 'center',
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
  },
  placeholder: {
    ...typography.body,
    color: colors.textMuted,
  },
  error: {
    color: colors.danger,
    marginTop: spacing[8],
  },
  submitButton: {
    marginTop: spacing[20],
  },
  modal: {
    flex: 1,
    backgroundColor: colors.warmCream,
    paddingHorizontal: geometry.screenPaddingButtons,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[16],
  },
  close: {
    ...typography.label,
    color: colors.harvestGreen,
  },
  row: {
    paddingVertical: spacing[16],
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.skeleton,
  },
});
