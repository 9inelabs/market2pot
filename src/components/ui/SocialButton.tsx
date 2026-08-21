// Imported from its own subpath, not the package root — the root barrel
// re-exports all 17 icon families, and Metro bundles every family's font
// file (~4MB combined) as a side effect of that module evaluating, even
// though only FontAwesome5 is used here. Same class of bug as the Inter
// font barrel import fixed in phase 1.
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Pressable, StyleSheet, Text } from 'react-native';

import { GoogleIcon } from '@/components/brand/GoogleIcon';
import { colors, geometry, withOpacity } from '@/theme/tokens';
import { bodyFont } from '@/theme/typography';

type Provider = 'google' | 'apple';

// Pure black in the design frame, a shade darker than the deepSoil used for
// body copy.
const LABEL_COLOR = '#000000';

type Props = {
  provider: Provider;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  // Design-frame px, multiplied by the caller's device scale.
  scale?: number;
};

// One of the paired 188.5x40.5 buttons ("Continue with" + Google mark /
// "Sign in with" + Apple mark) in the welcome screen's social row. The mark
// sits *after* the label, and the label stops at "with" — the provider name
// is the icon, which is why the accessible name is passed separately.
//
// Always renders at full opacity — whether tapping it does something real or
// shows a "Coming soon" toast is entirely the caller's onPress, not this
// component's concern.
export function SocialButton({ provider, label, accessibilityLabel, onPress, scale = 1 }: Props) {
  const iconSize = 18 * scale;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        {
          width: geometry.socialButton.width * scale,
          height: geometry.socialButton.height * scale,
          borderRadius: geometry.socialButton.radius * scale,
          gap: 8 * scale,
        },
      ]}
    >
      <Text style={[styles.label, { fontSize: 14 * scale }]} numberOfLines={1}>
        {label}
      </Text>
      {provider === 'google' ? (
        <GoogleIcon size={iconSize} />
      ) : (
        <FontAwesome5 name="apple" size={iconSize} color={LABEL_COLOR} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: withOpacity(colors.goldenWheat, geometry.socialButton.opacity),
    borderWidth: geometry.socialButton.borderWidth,
    borderColor: colors.goldenWheat,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...bodyFont('medium'),
    color: LABEL_COLOR,
  },
});
