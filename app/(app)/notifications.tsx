import { router } from 'expo-router';

import { ComingSoonScreen } from '@/screens/ComingSoonScreen';

// TODO: no real notification system exists yet — the bell icon on both
// Home variants is static per the app spec.
export default function NotificationsScreen() {
  return <ComingSoonScreen title="Notifications" icon="bell" onBack={() => router.back()} />;
}
