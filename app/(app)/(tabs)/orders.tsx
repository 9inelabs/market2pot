import { ComingSoonScreen } from '@/screens/ComingSoonScreen';

// TODO: order creation/tracking/status management — explicitly out of
// scope for the app-shell build. The orders/order_items tables and RLS
// already exist (see migrations) so this becomes real without a schema
// change once built.
export default function OrdersScreen() {
  return <ComingSoonScreen title="Orders" icon="receipt" />;
}
