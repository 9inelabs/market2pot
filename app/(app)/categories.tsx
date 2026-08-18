import { router } from 'expo-router';

import { ComingSoonScreen } from '@/screens/ComingSoonScreen';

// TODO: real category browse/product listing screens — explicitly out of
// scope for the app-shell build (see the phase report).
export default function CategoriesScreen() {
  return <ComingSoonScreen title="Categories" icon="th-large" onBack={() => router.back()} />;
}
