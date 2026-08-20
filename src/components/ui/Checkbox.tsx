import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Pressable, StyleSheet } from 'react-native';

import { colors } from '@/theme/tokens';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  accessibilityLabel?: string;
};

const SIZE = 22;

export function Checkbox({ checked, onChange, accessibilityLabel }: Props) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      hitSlop={11}
      style={[styles.box, checked && styles.boxChecked]}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked }}
    >
      {checked ? <FontAwesome5 name="check" size={12} color={colors.surface} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: SIZE,
    height: SIZE,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: colors.harvestGreen,
    borderColor: colors.harvestGreen,
  },
});
