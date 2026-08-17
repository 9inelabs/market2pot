import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { AuthStepScreen } from '@/components/layout/AuthStepScreen';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextField } from '@/components/ui/TextField';
import { useLocationDetection } from '@/hooks/useLocationDetection';
import { strings } from '@/i18n/strings';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function FarmLocationScreen() {
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
    permissionTitle: strings.farmLocationPermissionTitle,
    permissionBody: strings.farmLocationPermissionBody,
    permissionAllow: strings.farmLocationPermissionAllow,
    permissionDeny: strings.farmLocationPermissionDeny,
    detectFailed: strings.farmLocationDetectFailed,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!addressLine.trim()) {
      setError('Enter an address to continue');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setError(userError?.message ?? 'Your session expired — sign in again.');
        return;
      }

      const { error: insertError } = await supabase.from('farm_locations').insert({
        profile_id: user.id,
        address_line: addressLine.trim(),
        state: detected?.state ?? null,
        lga: detected?.lga ?? null,
        latitude: detected?.latitude ?? null,
        longitude: detected?.longitude ?? null,
      });
      if (insertError) {
        setError(insertError.message);
        return;
      }

      const { error: stepError } = await supabase
        .from('profiles')
        .update({ step: 'bank_pending' })
        .eq('id', user.id);
      if (stepError) {
        setError(stepError.message);
        return;
      }

      await useAuthStore.getState().fetchProfile();
      router.push('/(profile)/bank-details');
    } catch (err) {
      // Without this, any thrown error would leave `submitting` stuck true
      // forever — the button would look disabled and do nothing.
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthStepScreen
      headline={strings.farmLocationHeadline}
      subtitle={strings.farmLocationSubtitle}
      footer={
        <Button
          label={strings.farmLocationContinue}
          onPress={handleContinue}
          disabled={submitting}
          loading={submitting}
        />
      }
    >
      <Button
        label={strings.farmLocationUseCurrent}
        icon="crosshairs"
        onPress={handleUseCurrentLocation}
        disabled={detecting}
        loading={detecting}
      />

      <Text style={[typography.body, styles.or]}>{strings.farmLocationOr}</Text>

      <TextField
        value={addressLine}
        onChangeText={handleAddressChange}
        placeholder={strings.farmLocationPlaceholder}
      />

      {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}

      <ConfirmDialog
        visible={permissionDialogVisible}
        icon="map-marker-alt"
        title={strings.farmLocationPermissionTitle}
        message={strings.farmLocationPermissionBody}
        confirmLabel={strings.farmLocationPermissionAllow}
        cancelLabel={strings.farmLocationPermissionDeny}
        onConfirm={confirmPermission}
        onCancel={dismissPermission}
      />
    </AuthStepScreen>
  );
}

const styles = {
  or: {
    color: colors.textPrimary,
    textAlign: 'center' as const,
  },
  error: {
    color: colors.danger,
  },
};
