import { router } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsRow } from '@/components/app/SettingsRow';
import { useDeliveryZones } from '@/hooks/useDeliveryZones';
import { useVerificationProgress } from '@/hooks/useVerificationProgress';
import { strings } from '@/i18n/strings';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, geometry, spacing, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type BusinessHours = Record<string, { open: string; close: string } | null>;

function formatHoursSummary(hours: BusinessHours | null): string {
  if (!hours) return strings.businessSettingsHoursNotSet;
  const openDays = Object.entries(hours).filter(([, v]) => v);
  if (openDays.length === 0) return strings.businessSettingsHoursNotSet;
  const [, first] = openDays[0];
  return `${openDays.length} days · ${first!.open} – ${first!.close}`;
}

export default function BusinessSettingsScreen() {
  const farmerProfile = useAuthStore((state) => state.farmerProfile);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const { zones } = useDeliveryZones(farmerProfile?.id);
  const { completeCount, total } = useVerificationProgress();

  const isOpen = farmerProfile?.is_open_now ?? true;

  const toggleOpen = async (next: boolean) => {
    if (!farmerProfile) return;
    await supabase.from('farmer_profiles').update({ is_open_now: next }).eq('id', farmerProfile.id);
    await fetchProfile();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={strings.back}
        >
          <Text style={styles.backLabel}>‹ {strings.back}</Text>
        </Pressable>
        <Text style={typography.button}>{strings.businessSettingsTitle}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.openRow}>
          <View style={styles.openLabelRow}>
            <View style={[styles.dot, { backgroundColor: isOpen ? colors.harvestGreen : colors.textMuted }]} />
            <Text style={[typography.label, styles.openLabel]}>{strings.businessSettingsOpenToggle}</Text>
          </View>
          <Switch
            value={isOpen}
            onValueChange={toggleOpen}
            trackColor={{ true: colors.harvestGreen, false: colors.skeleton }}
            thumbColor={colors.surface}
            accessibilityRole="switch"
            accessibilityLabel={strings.businessSettingsOpenToggle}
          />
        </View>

        <Text style={[typography.caption, styles.sectionLabel]}>
          {strings.businessSettingsDeliverySection}
        </Text>
        <View style={styles.sectionCard}>
          <SettingsRow
            icon="map-marked-alt"
            label={strings.businessSettingsDeliveryZones}
            value={
              zones.length > 0
                ? strings.businessSettingsDeliveryZonesCount(zones.length)
                : strings.businessSettingsDeliveryZonesEmpty
            }
            onPress={() => router.push('/(app)/business/delivery-zones')}
          />
        </View>

        <Text style={[typography.caption, styles.sectionLabel]}>
          {strings.businessSettingsAvailabilitySection}
        </Text>
        <View style={styles.sectionCard}>
          <SettingsRow
            icon="clock"
            label={strings.businessSettingsHours}
            value={formatHoursSummary(farmerProfile?.business_hours as BusinessHours | null)}
            onPress={() => router.push('/(app)/business/hours')}
          />
        </View>

        <Text style={[typography.caption, styles.sectionLabel]}>
          {strings.businessSettingsTrustSection}
        </Text>
        <View style={styles.sectionCard}>
          <SettingsRow
            icon="shield-alt"
            label={strings.businessSettingsVerification}
            value={strings.businessSettingsVerificationCount(completeCount, total || 4)}
            onPress={() => router.push('/(app)/business/verification')}
            trailing={
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{`${completeCount}/${total || 4}`}</Text>
              </View>
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
  backLabel: {
    ...typography.label,
    fontSize: 16,
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[12],
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: withOpacity(colors.harvestGreen, 0.08),
    borderColor: '#C7DBCB',
    borderWidth: 0.5,
    borderRadius: 12,
    padding: spacing[12],
    marginBottom: spacing[20],
    minHeight: 44,
  },
  openLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  openLabel: {
    color: colors.textPrimary,
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
  badge: {
    backgroundColor: '#F9E8C8',
    borderRadius: 8,
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    marginRight: spacing[8],
  },
  badgeText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.goldenWheatText,
  },
});
