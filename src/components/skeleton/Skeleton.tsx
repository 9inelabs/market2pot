import { Skeleton as MotiSkeleton } from 'moti/skeleton';
import type { ComponentProps } from 'react';

import { colors } from '@/theme/tokens';

type Props = Omit<ComponentProps<typeof MotiSkeleton>, 'Gradient' | 'colorMode' | 'colors'>;

// Palette-matched wrapper around moti/skeleton so per-screen skeletons don't
// repeat colors={[colors.skeleton, colors.skeletonHi, colors.skeleton]} every
// time. Build one composition of these per screen that mirrors that screen's
// real layout (build spec section 10.2) — this component is just the mark.
export function Skeleton(props: Props) {
  return (
    <MotiSkeleton
      colorMode="light"
      colors={[colors.skeleton, colors.skeletonHi, colors.skeleton]}
      {...props}
    />
  );
}
