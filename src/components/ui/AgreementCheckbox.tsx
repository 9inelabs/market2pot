import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { Checkbox } from './Checkbox';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

// "I agree to market2pot Terms & Conditions and Privacy Policy" — shared by
// the bank-details and review-profile screens (both mockups show it).
export function AgreementCheckbox({ checked, onChange }: Props) {
  return (
    <View style={styles.row}>
      <Checkbox checked={checked} onChange={onChange} />
      <Pressable style={styles.textWrap} onPress={() => onChange(!checked)}>
        <Text style={[typography.caption, styles.text]}>
          I agree to market2pot{' '}
          <Text style={styles.link} onPress={() => router.push('/terms')}>
            Terms &amp; Conditions
          </Text>{' '}
          and{' '}
          <Text style={styles.link} onPress={() => router.push('/privacy')}>
            Privacy Policy
          </Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[8],
  },
  textWrap: {
    flex: 1,
  },
  text: {
    color: colors.textMuted,
  },
  link: {
    color: colors.textPrimary,
    textDecorationLine: 'underline',
  },
});
