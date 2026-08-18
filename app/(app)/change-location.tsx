import { router } from 'expo-router';

import { ComingSoonScreen } from '@/screens/ComingSoonScreen';

// TODO: editing/re-detecting a delivery address after signup isn't in the
// app-shell spec — delivery_locations is currently written once, during
// consumer signup.
export default function ChangeLocationScreen() {
  return <ComingSoonScreen title="Change Location" icon="map-marker-alt" onBack={() => router.back()} />;
}
