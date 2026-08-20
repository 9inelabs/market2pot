import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/hooks/useCart';
import { useDeliveryLocation } from '@/hooks/useDeliveryLocation';
import { useDeliveryZones } from '@/hooks/useDeliveryZones';
import { strings } from '@/i18n/strings';
import { formatNaira } from '@/lib/currency';
import { supabase } from '@/lib/supabase';
import { colors, geometry, spacing, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type FulfillmentType = 'pickup' | 'delivery';

export default function CheckoutScreen() {
  const cart = useCart();
  const farmerId = cart.lines[0]?.farmerId;
  const { zones, loading: zonesLoading } = useDeliveryZones(farmerId);
  const { location } = useDeliveryLocation();

  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('pickup');
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeZones = zones.filter((z) => z.is_active);
  const selectedZone = activeZones.find((z) => z.id === selectedZoneId) ?? null;
  const deliveryFee = fulfillmentType === 'delivery' ? Number(selectedZone?.fee ?? 0) : 0;
  const total = cart.subtotal + deliveryFee;

  const canPay =
    cart.lines.length > 0 &&
    (fulfillmentType === 'pickup' || (!!selectedZoneId && !!location)) &&
    !submitting;

  const handlePay = async () => {
    setSubmitting(true);
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke<{
      order_id: string;
      authorization_url: string;
    }>('initialize-checkout', {
      body: {
        fulfillment_type: fulfillmentType,
        delivery_zone_id: fulfillmentType === 'delivery' ? selectedZoneId : null,
      },
    });
    setSubmitting(false);
    if (fnError || !data) {
      setError(strings.checkoutError);
      return;
    }
    router.push({
      pathname: '/(app)/payment/[orderId]',
      params: { orderId: data.order_id, url: data.authorization_url },
    });
  };

  if (cart.loading) return null;
  if (cart.lines.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.emptyWrap}>
          <EmptyState icon="shopping-cart" title={strings.cartEmptyTitle} message={strings.cartEmptyMessage} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={strings.back}
        >
          <Text style={styles.backLabel}>‹ {strings.back}</Text>
        </Pressable>
        <Text style={typography.button}>{strings.checkoutTitle}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[typography.label, styles.sectionTitle]}>{strings.checkoutFulfillmentTitle}</Text>
        <View style={styles.fulfillmentRow}>
          <Pressable
            onPress={() => setFulfillmentType('pickup')}
            style={[styles.fulfillmentOption, fulfillmentType === 'pickup' && styles.fulfillmentOptionSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected: fulfillmentType === 'pickup' }}
            accessibilityLabel={strings.checkoutPickup}
          >
            <FontAwesome5 name="store" size={16} color={fulfillmentType === 'pickup' ? colors.harvestGreen : colors.textMuted} />
            <Text style={[typography.label, styles.fulfillmentLabel]}>{strings.checkoutPickup}</Text>
            <Text style={[typography.caption, styles.fulfillmentHint]}>{strings.checkoutPickupHint}</Text>
          </Pressable>
          <Pressable
            onPress={() => setFulfillmentType('delivery')}
            style={[styles.fulfillmentOption, fulfillmentType === 'delivery' && styles.fulfillmentOptionSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected: fulfillmentType === 'delivery' }}
            accessibilityLabel={strings.checkoutDelivery}
          >
            <FontAwesome5 name="truck" size={16} color={fulfillmentType === 'delivery' ? colors.harvestGreen : colors.textMuted} />
            <Text style={[typography.label, styles.fulfillmentLabel]}>{strings.checkoutDelivery}</Text>
            <Text style={[typography.caption, styles.fulfillmentHint]}>{strings.checkoutDeliveryHint}</Text>
          </Pressable>
        </View>

        {fulfillmentType === 'delivery' ? (
          !zonesLoading && activeZones.length === 0 ? (
            <EmptyState icon="map-marked-alt" title={strings.checkoutNoZonesTitle} message={strings.checkoutNoZonesMessage} />
          ) : (
            <>
              <Text style={[typography.label, styles.sectionTitle]}>{strings.checkoutSelectZone}</Text>
              {activeZones.map((zone) => (
                <Pressable
                  key={zone.id}
                  onPress={() => setSelectedZoneId(zone.id)}
                  style={styles.zoneRow}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedZoneId === zone.id }}
                  accessibilityLabel={zone.zone_name}
                >
                  <View style={[styles.radio, selectedZoneId === zone.id && styles.radioSelected]} />
                  <Text style={[typography.body, styles.zoneName]}>{zone.zone_name}</Text>
                  <Text style={typography.body}>{formatNaira(zone.fee)}</Text>
                </Pressable>
              ))}

              {!location ? (
                <View style={styles.addressWarning}>
                  <Text style={[typography.label, styles.addressWarningTitle]}>
                    {strings.checkoutNoAddressTitle}
                  </Text>
                  <Text style={[typography.caption, styles.addressWarningMessage]}>
                    {strings.checkoutNoAddressMessage}
                  </Text>
                  <Pressable
                    onPress={() => router.push('/(app)/change-location')}
                    style={styles.setAddressButton}
                    accessibilityRole="button"
                    accessibilityLabel={strings.checkoutSetAddress}
                  >
                    <Text style={styles.setAddressText}>{strings.checkoutSetAddress}</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          )
        ) : null}

        <Text style={[typography.label, styles.sectionTitle]}>{strings.checkoutSummaryTitle}</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={typography.body}>{strings.checkoutSubtotal}</Text>
            <Text style={typography.body}>{formatNaira(cart.subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={typography.body}>{strings.checkoutDeliveryFee}</Text>
            <Text style={typography.body}>{formatNaira(deliveryFee)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotalRow]}>
            <Text style={[typography.label, styles.totalLabel]}>{strings.checkoutTotal}</Text>
            <Text style={[typography.label, styles.totalLabel]}>{formatNaira(total)}</Text>
          </View>
        </View>

        <View style={styles.escrowCard}>
          <FontAwesome5 name="shield-alt" size={16} color={colors.harvestGreen} />
          <View style={styles.escrowText}>
            <Text style={[typography.label, styles.escrowTitle]}>{strings.checkoutEscrowTitle}</Text>
            <Text style={[typography.caption, styles.escrowBody]}>{strings.checkoutEscrowBody}</Text>
          </View>
        </View>

        {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}

        <Button
          label={strings.checkoutPayNow}
          onPress={handlePay}
          disabled={!canPay}
          loading={submitting}
          style={styles.payButton}
        />
      </ScrollView>
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
  backLabel: {
    ...typography.label,
    fontSize: 16,
    color: colors.textPrimary,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingBottom: spacing[40],
  },
  sectionTitle: {
    color: colors.textPrimary,
    marginTop: spacing[20],
    marginBottom: spacing[8],
  },
  fulfillmentRow: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  fulfillmentOption: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.skeleton,
    borderRadius: 16,
    padding: spacing[16],
    minHeight: 44,
  },
  fulfillmentOptionSelected: {
    borderColor: colors.harvestGreen,
    backgroundColor: withOpacity(colors.harvestGreen, 0.08),
  },
  fulfillmentLabel: {
    color: colors.textPrimary,
    marginTop: spacing[8],
  },
  fulfillmentHint: {
    color: colors.textMuted,
    marginTop: 2,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    paddingVertical: spacing[12],
    minHeight: 44,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
  },
  radioSelected: {
    borderColor: colors.harvestGreen,
    backgroundColor: colors.harvestGreen,
  },
  zoneName: {
    flex: 1,
    color: colors.textPrimary,
  },
  addressWarning: {
    backgroundColor: '#F9E8C8',
    borderRadius: 12,
    padding: spacing[12],
    marginTop: spacing[8],
  },
  addressWarningTitle: {
    color: colors.textPrimary,
  },
  addressWarningMessage: {
    color: colors.goldenWheatText,
    marginTop: 2,
    marginBottom: spacing[8],
  },
  setAddressButton: {
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
  },
  setAddressText: {
    ...typography.label,
    color: colors.harvestGreen,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing[16],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[8],
  },
  summaryTotalRow: {
    marginBottom: 0,
    marginTop: spacing[8],
    paddingTop: spacing[8],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.skeleton,
  },
  totalLabel: {
    color: colors.textPrimary,
  },
  escrowCard: {
    flexDirection: 'row',
    gap: spacing[12],
    backgroundColor: withOpacity(colors.harvestGreen, 0.08),
    borderRadius: 12,
    padding: spacing[12],
    marginTop: spacing[16],
  },
  escrowText: {
    flex: 1,
  },
  escrowTitle: {
    color: colors.textPrimary,
  },
  escrowBody: {
    color: colors.textMuted,
    marginTop: spacing[4],
  },
  error: {
    color: colors.danger,
    marginTop: spacing[16],
  },
  payButton: {
    marginTop: spacing[24],
  },
});
