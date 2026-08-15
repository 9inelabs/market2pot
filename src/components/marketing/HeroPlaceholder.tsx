import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

// TEMPORARY: no hero illustration asset exists in assets/ yet — see the
// phase 3 report. This is the swap point: replace this component's body
// with the real illustration (Image or SVG) once exported; the welcome
// screen just gives it a sized container and doesn't need to change.
export function HeroPlaceholder() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Hero illustration</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.skeleton,
    borderRadius: spacing[24],
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
