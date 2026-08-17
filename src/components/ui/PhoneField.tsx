import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export const NIGERIA_FLAG = '🇳🇬';
export const NIGERIA_DIAL_CODE = '+234';

type Props = Omit<TextInputProps, 'style' | 'keyboardType' | 'placeholder'>;

// Country is locked to Nigeria — flag + dial code are fixed, not editable,
// per product decision. Underlined style, distinct from the filled-pill
// TextField used elsewhere, matching assets/materials/Phone Number.png. No
// inline placeholder — the design shows a separate hint line below the
// field, not placeholder text inside it (see phone.tsx).
export function PhoneField(props: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.prefix} accessibilityLabel="Nigeria, plus two three four">
        {NIGERIA_FLAG} {NIGERIA_DIAL_CODE}
      </Text>
      <TextInput keyboardType="phone-pad" style={styles.input} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: colors.textPrimary,
    // Measured off assets/materials/extracted/Phone Number.png: gap from
    // the code text's bottom edge to the underline.
    paddingBottom: 16,
  },
  prefix: {
    ...typography.stepHeadline,
    fontSize: 22,
    color: colors.harvestGreen,
  },
  input: {
    flex: 1,
    ...typography.stepHeadline,
    fontSize: 22,
    color: colors.textPrimary,
    padding: 0,
  },
});
