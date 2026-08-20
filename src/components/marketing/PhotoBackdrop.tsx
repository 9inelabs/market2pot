import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

const backSheetImage = require('../../../assets/design/Back Screen.jpg');

type Props = {
  children: ReactNode;
};

// Shared full-bleed photo background — welcome.tsx and the new
// welcome-back.tsx both use the exact same treatment (assets/design/Back
// Screen.jpg with a bottom gradient fading into warmCream), so it's one
// component rather than duplicating the image+gradient logic in both
// files. Content renders on top, unaffected by the backdrop's own layout.
export function PhotoBackdrop({ children }: Props) {
  return (
    <View style={styles.container}>
      <Image source={backSheetImage} style={styles.image} resizeMode="cover" />
      <LinearGradient
        colors={['transparent', withAlpha(colors.warmCream, 0.6), colors.warmCream]}
        locations={[0, 0.55, 0.85]}
        style={styles.gradient}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '65%',
  },
  content: {
    flex: 1,
  },
});
