import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import * as Clipboard from 'expo-clipboard';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  onCopy?: () => void;
};

// Review Profile's bank summary card — same green tint as
// ResolvedAccountCard, but a copy-to-clipboard icon instead of a
// checkmark, per assets/materials/Review Profile.png.
export function BankSummaryCard({ accountName, bankName, accountNumber, onCopy }: Props) {
  const handleCopy = async () => {
    await Clipboard.setStringAsync(accountNumber);
    onCopy?.();
  };

  return (
    <View style={styles.card}>
      <View style={styles.textWrap}>
        <Text style={[typography.label, styles.name]}>{accountName}</Text>
        <Text style={[typography.caption, styles.details]}>
          {bankName} • {accountNumber}
        </Text>
      </View>
      <Pressable onPress={handleCopy} hitSlop={8}>
        <FontAwesome5 name="copy" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[12],
    backgroundColor: withOpacity(colors.harvestGreen, 0.12),
    borderRadius: 16,
    padding: spacing[16],
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
