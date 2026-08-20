import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { strings } from '@/i18n/strings';
import { uploadProductPhoto } from '@/lib/productPhotoUpload';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

// Real, updates profiles (and farmer_profiles, if this user has one) — per
// the app spec's "Edit profile (real, updates profiles table)". Farmers
// also get farm_name/bio/farm-photo fields here, since nothing else in this
// build offers a way to rename a farm after Register-as-a-farmer.
export default function EditProfileScreen() {
  const profile = useAuthStore((state) => state.profile);
  const farmerProfile = useAuthStore((state) => state.farmerProfile);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [farmName, setFarmName] = useState(farmerProfile?.farm_name ?? '');
  const [bio, setBio] = useState(farmerProfile?.bio ?? '');
  const [existingFarmPhotoUrl, setExistingFarmPhotoUrl] = useState(farmerProfile?.photo_url ?? null);
  const [localFarmPhotoUri, setLocalFarmPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const pickFarmPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setLocalFarmPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      setError(strings.editProfileRequired);
      return;
    }
    setSubmitting(true);
    setError(null);
    setSaved(false);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setError(userError?.message ?? 'Your session expired — sign in again.');
        return;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id);
      if (profileError) {
        setError(profileError.message);
        return;
      }

      if (farmerProfile) {
        let farmPhotoUrl = existingFarmPhotoUrl;
        if (localFarmPhotoUri) {
          farmPhotoUrl = await uploadProductPhoto(user.id, localFarmPhotoUri);
        }
        const { error: farmerError } = await supabase
          .from('farmer_profiles')
          .update({
            farm_name: farmName.trim() || farmerProfile.farm_name,
            bio: bio.trim() || null,
            photo_url: farmPhotoUrl,
          })
          .eq('id', farmerProfile.id);
        if (farmerError) {
          setError(farmerError.message);
          return;
        }
      }

      await fetchProfile();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const farmPhotoUri = localFarmPhotoUri ?? existingFarmPhotoUrl;

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
        <Text style={[typography.button, styles.title]}>{strings.editProfileTitle}</Text>

        {farmerProfile ? (
          <>
            <Text style={[typography.label, styles.fieldLabel]}>{strings.editProfileFarmPhoto}</Text>
            <Pressable
              onPress={pickFarmPhoto}
              style={styles.photoPicker}
              accessibilityRole="button"
              accessibilityLabel={strings.editProfileFarmPhoto}
            >
              {farmPhotoUri ? (
                <Image source={{ uri: farmPhotoUri }} style={styles.photo} />
              ) : (
                <Text style={styles.photoPlaceholderText}>+</Text>
              )}
            </Pressable>
          </>
        ) : null}

        <Text style={[typography.label, styles.fieldLabel]}>{strings.editProfileFullName}</Text>
        <TextField value={fullName} onChangeText={setFullName} autoCapitalize="words" />

        {farmerProfile ? (
          <>
            <Text style={[typography.label, styles.fieldLabel]}>{strings.editProfileFarmName}</Text>
            <TextField value={farmName} onChangeText={setFarmName} autoCapitalize="words" />

            <Text style={[typography.label, styles.fieldLabel]}>{strings.editProfileBio}</Text>
            <TextField
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              style={styles.bioInput}
            />

            <Text style={[typography.label, styles.fieldLabel]}>{strings.editProfileContactPhone}</Text>
            <View style={styles.phoneDisplay}>
              <Text style={styles.phoneDisplayText}>{profile?.phone ?? '—'}</Text>
            </View>
          </>
        ) : null}

        {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}
        {saved ? <Text style={[typography.caption, styles.saved]}>{strings.editProfileSaved}</Text> : null}

        <Button
          label={strings.editProfileSave}
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
  },
  fieldLabel: {
    color: colors.textPrimary,
    marginTop: spacing[16],
    marginBottom: spacing[8],
  },
  photoPicker: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: {
    width: 96,
    height: 96,
  },
  photoPlaceholderText: {
    fontSize: 28,
    color: colors.textMuted,
  },
  bioInput: {
    height: 100,
    paddingTop: spacing[16],
    textAlignVertical: 'top',
  },
  phoneDisplay: {
    height: geometry.textInput.height,
    borderRadius: geometry.textInput.radius,
    backgroundColor: colors.skeleton,
    paddingHorizontal: geometry.screenPaddingInputs,
    justifyContent: 'center',
  },
  phoneDisplayText: {
    ...typography.body,
    color: colors.textMuted,
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
