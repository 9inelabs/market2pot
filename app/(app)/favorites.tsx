import { router } from 'expo-router';

import { ComingSoonScreen } from '@/screens/ComingSoonScreen';

// TODO: no favorites table/feature exists yet — flagged in the app spec
// itself as a TODO, not a build gap.
export default function FavoritesScreen() {
  return <ComingSoonScreen title="Favorites" icon="heart" onBack={() => router.back()} />;
}
