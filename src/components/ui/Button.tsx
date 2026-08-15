import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, geometry, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Variant = 'primary' | 'secondary';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  // Renders at 40% opacity and calls onPress with the gated behavior still
  // wired up by the caller (e.g. showing a "Coming soon" toast instead of
  // navigating) — per build spec section 7.2, disabled buttons are never
  // removed, just dimmed.
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Button({ label, onPress, variant = 'primary', disabled, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[typography.button, variant === 'primary' ? styles.primaryText : styles.secondaryText]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: geometry.primaryButton.height,
    borderRadius: geometry.primaryButton.radius,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: geometry.screenPaddingButtons,
  },
  primary: {
    backgroundColor: colors.harvestGreen,
  },
  // "fill harvestGreen @ ~15% opacity" means a translucent tint on the
  // background, not the whole view at 15% opacity — that would fade the
  // label text to near-invisibility too. rgba keeps the text fully opaque.
  secondary: {
    backgroundColor: withOpacity(colors.harvestGreen, geometry.secondaryButton.opacity),
  },
  disabled: {
    opacity: 0.4,
  },
  primaryText: {
    color: colors.surface,
  },
  secondaryText: {
    color: colors.harvestGreen,
  },
});
