import { router } from 'expo-router';

import { ComingSoonScreen } from '@/screens/ComingSoonScreen';

// TODO: real cart/checkout/Paystack payment — explicitly out of scope for
// the app-shell build. useCartStore's item count is local-only for now.
export default function CartScreen() {
  return <ComingSoonScreen title="Cart" icon="shopping-cart" onBack={() => router.back()} />;
}
