import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  icon: ComponentProps<typeof FontAwesome5>['name'];
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  // For a row that ends in a control (Switch/toggle) instead of a chevron.
  trailing?: ReactNode;
  disabled?: boolean;
};

// Icon + label (+ optional value) + chevron — every row in Settings and any
// future grouped list uses this shape.
export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  destructive,
  trailing,
  disabled,
}: Props) {
  const tintColor = destructive ? colors.danger : colors.harvestGreen;
  const labelColor = destructive ? colors.danger : colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.pressed : null]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.iconWrap}>
        <FontAwesome5 name={icon} size={16} color={tintColor} />
      </View>
      <Text style={[typography.body, styles.label, { color: labelColor }]}>{label}</Text>
      {value ? <Text style={[typography.caption, styles.value]}>{value}</Text> : null}
      {trailing ?? (onPress ? (
        <FontAwesome5 name="chevron-right" size={14} color={colors.textMuted} />
      ) : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing[16],
    gap: spacing[12],
  },
  pressed: {
    opacity: 0.6,
  },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
  },
  value: {
    color: colors.textMuted,
    marginRight: spacing[8],
  },
});
