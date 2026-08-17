import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthStepScreen } from '@/components/layout/AuthStepScreen';
import { AvatarPicker } from '@/components/ui/AvatarPicker';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { PhotoActionPill } from '@/components/ui/PhotoActionPill';
import { strings } from '@/i18n/strings';
import { uploadAvatar } from '@/lib/avatarUpload';
import { getInitials } from '@/lib/initials';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

// Shared between both roles — identical screen in both design uploads.
// Only the post-Continue destination differs.
export default function IdentityPhotoScreen() {
  const fullName = useAuthStore((state) => state.profile?.full_name);
  const role = useAuthStore((state) => state.profile?.role);
  const nextRoute = role === 'farmer' ? '/(profile)/farm-location' : '/(profile)/consumer-location';
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFrom = async (source: 'camera' | 'library') => {
    setError(null);
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError(
        source === 'camera'
          ? 'Camera access is off. Enable it in Settings to take a photo.'
          : 'Photo library access is off. Enable it in Settings to choose a photo.'
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
          });

    if (!result.canceled && result.assets[0]) {
      setLocalUri(result.assets[0].uri);
    }
  };

  // Throws rather than silently returning on failure — both callers below
  // wrap this in try/catch so a failure becomes a visible error instead of
  // a permanently stuck "busy" button (the bug that made Continue on the
  // full-name screen appear dead).
  const finishStep = async (avatarUrl?: string) => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error(userError?.message ?? 'Your session expired — sign in again.');
    }
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl, step: 'location_pending' })
      .eq('id', user.id);
    if (error) {
      throw error;
    }
    await useAuthStore.getState().fetchProfile();
  };

  const handleContinue = async () => {
    setBusy(true);
    setError(null);
    try {
      let avatarUrl: string | undefined;
      if (localUri) {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error(userError?.message ?? 'Your session expired — sign in again.');
        }
        avatarUrl = await uploadAvatar(user.id, localUri);
      }
      await finishStep(avatarUrl);
      router.push(nextRoute);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong uploading your photo.');
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = async () => {
    setBusy(true);
    setError(null);
    try {
      await finishStep(undefined);
      router.push(nextRoute);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthStepScreen
      headline={strings.identityPhotoHeadline}
      subtitle={strings.identityPhotoSubtitle}
      // Pulled up from the measured 50 — brings the avatar circle and
      // everything below it closer to the subtitle.
      contentGap={35}
      topRight={
        <Pill label={strings.identityPhotoSkip} onPress={handleSkip} disabled={busy} loading={busy} />
      }
      footer={
        <Button
          label={strings.identityPhotoContinue}
          onPress={handleContinue}
          disabled={busy}
          loading={busy}
        />
      }
    >
      <View style={styles.avatarWrap}>
        <AvatarPicker uri={localUri} initials={getInitials(fullName)} />
      </View>

      <View style={styles.actionsRow}>
        <PhotoActionPill
          icon="camera"
          label={strings.identityPhotoTakePhoto}
          onPress={() => pickFrom('camera')}
        />
        <PhotoActionPill
          icon="images"
          label={strings.identityPhotoSelectGallery}
          onPress={() => pickFrom('library')}
        />
      </View>

      {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}
    </AuthStepScreen>
  );
}

const styles = StyleSheet.create({
  avatarWrap: {
    alignItems: 'center',
    marginTop: spacing[16],
    marginBottom: spacing[8],
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[12],
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
  },
});
