import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/app/EmptyState';
import { OrderStageStepper } from '@/components/app/OrderStageStepper';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useOrderDetail } from '@/hooks/useOrderDetail';
import { strings } from '@/i18n/strings';
import { findOrCreateConversation } from '@/lib/conversations';
import { formatNaira } from '@/lib/currency';
import {
  isAtDeliveryConfirmationStage,
  nextFarmerActionLabel,
  type FulfillmentType,
  type OrderStatus,
} from '@/lib/orderStatus';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { order, loading, advancing, error, advance, markDelivered, markReceived, cancelOrder } =
    useOrderDetail(id);
  const [receivedConfirmVisible, setReceivedConfirmVisible] = useState(false);
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const status = order?.status as OrderStatus | undefined;
  const fulfillmentType = (order?.fulfillment_type ?? null) as FulfillmentType | null;
  const isPickup = fulfillmentType === 'pickup';

  const handleMessage = async () => {
    if (!order || messaging) return;
    setMessaging(true);
    const conversationId = await findOrCreateConversation(order.farmerProfileId);
    setMessaging(false);
    if (conversationId) router.push(`/(app)/message/${conversationId}`);
  };

  const renderFarmerActions = () => {
    if (!order || !status) return null;
    if (status === 'cancelled') return null;
    if (status === 'delivered') return null;

    const advanceLabel = nextFarmerActionLabel(status, fulfillmentType);
    const atConfirmStage = isAtDeliveryConfirmationStage(status, fulfillmentType);

    return (
      <>
        {advanceLabel ? (
          <Button label={advanceLabel} onPress={advance} loading={advancing} style={styles.actionButton} />
        ) : atConfirmStage && !order.farmer_confirmed_at ? (
          <Button
            label={strings.trackOrderProductDelivered}
            onPress={markDelivered}
            loading={advancing}
            style={styles.actionButton}
          />
        ) : atConfirmStage && order.farmer_confirmed_at ? (
          <Text style={[typography.caption, styles.waitingText]}>{strings.trackOrderWaitingOnHousehold}</Text>
        ) : null}

        <Pressable
          onPress={() => setCancelConfirmVisible(true)}
          style={styles.cancelLink}
          accessibilityRole="button"
          accessibilityLabel={strings.trackOrderCancelOrder}
        >
          <Text style={styles.cancelLinkText}>{strings.trackOrderCancelOrder}</Text>
        </Pressable>
      </>
    );
  };

  const renderHouseholdActions = () => {
    if (!order || !status) return null;

    if (status === 'cancelled') {
      if (order.payment_status === 'refund_pending') {
        return (
          <View style={styles.refundCard}>
            <Text style={[typography.label, styles.refundTitle]}>{strings.trackOrderRefundPendingTitle}</Text>
            <Text style={[typography.caption, styles.refundMessage]}>{strings.trackOrderRefundPendingMessage}</Text>
            <Button
              label={strings.trackOrderAddRefundDetails}
              onPress={() => router.push('/(app)/settings/bank-details')}
              style={styles.refundButton}
            />
          </View>
        );
      }
      if (order.payment_status === 'refunded') {
        return <Text style={[typography.label, styles.refundedText]}>{strings.trackOrderRefunded}</Text>;
      }
      return null;
    }

    const atConfirmStage = isAtDeliveryConfirmationStage(status, fulfillmentType);
    if (!atConfirmStage) return null;

    if (!order.household_confirmed_at) {
      return (
        <Button
          label={strings.trackOrderProductReceived}
          onPress={() => setReceivedConfirmVisible(true)}
          loading={advancing}
          style={styles.actionButton}
        />
      );
    }
    if (status !== 'delivered') {
      return <Text style={[typography.caption, styles.waitingText]}>{strings.trackOrderWaitingOnFarmer}</Text>;
    }
    return null;
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
          <Text style={styles.backLabel}>‹ {strings.back}</Text>
        </Pressable>
        <Text style={typography.button} numberOfLines={1}>
          {strings.orderDetailTitlePrefix}
          {id?.slice(0, 6).toUpperCase()}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.harvestGreen} />
        </View>
      ) : !order ? (
        <EmptyState icon="receipt" title={strings.orderDetailNotFound} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.stepperWrap}>
            <OrderStageStepper status={status!} fulfillmentType={fulfillmentType} />
          </View>

          <View style={styles.customerCard}>
            <View style={styles.customerRow}>
              <Text style={[typography.label, styles.customerName]} numberOfLines={1}>
                {order.isViewerFarmer ? order.householdName : order.farmName}
              </Text>
              {order.isViewerFarmer && order.householdPhone ? (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${order.householdPhone}`)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={strings.orderDetailCallCustomer}
                >
                  <FontAwesome5 name="phone" size={14} color={colors.harvestGreen} />
                </Pressable>
              ) : order.isViewerHousehold ? (
                <Pressable
                  onPress={handleMessage}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={strings.farmerProfileMessage}
                >
                  <FontAwesome5 name="comment-dots" size={14} color={colors.harvestGreen} />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.addressRow}>
              <FontAwesome5 name={isPickup ? 'store' : 'truck'} size={12} color={colors.textMuted} />
              <Text style={[typography.caption, styles.addressText]} numberOfLines={2}>
                {isPickup ? strings.orderDetailPickupTag : (order.delivery_address ?? '—')}
              </Text>
            </View>
          </View>

          <Text style={[typography.label, styles.itemsTitle]}>{strings.orderDetailItemsTitle}</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={[typography.body, styles.itemName]} numberOfLines={1}>
                {item.product_name_snapshot} ×{item.quantity}
              </Text>
              <Text style={typography.body}>{formatNaira(item.line_total)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={[typography.label, styles.totalLabel]}>{strings.orderDetailTotal}</Text>
            <Text style={[typography.label, styles.totalLabel]}>{formatNaira(order.total)}</Text>
          </View>

          {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}

          {order.isViewerFarmer ? renderFarmerActions() : order.isViewerHousehold ? renderHouseholdActions() : null}
        </ScrollView>
      )}

      <ConfirmDialog
        visible={receivedConfirmVisible}
        icon="check-circle"
        title={strings.trackOrderReceivedConfirmTitle}
        message={strings.trackOrderReceivedConfirmMessage}
        confirmLabel={strings.trackOrderReceivedConfirmAction}
        cancelLabel={strings.settingsCancelAction}
        onConfirm={() => {
          setReceivedConfirmVisible(false);
          markReceived();
        }}
        onCancel={() => setReceivedConfirmVisible(false)}
      />

      <ConfirmDialog
        visible={cancelConfirmVisible}
        icon="times-circle"
        destructive
        title={strings.trackOrderCancelConfirmTitle}
        message={strings.trackOrderCancelConfirmMessage}
        confirmLabel={strings.trackOrderCancelConfirmAction}
        cancelLabel={strings.settingsCancelAction}
        onConfirm={() => {
          setCancelConfirmVisible(false);
          cancelOrder();
        }}
        onCancel={() => setCancelConfirmVisible(false)}
      />
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingBottom: spacing[40],
  },
  stepperWrap: {
    marginBottom: spacing[20],
  },
  customerCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing[12],
    marginBottom: spacing[16],
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[8],
  },
  customerName: {
    color: colors.textPrimary,
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  addressText: {
    flex: 1,
    color: colors.textMuted,
  },
  itemsTitle: {
    color: colors.textPrimary,
    marginBottom: spacing[8],
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[8],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.skeleton,
    gap: spacing[8],
  },
  itemName: {
    flex: 1,
    color: colors.textPrimary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[12],
  },
  totalLabel: {
    color: colors.textPrimary,
  },
  error: {
    color: colors.danger,
    marginTop: spacing[16],
  },
  actionButton: {
    marginTop: spacing[24],
  },
  waitingText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing[24],
  },
  cancelLink: {
    alignItems: 'center',
    marginTop: spacing[16],
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelLinkText: {
    ...typography.label,
    color: colors.danger,
  },
  refundCard: {
    backgroundColor: '#F9E8C8',
    borderRadius: 12,
    padding: spacing[16],
    marginTop: spacing[20],
  },
  refundTitle: {
    color: colors.textPrimary,
  },
  refundMessage: {
    color: colors.goldenWheatText,
    marginTop: spacing[4],
    marginBottom: spacing[12],
  },
  refundButton: {},
  refundedText: {
    color: colors.harvestGreen,
    textAlign: 'center',
    marginTop: spacing[24],
  },
});
