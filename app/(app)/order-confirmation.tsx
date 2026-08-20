import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { strings } from '@/i18n/strings';
import { colors, geometry, spacing, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function OrderConfirmationScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <FontAwesome5 name="check" size={28} color={colors.harvestGreen} />
        </View>
        <Text style={[typography.button, styles.title]}>{strings.orderConfirmedTitle}</Text>
        <Text style={[typography.body, styles.message]}>{strings.orderConfirmedMessage}</Text>

        <Button
          label={strings.orderConfirmedTrackOrder}
          onPress={() => router.replace(`/(app)/order/${orderId}`)}
          style={styles.trackButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: geometry.screenPaddingButtons,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: withOpacity(colors.harvestGreen, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[20],
  },
  title: {
    color: colors.textPrimary,
  },
  message: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing[8],
  },
  trackButton: {
    marginTop: spacing[32],
    alignSelf: 'stretch',
  },
});
