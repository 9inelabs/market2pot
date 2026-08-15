import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { StyleSheet, Text } from 'react-native';

import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { strings } from '@/i18n/strings';

type Props = {
  visible: boolean;
};

export function ComingSoonToast({ visible }: Props) {
  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={styles.toast}
      pointerEvents="none"
    >
      <Text style={styles.text}>{strings.comingSoon}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: spacing[32],
    alignSelf: 'center',
    backgroundColor: colors.deepSoil,
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[12],
    borderRadius: 24,
  },
  text: {
    ...typography.label,
    color: colors.surface,
  },
});
