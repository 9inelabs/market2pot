import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, geometry } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  // Same distinction as Button's `loading` — a spinner in place of the
  // label while a request is genuinely in flight, rather than a dimmed
  // static pill that reads as unresponsive.
  loading?: boolean;
  showChevron?: boolean;
};

// Deep-soil pill with white text + chevron — Welcome's Sign In pill and the
// profile-photo screen's Skip pill are the same shape with different labels.
export function Pill({ label, onPress, disabled, loading, showChevron = true }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.pill, disabled && !loading && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={colors.surface} size="small" />
      ) : (
        <Text style={styles.label}>
          {label}
          {showChevron ? ' »' : ''}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minWidth: geometry.signInPill.width,
    height: geometry.signInPill.height,
    borderRadius: geometry.signInPill.radius,
    paddingHorizontal: 16,
    backgroundColor: colors.deepSoil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.label,
    color: colors.surface,
  },
});
