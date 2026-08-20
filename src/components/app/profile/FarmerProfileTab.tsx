import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsRow } from '@/components/app/SettingsRow';
import { AvatarPicker } from '@/components/ui/AvatarPicker';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useFarmerVerification } from '@/hooks/useFarmerVerification';
import { strings } from '@/i18n/strings';
import { getInitials } from '@/lib/initials';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, geometry, spacing, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

function RowSeparator() {
  return <View style={styles.rowSeparator} />;
}

// Farmer Profile tab — matches assets/materials/farmers screen/
// 06-profile-tab.html. Only rendered when the user has both a household
// profile and a farmer_profiles row and is currently in the farmer
// active_view (gated by the (tabs)/profile.tsx dispatcher, same pattern
// Home already uses to branch by active_view).
export function FarmerProfileTab() {
  const profile = useAuthStore((state) => state.profile);
  const farmerProfile = useAuthStore((state) => state.farmerProfile);
  const signOut = useAuthStore((state) => state.signOut);
  const setActiveView = useAuthStore((state) => state.setActiveView);
  const { isVerified } = useFarmerVerification(farmerProfile?.profile_id);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [locationLine, setLocationLine] = useState<string | null>(null);

  useEffect(() => {
    if (!farmerProfile) return;
    let cancelled = false;
    supabase
      .from('farm_locations')
      .select('address_line, lga, state')
      .eq('profile_id', farmerProfile.profile_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const short = [data.lga, data.state].filter(Boolean).join(', ');
        setLocationLine(short || data.address_line);
      });
    return () => {
      cancelled = true;
    };
  }, [farmerProfile]);

  if (!farmerProfile) return null;

  const handleLogout = async () => {
    setLogoutDialogVisible(false);
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <AvatarPicker
            uri={farmerProfile.photo_url}
            initials={getInitials(farmerProfile.farm_name)}
            size={72}
          />
          <View style={styles.nameRow}>
            <Text style={[typography.button, styles.name]} numberOfLines={1}>
              {farmerProfile.farm_name}
            </Text>
            {isVerified ? (
              <FontAwesome5 name="certificate" size={13} color={colors.harvestGreen} solid />
            ) : null}
          </View>
          {locationLine ? (
            <View style={styles.locationRow}>
              <FontAwesome5 name="map-marker-alt" size={11} color={colors.textMuted} />
              <Text style={[typography.caption, styles.locationText]}>{locationLine}</Text>
            </View>
          ) : null}
          <Pressable
            onPress={() => router.push(`/(app)/farmer/${farmerProfile.id}`)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={strings.farmerProfileTabViewPublic}
          >
            <Text style={styles.viewPublic}>{strings.farmerProfileTabViewPublic} ›</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => setActiveView('household')}
          style={styles.switchRow}
          accessibilityRole="button"
          accessibilityLabel={strings.farmerProfileTabSwitchTitle}
        >
          <View style={styles.switchIconWrap}>
            <FontAwesome5 name="exchange-alt" size={15} color={colors.surface} />
          </View>
          <View style={styles.switchText}>
            <Text style={[typography.label, styles.switchTitle]}>
              {strings.farmerProfileTabSwitchTitle}
            </Text>
            <Text style={[typography.caption, styles.switchSubtitle]}>
              {strings.farmerProfileTabSwitchSubtitle}
            </Text>
          </View>
          <FontAwesome5 name="chevron-right" size={13} color={colors.harvestGreen} />
        </Pressable>

        <Text style={[typography.caption, styles.sectionLabel]}>{strings.farmerProfileTabFarmGroup}</Text>
        <View style={styles.sectionCard}>
          <SettingsRow
            icon="user-edit"
            label={strings.farmerProfileTabEditProfile}
            onPress={() => router.push('/(app)/settings/edit-profile')}
          />
          <RowSeparator />
          <SettingsRow
            icon="store"
            label={strings.farmerProfileTabBusinessSettings}
            onPress={() => router.push('/(app)/business/settings')}
          />
          <RowSeparator />
          <SettingsRow
            icon="university"
            label={strings.farmerProfileTabBankDetails}
            onPress={() => router.push('/(app)/settings/bank-details')}
          />
        </View>

        <Text style={[typography.caption, styles.sectionLabel]}>
          {strings.farmerProfileTabGeneralGroup}
        </Text>
        <View style={styles.sectionCard}>
          <SettingsRow
            icon="cog"
            label={strings.farmerProfileTabAppSettings}
            onPress={() => router.push('/(app)/settings/app-settings')}
          />
          <RowSeparator />
          <SettingsRow
            icon="question-circle"
            label={strings.farmerProfileTabHelp}
            onPress={() => router.push('/(app)/settings/help')}
          />
        </View>

        <SettingsRow
          icon="sign-out-alt"
          label={strings.farmerProfileTabLogout}
          onPress={() => setLogoutDialogVisible(true)}
        />
      </ScrollView>

      <ConfirmDialog
        visible={logoutDialogVisible}
        icon="sign-out-alt"
        title={strings.settingsLogoutConfirmTitle}
        message={strings.settingsLogoutConfirmMessage}
        confirmLabel={strings.settingsLogout}
        cancelLabel={strings.settingsCancelAction}
        onConfirm={handleLogout}
        onCancel={() => setLogoutDialogVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  content: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[20],
    paddingBottom: spacing[40],
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: spacing[16],
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    marginTop: spacing[12],
  },
  name: {
    color: colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    marginTop: spacing[4],
  },
  locationText: {
    color: colors.textMuted,
  },
  viewPublic: {
    ...typography.caption,
    color: colors.harvestGreen,
    marginTop: spacing[4],
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    backgroundColor: withOpacity(colors.harvestGreen, 0.08),
    borderColor: '#C7DBCB',
    borderWidth: 0.5,
    borderRadius: 12,
    padding: spacing[12],
    marginBottom: spacing[20],
    minHeight: 44,
  },
  switchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.harvestGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchText: {
    flex: 1,
  },
  switchTitle: {
    color: colors.textPrimary,
  },
  switchSubtitle: {
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionLabel: {
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing[4],
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: spacing[16],
    overflow: 'hidden',
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.skeleton,
    marginLeft: spacing[16] + 32 + spacing[12],
  },
});
