import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { Button } from '@/components/ui/Button';
import { useCart } from '@/hooks/useCart';
import { strings } from '@/i18n/strings';
import { supabase } from '@/lib/supabase';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

const CALLBACK_PATH = '/payment/callback';

type Phase = 'paying' | 'verifying' | 'failed';

// In-app Paystack checkout — the hosted page opens inside a WebView; the
// callback URL is intercepted (never actually loaded) to detect when the
// user has finished. The WebView redirect is only a hint, though — the
// paystack-webhook Edge Function is the real source of truth for payment
// success, so this screen polls the order's own payment_status a few times
// after the redirect fires rather than trusting the redirect alone.
export default function PaymentScreen() {
  const { orderId, url } = useLocalSearchParams<{ orderId: string; url: string }>();
  const cart = useCart();
  const [phase, setPhase] = useState<Phase>('paying');
  const pollingStarted = useRef(false);

  const pollForPayment = useCallback(async () => {
    if (pollingStarted.current) return;
    pollingStarted.current = true;
    setPhase('verifying');

    for (let attempt = 0; attempt < 8; attempt++) {
      const { data } = await supabase.from('orders').select('payment_status').eq('id', orderId).single();
      if (data?.payment_status === 'paid_held') {
        await cart.clear();
        router.replace({ pathname: '/(app)/order-confirmation', params: { orderId } });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    setPhase('failed');
    pollingStarted.current = false;
  }, [orderId, cart]);

  const handleNavigationChange = (navState: WebViewNavigation) => {
    if (navState.url.includes(CALLBACK_PATH)) {
      pollForPayment();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={strings.back}
        >
          <FontAwesome5 name="times" size={16} color={colors.textPrimary} />
        </Pressable>
        <Text style={typography.button}>{strings.paymentTitle}</Text>
        <View style={{ width: 44 }} />
      </View>

      {phase === 'paying' ? (
        <WebView
          source={{ uri: url }}
          onNavigationStateChange={handleNavigationChange}
          onShouldStartLoadWithRequest={(request) => !request.url.includes(CALLBACK_PATH)}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.harvestGreen} />
            </View>
          )}
        />
      ) : phase === 'verifying' ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.harvestGreen} />
          <Text style={[typography.body, styles.verifyingText]}>{strings.paymentVerifying}</Text>
        </View>
      ) : (
        <View style={styles.loading}>
          <Text style={[typography.label, styles.failedTitle]}>{strings.paymentFailedTitle}</Text>
          <Text style={[typography.body, styles.failedMessage]}>{strings.paymentFailedMessage}</Text>
          <Button
            label={strings.paymentBackToCheckout}
            onPress={() => router.replace('/(app)/checkout')}
            style={styles.backButton}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: geometry.screenPaddingButtons,
  },
  verifyingText: {
    color: colors.textMuted,
    marginTop: spacing[16],
  },
  failedTitle: {
    color: colors.textPrimary,
  },
  failedMessage: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing[8],
  },
  backButton: {
    marginTop: spacing[24],
    alignSelf: 'stretch',
  },
});
