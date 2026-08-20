import { StyleSheet, Text, View } from 'react-native';

import { strings } from '@/i18n/strings';
import type { OrderStatus } from '@/lib/orderStatus';
import { typography } from '@/theme/typography';

// Mockup-exact pastel status colors (assets/materials/farmers screen/07-
// orders-list.html, 08-order-detail.html) — distinct from the core brand
// palette in theme/tokens.ts, so kept local rather than added there.
const STYLES: Record<OrderStatus, { bg: string; fg: string; label: string }> = {
  pending: { bg: '#F9E8C8', fg: '#8A6417', label: strings.ordersStatusPending },
  preparing: { bg: '#F4E4D4', fg: '#A35A2E', label: strings.ordersStatusPreparing },
  packaged: { bg: '#F4E4D4', fg: '#A35A2E', label: strings.ordersStatusPackaged },
  ready_for_pickup: { bg: '#EAF1EC', fg: '#3F7A52', label: strings.ordersStatusReadyForPickup },
  out_for_delivery: { bg: '#EAF1EC', fg: '#3F7A52', label: strings.ordersStatusOutForDelivery },
  delivered: { bg: '#E1EEE3', fg: '#2E5E3D', label: strings.ordersStatusDelivered },
  cancelled: { bg: '#EDE4D3', fg: '#B3261E', label: strings.ordersStatusCancelled },
};

type Props = {
  status: OrderStatus;
};

export function StatusBadge({ status }: Props) {
  const style = STYLES[status] ?? STYLES.pending;
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[typography.caption, styles.text, { color: style.fg }]}>{style.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
  },
});
