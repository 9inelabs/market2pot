import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, geometry } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { strings } from '@/i18n/strings';

type Props = {
  onPress: () => void;
};

// 90x39 pill, deep soil fill, white text + chevrons, per build spec section 2.
export function SignInPill({ onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.pill}>
      <Text style={styles.label}>{strings.signInPill} »</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: geometry.signInPill.width,
    height: geometry.signInPill.height,
    borderRadius: geometry.signInPill.radius,
    backgroundColor: colors.deepSoil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.label,
    color: colors.surface,
  },
});
