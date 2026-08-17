import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  icon: 'seedling' | 'shopping-basket';
  label: string;
  hint: string;
  onPress: () => void;
};

export function RoleCard({ icon, label, hint, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.iconWrap}>
        <FontAwesome5 name={icon} size={22} color={colors.harvestGreen} />
      </View>
      <View style={styles.textWrap}>
        <Text style={typography.button}>{label}</Text>
        <Text style={[typography.caption, styles.hint]}>{hint}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[16],
    backgroundColor: colors.surface,
    borderRadius: 25,
    paddingVertical: spacing[20],
    paddingHorizontal: spacing[24],
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(colors.harvestGreen, 0.15),
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  hint: {
    color: colors.textMuted,
  },
});
