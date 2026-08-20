import { FarmerProfileTab } from '@/components/app/profile/FarmerProfileTab';
import { AccountSettingsScreen } from '@/screens/AccountSettingsScreen';
import { useAuthStore } from '@/store/useAuthStore';

// Branches by active_view, same pattern (tabs)/index.tsx already uses for
// Home. The farmer branch is the newly-designed FarmerProfileTab (app spec
// section 7); household keeps the original combined settings screen
// unchanged, now extracted to AccountSettingsScreen so it can also be
// reached as a pushed route from the farmer tab's "App settings" row.
export default function ProfileScreen() {
  const activeView = useAuthStore((state) => state.profile?.active_view);
  const hasFarmerProfile = useAuthStore((state) => !!state.farmerProfile);
  const isFarmerView = activeView === 'farmer' && hasFarmerProfile;

  return isFarmerView ? <FarmerProfileTab /> : <AccountSettingsScreen />;
}
