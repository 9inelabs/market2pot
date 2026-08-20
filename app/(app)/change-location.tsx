import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextField } from '@/components/ui/TextField';
import { useDeliveryLocation } from '@/hooks/useDeliveryLocation';
import { useLocationDetection } from '@/hooks/useLocationDetection';
import { strings } from '@/i18n/strings';
import { supabase } from '@/lib/supabase';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

// Real "edit delivery address" screen — reuses the exact same
// permission-rationale-then-detect-then-reverse-geocode hook consumer-
// location.tsx (onboarding) uses, but as a pushed screen writing an update
// to an existing delivery_locations row instead of the signup step-machine.
export default function ChangeLocationScreen() {
  const { location, loading: loadingCurrent } = useDeliveryLocation();
  const {
    addressLine,
    detected,
    detecting,
    error,
    setError,
    handleUseCurrentLocation,
    handleAddressChange,
    permissionDialogVisible,
    confirmPermission,
    dismissPermission,
  } = useLocationDetection({
    permissionTitle: strings.consumerLocationPermissionTitle,
    permissionBody: strings.consumerLocationPermissionBody,
    permissionAllow: strings.consumerLocationPermissionAllow,
    permissionDeny: strings.consumerLocationPermissionDeny,
    detectFailed: strings.consumerLocationDetectFailed,
  });
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (location && !addressLine) {
      handleAddressChange(location.addressLine);
    }
    // Only seed once, when the existing address first loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const handleSave = async () => {
    if (!addressLine.trim()) {
      setError(strings.consumerLocationPlaceholder);
      return;
    }
    setSubmitting(true);
    setError(null);
    setSaved(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return;
    }

    const { error: upsertError } = await supabase.from('delivery_locations').upsert(
      {
        profile_id: user.id,
        address_line: addressLine.trim(),
        state: detected?.state ?? null,
        lga: detected?.lga ?? null,
        latitude: detected?.latitude ?? null,
        longitude: detected?.longitude ?? null,
      },
      { onConflict: 'profile_id' }
    );
    setSubmitting(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    setSaved(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={styles.topBar}
        accessibilityRole="button"
        accessibilityLabel={strings.back}
      >
        <Text style={styles.backLabel}>‹ {strings.back}</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[typography.button, styles.title]}>{strings.changeLocationTitle}</Text>

        <Button
          label={strings.consumerLocationUseCurrent}
          icon="crosshairs"
          onPress={handleUseCurrentLocation}
          disabled={detecting || loadingCurrent}
          loading={detecting}
          style={styles.detectButton}
        />

        <Text style={[typography.body, styles.or]}>{strings.consumerLocationOr}</Text>

        <TextField
          value={addressLine}
          onChangeText={handleAddressChange}
          placeholder={strings.consumerLocationPlaceholder}
        />

        {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}
        {saved ? <Text style={[typography.caption, styles.saved]}>{strings.changeLocationSaved}</Text> : null}

        <Button
          label={strings.editProfileSave}
          onPress={handleSave}
          disabled={submitting}
          loading={submitting}
          style={styles.saveButton}
        />
      </ScrollView>

      <ConfirmDialog
        visible={permissionDialogVisible}
        icon="map-marker-alt"
        title={strings.consumerLocationPermissionTitle}
        message={strings.consumerLocationPermissionBody}
        confirmLabel={strings.consumerLocationPermissionAllow}
        cancelLabel={strings.consumerLocationPermissionDeny}
        onConfirm={confirmPermission}
        onCancel={dismissPermission}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  topBar: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[16],
    alignSelf: 'flex-start',
  },
  backLabel: {
    ...typography.label,
    fontSize: 16,
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[12],
    paddingBottom: spacing[40],
  },
  title: {
    color: colors.textPrimary,
    marginBottom: spacing[16],
  },
  detectButton: {
    marginBottom: spacing[16],
  },
  or: {
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing[16],
  },
  error: {
    color: colors.danger,
    marginTop: spacing[16],
  },
  saved: {
    color: colors.harvestGreen,
    marginTop: spacing[16],
  },
  saveButton: {
    marginTop: spacing[24],
  },
});
