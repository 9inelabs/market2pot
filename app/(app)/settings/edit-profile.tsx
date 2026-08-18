import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { strings } from '@/i18n/strings';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

// Real, updates profiles (and farmer_profiles, if this user has one) — per
// the app spec's "Edit profile (real, updates profiles table)". Farmers
// also get farm_name/bio fields here, since nothing else in this build
// offers a way to rename a farm after Register-as-a-farmer.
export default function EditProfileScreen() {
  const profile = useAuthStore((state) => state.profile);
  const farmerProfile = useAuthStore((state) => state.farmerProfile);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [farmName, setFarmName] = useState(farmerProfile?.farm_name ?? '');
  const [bio, setBio] = useState(farmerProfile?.bio ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
        const { error: farmerError } = await supabase
          .from('farmer_profiles')
          .update({ farm_name: farmName.trim() || farmerProfile.farm_name, bio: bio.trim() || null })
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
  bioInput: {
    height: 100,
    paddingTop: spacing[16],
    textAlignVertical: 'top',
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
