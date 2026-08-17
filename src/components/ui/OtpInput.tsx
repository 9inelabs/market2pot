import { useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  length: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
};

// A single invisible TextInput captures all input (keeps iOS/Android SMS
// autofill working via textContentType/autoComplete); the boxes underneath
// are purely visual, driven by `value`. Simpler and more robust than
// managing focus across N separate inputs.
export function OtpInput({ length, value, onChange, onComplete }: Props) {
  const inputRef = useRef<TextInput>(null);

  const handleChangeText = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length) {
      onComplete?.(digits);
    }
  };

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={styles.row}>
      {Array.from({ length }).map((_, i) => (
        <View key={i} style={[styles.box, value.length === i && styles.boxActive]}>
          <Text style={styles.digit}>{value[i] ?? ''}</Text>
        </View>
      ))}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChangeText}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus
        textContentType={Platform.OS === 'ios' ? 'oneTimeCode' : undefined}
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : undefined}
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  box: {
    width: 40,
    height: 56,
    borderBottomWidth: 2,
    borderBottomColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderBottomColor: colors.harvestGreen,
  },
  // stepHeadline, not h2 — Archivo Expanded is Welcome-only.
  digit: {
    ...typography.stepHeadline,
    color: colors.textPrimary,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
  },
});
