import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppModal } from '@/components/ui/AppModal';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import type { DeliveryZone } from '@/hooks/useDeliveryZones';
import { strings } from '@/i18n/strings';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  visible: boolean;
  editingZone: DeliveryZone | null;
  onCancel: () => void;
  onSubmit: (zoneName: string, fee: number) => Promise<string | null>;
};

export function DeliveryZoneFormModal({ visible, editingZone, onCancel, onSubmit }: Props) {
  const [zoneName, setZoneName] = useState('');
  const [fee, setFee] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setZoneName(editingZone?.zone_name ?? '');
      setFee(editingZone ? String(editingZone.fee) : '');
      setError(null);
    }
  }, [visible, editingZone]);

  const handleSubmit = async () => {
    const feeNumber = Number(fee);
    if (!zoneName.trim() || !Number.isFinite(feeNumber) || feeNumber < 0) {
      setError(strings.deliveryZonesInvalid);
      return;
    }
    setSubmitting(true);
    setError(null);
    const submitError = await onSubmit(zoneName.trim(), feeNumber);
    setSubmitting(false);
    if (submitError) setError(submitError);
  };

  return (
    <AppModal visible={visible} onRequestClose={onCancel}>
      <Text style={[typography.button, styles.title]}>
        {editingZone ? strings.deliveryZonesFormTitleEdit : strings.deliveryZonesFormTitleAdd}
      </Text>

      <Text style={[typography.label, styles.fieldLabel]}>{strings.deliveryZonesNameLabel}</Text>
      <TextField
        value={zoneName}
        onChangeText={setZoneName}
        placeholder={strings.deliveryZonesNamePlaceholder}
      />

      <Text style={[typography.label, styles.fieldLabel]}>{strings.deliveryZonesFeeLabel}</Text>
      <TextField
        value={fee}
        onChangeText={(text) => setFee(text.replace(/[^0-9.]/g, ''))}
        placeholder={strings.deliveryZonesFeePlaceholder}
        keyboardType="decimal-pad"
      />

      {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}

      <Button
        label={strings.deliveryZonesSave}
        onPress={handleSubmit}
        disabled={submitting}
        loading={submitting}
        style={styles.button}
      />
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
  error: {
    color: colors.danger,
    marginTop: spacing[8],
  },
  button: {
    marginTop: spacing[20],
  },
});
