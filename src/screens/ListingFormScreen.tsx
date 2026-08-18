import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { TextField } from '@/components/ui/TextField';
import { strings } from '@/i18n/strings';
import { supabase } from '@/lib/supabase';
import { uploadProductPhoto } from '@/lib/productPhotoUpload';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  productId?: string;
};

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function ListingFormScreen({ productId }: Props) {
  const farmerProfileId = useAuthStore((state) => state.farmerProfile?.id);
  const isEditing = !!productId;

  const [loading, setLoading] = useState(isEditing);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [harvestDate, setHarvestDate] = useState<Date | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setName(data.name);
        setCategory(data.category);
        setPrice(String(data.price));
        setUnit(data.unit);
        setQuantity(String(data.quantity_available));
        setHarvestDate(data.harvest_date ? new Date(`${data.harvest_date}T00:00:00`) : null);
        setExistingPhotoUrl(data.photo_url);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setLocalPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    const priceNumber = Number(price);
    if (!name.trim() || !category.trim() || !unit.trim() || !price.trim()) {
      setError(strings.listingFormRequired);
      return;
    }
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      setError(strings.listingFormPriceInvalid);
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

      let photoUrl = existingPhotoUrl;
      if (localPhotoUri) {
        photoUrl = await uploadProductPhoto(user.id, localPhotoUri);
      }

      const quantityNumber = Number(quantity);
      const payload = {
        name: name.trim(),
        category: category.trim(),
        price: priceNumber,
        unit: unit.trim(),
        quantity_available: Number.isFinite(quantityNumber) ? quantityNumber : 0,
        harvest_date: harvestDate ? toISODate(harvestDate) : null,
        photo_url: photoUrl,
      };

      if (isEditing && productId) {
        const { error: updateError } = await supabase
          .from('products')
          .update(payload)
          .eq('id', productId);
        if (updateError) {
          setError(updateError.message);
          return;
        }
      } else {
        if (!farmerProfileId) {
          setError('Your farmer profile could not be found. Try again.');
          return;
        }
        const { error: insertError } = await supabase
          .from('products')
          .insert({ ...payload, farmer_id: farmerProfileId });
        if (insertError) {
          setError(insertError.message);
          return;
        }
      }

      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const photoUri = localPhotoUri ?? existingPhotoUrl;

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
        <Text style={typography.button}>
          {isEditing ? strings.listingFormTitleEdit : strings.listingFormTitleAdd}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? null : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[typography.label, styles.fieldLabel]}>{strings.listingFormPhotoLabel}</Text>
          <Pressable
            onPress={pickPhoto}
            style={styles.photoPicker}
            accessibilityRole="button"
            accessibilityLabel={strings.listingFormPhotoLabel}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <FontAwesome5 name="camera" size={22} color={colors.textMuted} />
            )}
          </Pressable>

          <Text style={[typography.label, styles.fieldLabel]}>{strings.listingFormName}</Text>
          <TextField
            value={name}
            onChangeText={setName}
            placeholder={strings.listingFormNamePlaceholder}
          />

          <Text style={[typography.label, styles.fieldLabel]}>{strings.listingFormCategory}</Text>
          <TextField
            value={category}
            onChangeText={setCategory}
            placeholder={strings.listingFormCategoryPlaceholder}
            autoCapitalize="words"
          />

          <View style={styles.row}>
            <View style={styles.rowField}>
              <Text style={[typography.label, styles.fieldLabel]}>{strings.listingFormPrice}</Text>
              <TextField
                value={price}
                onChangeText={(text) => setPrice(text.replace(/[^0-9.]/g, ''))}
                placeholder={strings.listingFormPricePlaceholder}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.rowField}>
              <Text style={[typography.label, styles.fieldLabel]}>{strings.listingFormUnit}</Text>
              <TextField
                value={unit}
                onChangeText={setUnit}
                placeholder={strings.listingFormUnitPlaceholder}
              />
            </View>
          </View>

          <Text style={[typography.label, styles.fieldLabel]}>{strings.listingFormQuantity}</Text>
          <TextField
            value={quantity}
            onChangeText={(text) => setQuantity(text.replace(/[^0-9.]/g, ''))}
            placeholder={strings.listingFormQuantityPlaceholder}
            keyboardType="decimal-pad"
          />

          <Text style={[typography.label, styles.fieldLabel]}>{strings.listingFormHarvestDate}</Text>
          <DateField
            value={harvestDate}
            onChange={setHarvestDate}
            placeholder={strings.listingFormHarvestDatePlaceholder}
            maximumDate={new Date()}
          />

          {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}

          <Button
            label={strings.listingFormSave}
            onPress={handleSave}
            disabled={submitting}
            loading={submitting}
            style={styles.saveButton}
          />
        </ScrollView>
      )}
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
  row: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  rowField: {
    flex: 1,
  },
  error: {
    color: colors.danger,
    marginTop: spacing[16],
  },
  saveButton: {
    marginTop: spacing[24],
  },
});
