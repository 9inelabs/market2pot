import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

type Props = {
  count: number;
  // Defaults to terracotta (tab bars, header buttons). welcome-back's cart
  // badge is goldenWheat in the design.
  color?: string;
  size?: number;
};

// Small red-dot-with-number overlay for tab icons / header buttons — the
// unread message/notification counts. Renders nothing at 0, so callers can
// mount it unconditionally.
export function CountBadge({ count, color, size = 16 }: Props) {
  if (count <= 0) return null;
  return (
    <View
      style={[
        styles.badge,
        { minWidth: size, height: size, borderRadius: size / 2 },
        color ? { backgroundColor: color } : null,
      ]}
      pointerEvents="none"
    >
      <Text style={[styles.text, { fontSize: size * 0.5625 }]} numberOfLines={1}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  text: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.surface,
  },
});
