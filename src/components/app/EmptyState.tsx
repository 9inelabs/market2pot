import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  icon: ComponentProps<typeof FontAwesome5>['name'];
  title: string;
  message?: string;
};

// Shared empty-state shape — icon badge, title, optional message. Used by
// every data-dependent screen in the app shell (no location, no nearby
// farmers, no listings yet, no orders yet, no reviews yet, ...).
export function EmptyState({ icon, title, message }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <FontAwesome5 name={icon} size={22} color={colors.harvestGreen} />
      </View>
      <Text style={[typography.label, styles.title]}>{title}</Text>
      {message ? <Text style={[typography.caption, styles.message]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing[32],
    paddingHorizontal: spacing[24],
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: withOpacity(colors.harvestGreen, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[12],
  },
  title: {
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing[4],
  },
});
