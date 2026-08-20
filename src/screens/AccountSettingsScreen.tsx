import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsRow } from '@/components/app/SettingsRow';
import { AvatarPicker } from '@/components/ui/AvatarPicker';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { strings } from '@/i18n/strings';
import { getInitials } from '@/lib/initials';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[typography.caption, styles.sectionTitle]}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function RowSeparator() {
  return <View style={styles.rowSeparator} />;
}

// The household tab's Profile content, and — via app/(app)/settings/
// app-settings.tsx — the farmer Profile tab's "App settings" menu item.
// Extracted unchanged from the original combined profile.tsx (see
// docs/reports/06-app-shell.md) so household behavior doesn't regress when
// the farmer Profile tab was rebuilt into its own dedicated component.
type Props = {
  // true only when reached as a pushed route (settings/app-settings.tsx,
  // from the farmer Profile tab) — the household tab renders this with no
  // back button, same as any other tab root.
  showBackButton?: boolean;
};

export function AccountSettingsScreen({ showBackButton }: Props = {}) {
  const profile = useAuthStore((state) => state.profile);
  const farmerProfile = useAuthStore((state) => state.farmerProfile);
  const signOut = useAuthStore((state) => state.signOut);
  const setActiveView = useAuthStore((state) => state.setActiveView);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState(false);

  const isFarmerView = profile?.active_view === 'farmer';

  const handleLogout = async () => {
    setLogoutDialogVisible(false);
    await signOut();
    router.replace('/(auth)/login');
  };

  const handleDeleteConfirm = () => {
    // TODO: real account deletion — needs careful handling (cascading
    // data, storage cleanup, Supabase auth user removal) and belongs in
    // its own dedicated pass, not rushed here. Confirmation UI is real;
    // the action itself isn't wired up yet.
    setDeleteDialogVisible(false);
    setDeleteNotice(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {showBackButton ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={strings.back}
          >
            <Text style={styles.backLabel}>‹ {strings.back}</Text>
          </Pressable>
        ) : null}
        <Text style={[typography.button, styles.title]}>{strings.settingsTitle}</Text>

        <View style={styles.profileSummary}>
          <AvatarPicker uri={profile?.avatar_url} initials={getInitials(profile?.full_name)} size={56} />
          <View style={styles.profileText}>
            <Text style={[typography.label, styles.profileName]} numberOfLines={1}>
              {profile?.full_name ?? '—'}
            </Text>
            {farmerProfile ? (
              <Text style={[typography.caption, styles.profileSub]} numberOfLines={1}>
                {farmerProfile.farm_name}
              </Text>
            ) : null}
          </View>
        </View>

        <SettingsSection title={strings.settingsAccountGroup}>
          <SettingsRow
            icon="user-edit"
            label={strings.settingsEditProfile}
            onPress={() => router.push('/(app)/settings/edit-profile')}
          />
          <RowSeparator />
          <SettingsRow icon="phone" label={strings.settingsPhoneNumber} value={profile?.phone ?? '—'} />
          <RowSeparator />
          <SettingsRow
            icon="globe"
            label={strings.settingsLanguage}
            value={strings.settingsLanguageValue}
            onPress={() => router.push('/(app)/language')}
          />
          <RowSeparator />
          <SettingsRow
            icon="bell"
            label={strings.settingsNotifications}
            trailing={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ true: colors.harvestGreen, false: colors.skeleton }}
                thumbColor={colors.surface}
                accessibilityRole="switch"
                accessibilityLabel={strings.settingsNotifications}
              />
            }
          />
        </SettingsSection>

        {farmerProfile ? (
          <SettingsSection title={strings.settingsPayoutGroup}>
            <SettingsRow
              icon="university"
              label={strings.settingsPayoutBankDetails}
              onPress={() => router.push('/(app)/settings/bank-details')}
            />
          </SettingsSection>
        ) : null}

        <SettingsSection title={strings.settingsModeGroup}>
          {farmerProfile ? (
            <SettingsRow
              icon="exchange-alt"
              label={isFarmerView ? strings.settingsSwitchToHousehold : strings.settingsSwitchToFarmer}
              value={strings.settingsSwitchModeDescription}
              onPress={() => setActiveView(isFarmerView ? 'household' : 'farmer')}
            />
          ) : (
            <SettingsRow
              icon="seedling"
              label={strings.settingsRegisterFarmer}
              onPress={() => router.push('/(app)/register-farmer/farm-details')}
            />
          )}
        </SettingsSection>

        <SettingsSection title={strings.settingsSupportGroup}>
          <SettingsRow
            icon="question-circle"
            label={strings.settingsHelp}
            onPress={() => router.push('/(app)/settings/help')}
          />
          <RowSeparator />
          <SettingsRow icon="file-alt" label={strings.settingsTerms} onPress={() => router.push('/terms')} />
          <RowSeparator />
          <SettingsRow icon="lock" label={strings.settingsPrivacy} onPress={() => router.push('/privacy')} />
        </SettingsSection>

        <SettingsSection title=" ">
          <SettingsRow
            icon="sign-out-alt"
            label={strings.settingsLogout}
            onPress={() => setLogoutDialogVisible(true)}
          />
          <RowSeparator />
          <SettingsRow
            icon="trash-alt"
            label={strings.settingsDeleteAccount}
            destructive
            onPress={() => setDeleteDialogVisible(true)}
          />
        </SettingsSection>

        {deleteNotice ? (
          <Text style={[typography.caption, styles.deleteNotice]}>
            {strings.settingsDeleteAccountUnavailable}
          </Text>
        ) : null}
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

      <ConfirmDialog
        visible={deleteDialogVisible}
        icon="trash-alt"
        destructive
        title={strings.settingsDeleteAccountConfirmTitle}
        message={strings.settingsDeleteAccountConfirmMessage}
        confirmLabel={strings.settingsDeleteAccount}
        cancelLabel={strings.settingsCancelAction}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialogVisible(false)}
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
    paddingTop: spacing[12],
    paddingBottom: spacing[40],
  },
  title: {
    color: colors.textPrimary,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing[8],
  },
  backLabel: {
    ...typography.label,
    fontSize: 16,
    color: colors.textPrimary,
  },
  profileSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    marginTop: spacing[16],
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    color: colors.textPrimary,
  },
  profileSub: {
    color: colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginTop: spacing[24],
  },
  sectionTitle: {
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing[8],
    marginLeft: spacing[4],
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.skeleton,
    marginLeft: spacing[16] + 32 + spacing[12],
  },
  deleteNotice: {
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing[16],
  },
});
