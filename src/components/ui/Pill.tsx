import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { ChevronPair } from '@/components/brand/ChevronPair';
import { colors, geometry } from '@/theme/tokens';
import { bodyFont } from '@/theme/typography';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  // Same distinction as Button's `loading` — a spinner in place of the
  // label while a request is genuinely in flight, rather than a dimmed
  // static pill that reads as unresponsive.
  loading?: boolean;
  showChevron?: boolean;
  // Design-frame px, multiplied by the caller's device scale.
  scale?: number;
};

// Deep-soil pill with a warmCream label + chevrons — Welcome's Sign In pill
// and the profile-photo screen's Skip pill are the same shape with different
// labels. Design frame: 90x39 @ r19.5, label 14pt semibold, then a 6.4 gap
// before a 14x11.2 double chevron, all over a soft y+4 / 17.2-blur shadow at
// 17% black.
export function Pill({ label, onPress, disabled, loading, showChevron = true, scale = 1 }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.pill,
        {
          minWidth: geometry.signInPill.width * scale,
          height: geometry.signInPill.height * scale,
          borderRadius: geometry.signInPill.radius * scale,
          paddingHorizontal: 12 * scale,
          gap: 6.4 * scale,
          shadowRadius: 17.2 * scale,
          shadowOffset: { width: 0, height: 4 * scale },
        },
        disabled && !loading && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.warmCream} size="small" />
      ) : (
        <>
          <Text style={[styles.label, { fontSize: 14 * scale }]}>{label}</Text>
          {showChevron ? (
            <ChevronPair
              width={14 * scale}
              height={11.2 * scale}
              color={colors.warmCream}
              strokeWidth={2}
            />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: colors.deepSoil,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.17,
    elevation: 4,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...bodyFont('semibold'),
    color: colors.warmCream,
  },
});
