import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { AuthStepScreen } from '@/components/layout/AuthStepScreen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { strings } from '@/i18n/strings';
import { useRegisterFarmerStore } from '@/store/useRegisterFarmerStore';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function RegisterFarmerFarmDetailsScreen() {
  const setFarmDetails = useRegisterFarmerStore((state) => state.setFarmDetails);
  const [farmName, setFarmName] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    if (!farmName.trim()) {
      setError(strings.registerFarmerFarmNameRequired);
      return;
    }
    setError(null);
    setFarmDetails(farmName.trim(), bio.trim());
    router.push('/(app)/register-farmer/location');
  };

  return (
    <AuthStepScreen
      headline={strings.registerFarmerFarmDetailsHeadline}
      subtitle={strings.registerFarmerFarmDetailsSubtitle}
      footer={<Button label={strings.registerFarmerContinue} onPress={handleContinue} />}
    >
      <Text style={[typography.label, styles.fieldLabel]}>{strings.registerFarmerFarmNameLabel}</Text>
      <TextField
        value={farmName}
        onChangeText={setFarmName}
        placeholder={strings.registerFarmerFarmNamePlaceholder}
        autoCapitalize="words"
        autoFocus
      />

      <Text style={[typography.label, styles.fieldLabel]}>{strings.registerFarmerBioLabel}</Text>
      <TextField
        value={bio}
        onChangeText={setBio}
        placeholder={strings.registerFarmerBioPlaceholder}
        multiline
        numberOfLines={4}
        style={styles.bioInput}
      />

      {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}
    </AuthStepScreen>
  );
}

const styles = {
  fieldLabel: {
    color: colors.textPrimary,
    marginTop: spacing[8],
    marginBottom: spacing[8],
  },
  bioInput: {
    height: 100,
    paddingTop: spacing[16],
    textAlignVertical: 'top' as const,
  },
  error: {
    color: colors.danger,
    marginTop: spacing[8],
  },
};
