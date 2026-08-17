import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, geometry, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Variant = 'primary' | 'secondary';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  // Dims to 40% opacity and genuinely blocks onPress (validation gates —
  // nothing is happening, tapping just wouldn't do anything valid yet). For
  // a button that should stay tappable but do something different while
  // "off" (e.g. Welcome's feature-flagged buttons showing a "Coming soon"
  // toast), don't pass disabled — just branch inside onPress instead.
  disabled?: boolean;
  // A request is genuinely in flight — swaps the label for a spinner (full
  // color, not dimmed, since something IS actively happening) and blocks
  // onPress the same as disabled. Distinct from `disabled` on purpose: a
  // dimmed-but-static button reads as "broken" while something is loading.
  loading?: boolean;
  icon?: ComponentProps<typeof FontAwesome5>['name'];
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  style,
}: Props) {
  const textColor = variant === 'primary' ? colors.surface : colors.harvestGreen;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        disabled && !loading && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? <FontAwesome5 name={icon} size={16} color={textColor} /> : null}
          <Text
            style={[
              typography.button,
              variant === 'primary' ? styles.primaryText : styles.secondaryText,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: geometry.primaryButton.height,
    borderRadius: geometry.primaryButton.radius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
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
