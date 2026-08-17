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

export default function ConsumerLocationScreen() {
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
      if (upsertError) {
        setError(upsertError.message);
        return;
      }

      const { error: stepError } = await supabase
        .from('profiles')
        .update({ step: 'complete' })
        .eq('id', user.id);
      if (stepError) {
        setError(stepError.message);
        return;
      }

      await useAuthStore.getState().fetchProfile();
      router.replace('/(app)');
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
      headline={strings.consumerLocationHeadline}
      subtitle={strings.consumerLocationSubtitle}
      footer={
        <Button
          label={strings.consumerLocationContinue}
          onPress={handleContinue}
          disabled={submitting}
          loading={submitting}
        />
      }
    >
      <Button
        label={strings.consumerLocationUseCurrent}
        icon="crosshairs"
        onPress={handleUseCurrentLocation}
        disabled={detecting}
        loading={detecting}
      />

      <Text style={[typography.body, styles.or]}>{strings.consumerLocationOr}</Text>

      <TextField
        value={addressLine}
        onChangeText={handleAddressChange}
        placeholder={strings.consumerLocationPlaceholder}
      />

      {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}

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
