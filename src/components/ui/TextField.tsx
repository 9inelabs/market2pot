import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { colors, geometry } from '@/theme/tokens';
import { typography } from '@/theme/typography';

// The filled, rounded pill input used for most text fields (full name,
// address). The phone number field is visually distinct — see PhoneField.
export function TextField({ style, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      style={[styles.input, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: geometry.textInput.height,
    borderRadius: geometry.textInput.radius,
    backgroundColor: colors.surface,
    paddingHorizontal: geometry.screenPaddingInputs,
    ...typography.body,
    color: colors.textPrimary,
  },
});
