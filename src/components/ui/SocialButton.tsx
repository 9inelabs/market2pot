import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, geometry } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

// One of the paired ~188x41 buttons ("Continue with Google" / "Sign in with
// Apple") in the welcome screen's social row.
export function SocialButton({ label, onPress, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.base, disabled && styles.disabled]}
    >
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: geometry.socialButton.height,
    width: geometry.socialButton.width,
    borderRadius: geometry.socialButton.radius,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
  },
});
