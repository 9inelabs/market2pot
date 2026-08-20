import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppModal } from '@/components/ui/AppModal';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { strings } from '@/i18n/strings';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  visible: boolean;
  onCancel: () => void;
  onApply: (price: number) => void;
};

// Listings' "Update price" bulk action — one new price applied to every
// selected listing, per the spec's own wording ("opens a simple modal to
// set a new price across selected items").
export function BulkPriceModal({ visible, onCancel, onApply }: Props) {
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleApply = () => {
    const value = Number(price);
    if (!Number.isFinite(value) || value <= 0) {
      setError(strings.listingsBulkPriceInvalid);
      return;
    }
    setError(null);
    onApply(value);
    setPrice('');
  };

  return (
    <AppModal visible={visible} onRequestClose={onCancel}>
      <Text style={[typography.button, styles.title]}>{strings.listingsBulkPriceModalTitle}</Text>
      <Text style={[typography.body, styles.message]}>{strings.listingsBulkPriceModalMessage}</Text>

      <TextField
        value={price}
        onChangeText={(text) => setPrice(text.replace(/[^0-9.]/g, ''))}
        placeholder={strings.listingsBulkPricePlaceholder}
        keyboardType="decimal-pad"
        style={styles.input}
      />
      {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}

      <Button label={strings.listingsBulkPriceApply} onPress={handleApply} style={styles.button} />
    </AppModal>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing[8],
  },
  input: {
    marginTop: spacing[16],
  },
  error: {
    color: colors.danger,
    marginTop: spacing[8],
  },
  button: {
    marginTop: spacing[16],
  },
});
