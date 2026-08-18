import { HouseholdHome } from '@/components/app/home/HouseholdHome';
import { FarmerHome } from '@/components/app/home/FarmerHome';
import { useAuthStore } from '@/store/useAuthStore';

// A single route branching its content by active_view — same pattern
// identity-name.tsx uses for role — rather than two tab routes, since a
// tab can't point at two different files depending on runtime state.
export default function HomeScreen() {
  const activeView = useAuthStore((state) => state.profile?.active_view);
  const farmerProfile = useAuthStore((state) => state.farmerProfile);
  const isFarmerView = activeView === 'farmer' && !!farmerProfile;

  return isFarmerView ? <FarmerHome /> : <HouseholdHome />;
}
