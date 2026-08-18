import { router } from 'expo-router';

import { ComingSoonScreen } from '@/screens/ComingSoonScreen';

// TODO: no real translations/locale system exists yet — strings.ts's own
// header comment already flags this as future work.
export default function LanguageScreen() {
  return <ComingSoonScreen title="Language" icon="globe" onBack={() => router.back()} />;
}
