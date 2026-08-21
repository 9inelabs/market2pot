import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, geometry, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Variant = 'primary' | 'secondary' | 'muted';

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
  // Size overrides for the brand screens, whose type is scaled off the
  // design frame rather than taken from the fixed typography scale.
  textStyle?: StyleProp<TextStyle>;
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
  textStyle,
}: Props) {
  // Labels on the tinted variants are deepSoil, not the fill color — that's
  // what the design frame shows for "Browse products" and "Log Out", and a
  // green-on-green-tint label was never legible enough to be right.
  const textColor = variant === 'primary' ? colors.warmCream : colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.base, styles[variant], disabled && !loading && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? <FontAwesome5 name={icon} size={16} color={textColor} /> : null}
          <Text style={[typography.button, { color: textColor }, textStyle]}>{label}</Text>
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
  // "fill harvestGreen @ 20% opacity" means a translucent tint on the
  // background, not the whole view at 20% opacity — that would fade the
  // label text to near-invisibility too. rgba keeps the text fully opaque.
  secondary: {
    backgroundColor: withOpacity(colors.harvestGreen, geometry.secondaryButton.opacity),
  },
  muted: {
    backgroundColor: withOpacity(colors.deepSoil, geometry.mutedButton.opacity),
  },
  disabled: {
    opacity: 0.4,
  },
});
