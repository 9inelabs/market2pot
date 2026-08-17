import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  uri?: string | null;
  initials: string;
  size?: number;
};

// Circular avatar with a dashed decorative ring, per
// assets/materials/Profile picture.png. Falls back to initials when no
// photo has been picked yet.
export function AvatarPicker({ uri, initials, size = 160 }: Props) {
  // Measured off assets/materials/extracted/Profile picture.png: ring
  // diameter ~169 vs. circle ~150-160, i.e. a much tighter ring than the
  // +32 padding this originally had.
  const ringSize = size + 16;

  return (
    <View
      style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}
    >
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
          />
        ) : (
          <Text style={[styles.initials, { fontSize: size * 0.25 }]}>{initials}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    backgroundColor: colors.skeleton,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // stepHeadline, not h1/h2 — Archivo Expanded is Welcome-only. fontSize is
  // overridden per-instance, scaled to the `size` prop (see usage above) —
  // this component now renders both at 160 (Profile picture) and much
  // smaller at 64 (Review Profile's summary avatar).
  initials: {
    ...typography.stepHeadline,
    color: colors.textMuted,
  },
});
