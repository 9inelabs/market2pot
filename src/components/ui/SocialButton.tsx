// Imported from its own subpath, not the package root — the root barrel
// re-exports all 17 icon families, and Metro bundles every family's font
// file (~4MB combined) as a side effect of that module evaluating, even
// though only FontAwesome5 is used here. Same class of bug as the Inter
// font barrel import fixed in phase 1.
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Pressable, StyleSheet, Text } from 'react-native';

import { GoogleIcon } from '@/components/brand/GoogleIcon';
import { colors, geometry } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Provider = 'google' | 'apple';

type Props = {
  provider: Provider;
  label: string;
  onPress: () => void;
};

const ICON_SIZE = 16;

// One of the paired ~188x41 buttons ("Continue with Google" / "Sign in with
// Apple") in the welcome screen's social row. Always renders at full
// opacity — whether tapping it does something real or shows a "Coming
// soon" toast is entirely the caller's onPress, not this component's
// concern.
export function SocialButton({ provider, label, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.base}>
      {provider === 'google' ? (
        <GoogleIcon size={ICON_SIZE} />
      ) : (
        <FontAwesome5 name="apple" size={ICON_SIZE} color={colors.textPrimary} />
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
  },
});
