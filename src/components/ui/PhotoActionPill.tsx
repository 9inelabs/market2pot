import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  icon: ComponentProps<typeof FontAwesome5>['name'];
  label: string;
  onPress: () => void;
};

const ICON_SIZE = 14;

// "Take Photo" / "Select Gallery" pills on the profile-photo screen.
export function PhotoActionPill({ icon, label, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.pill}>
      <FontAwesome5 name={icon} size={ICON_SIZE} color={colors.harvestGreen} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: withOpacity(colors.goldenWheat, 0.2),
  },
  label: {
    ...typography.label,
    color: colors.harvestGreen,
  },
});
