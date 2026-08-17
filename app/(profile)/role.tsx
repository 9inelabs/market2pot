import { router } from 'expo-router';
import { View } from 'react-native';

import { AuthStepScreen } from '@/components/layout/AuthStepScreen';
import { RoleCard } from '@/components/ui/RoleCard';
import { strings } from '@/i18n/strings';
import { spacing } from '@/theme/tokens';
import type { Database } from '@/lib/database.types';

type UserRole = Database['public']['Enums']['user_role'];

// Role is chosen before authentication exists, so it can't be written to
// profiles yet (that row doesn't exist until OTP succeeds). Carried as a
// route param through phone -> verify, then written once the profile row
// is real. See phase 4 report for why role selection moved ahead of auth.
function selectRole(role: UserRole) {
  router.push({ pathname: '/(auth)/phone', params: { mode: 'signup', role } });
}

export default function RoleScreen() {
  return (
    <AuthStepScreen headline={strings.roleHeadline} subtitle={strings.roleSubtitle}>
      <View style={{ gap: spacing[16] }}>
        <RoleCard
          icon="seedling"
          label={strings.roleFarmerLabel}
          hint={strings.roleFarmerHint}
          onPress={() => selectRole('farmer')}
        />
        <RoleCard
          icon="shopping-basket"
          label={strings.roleConsumerLabel}
          hint={strings.roleConsumerHint}
          onPress={() => selectRole('consumer')}
        />
      </View>
    </AuthStepScreen>
  );
}
