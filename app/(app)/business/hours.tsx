import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { strings } from '@/i18n/strings';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type DayHoursValue = { open: string; close: string };
type DayHours = DayHoursValue | null;
type BusinessHours = Record<string, DayHours>;

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

const DEFAULT_HOURS: DayHoursValue = { open: '8:00 AM', close: '6:00 PM' };

export default function BusinessHoursScreen() {
  const farmerProfile = useAuthStore((state) => state.farmerProfile);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);

  const [hours, setHours] = useState<BusinessHours>(
    () => (farmerProfile?.business_hours as BusinessHours | null) ?? {}
  );
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleDay = (key: string, open: boolean) => {
    setHours((current) => ({ ...current, [key]: open ? DEFAULT_HOURS : null }));
    setSaved(false);
  };

  const updateTime = (key: string, field: 'open' | 'close', value: string) => {
    setHours((current) => {
      const existing: DayHoursValue = current[key] ?? DEFAULT_HOURS;
      const next: DayHoursValue =
        field === 'open' ? { open: value, close: existing.close } : { open: existing.open, close: value };
      return { ...current, [key]: next };
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!farmerProfile) return;
    setSubmitting(true);
    await supabase.from('farmer_profiles').update({ business_hours: hours }).eq('id', farmerProfile.id);
    await fetchProfile();
    setSubmitting(false);
    setSaved(true);
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
        <Text style={typography.button}>{strings.businessHoursTitle}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {DAYS.map((day) => {
          const dayHours = hours[day.key];
          const isOpen = !!dayHours;
          return (
            <View key={day.key} style={styles.dayRow}>
              <View style={styles.dayHeader}>
                <Text style={[typography.label, styles.dayLabel]}>{day.label}</Text>
                <Switch
                  value={isOpen}
                  onValueChange={(next) => toggleDay(day.key, next)}
                  trackColor={{ true: colors.harvestGreen, false: colors.skeleton }}
                  thumbColor={colors.surface}
                  accessibilityRole="switch"
                  accessibilityLabel={`${day.label} open`}
                />
              </View>
              {isOpen ? (
                <View style={styles.timeRow}>
                  <TextField
                    value={dayHours!.open}
                    onChangeText={(text) => updateTime(day.key, 'open', text)}
                    placeholder={strings.businessHoursOpenLabel}
                    style={styles.timeField}
                  />
                  <Text style={styles.dash}>–</Text>
                  <TextField
                    value={dayHours!.close}
                    onChangeText={(text) => updateTime(day.key, 'close', text)}
                    placeholder={strings.businessHoursCloseLabel}
                    style={styles.timeField}
                  />
                </View>
              ) : (
                <Text style={[typography.caption, styles.closedLabel]}>{strings.businessHoursClosed}</Text>
              )}
            </View>
          );
        })}

        {saved ? <Text style={[typography.caption, styles.saved]}>{strings.businessHoursSaved}</Text> : null}

        <Button
          label={strings.businessHoursSave}
          onPress={handleSave}
          disabled={submitting}
          loading={submitting}
          style={styles.saveButton}
        />
      </ScrollView>
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
    paddingBottom: spacing[40],
  },
  dayRow: {
    paddingVertical: spacing[12],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.skeleton,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  dayLabel: {
    color: colors.textPrimary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    marginTop: spacing[8],
  },
  timeField: {
    flex: 1,
  },
  dash: {
    color: colors.textMuted,
  },
  closedLabel: {
    color: colors.textMuted,
    marginTop: spacing[4],
  },
  saved: {
    color: colors.harvestGreen,
    marginTop: spacing[16],
    textAlign: 'center',
  },
  saveButton: {
    marginTop: spacing[24],
  },
});
