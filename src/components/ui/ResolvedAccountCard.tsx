import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  accountName: string;
  bankName: string;
  accountNumber: string;
};

// The green checkmark confirmation card on Bank Details / Review Profile,
// per assets/materials — "FRANKLYN RAYMOND" / "OPAY • 7037403346".
export function ResolvedAccountCard({ accountName, bankName, accountNumber }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.checkWrap}>
        <FontAwesome5 name="check" size={12} color={colors.surface} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[typography.label, styles.name]}>{accountName}</Text>
        <Text style={[typography.caption, styles.details]}>
          {bankName} • {accountNumber}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    backgroundColor: withOpacity(colors.harvestGreen, 0.12),
    borderRadius: 16,
    padding: spacing[16],
  },
  checkWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.harvestGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.harvestGreen,
  },
  details: {
    color: colors.textPrimary,
  },
});
