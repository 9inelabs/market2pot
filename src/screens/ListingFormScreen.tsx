import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
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
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [harvestDate, setHarvestDate] = useState<Date | null>(null);
  const [isPreorder, setIsPreorder] = useState(false);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [localPhotoUris, setLocalPhotoUris] = useState<string[]>([]);
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
        setDescription(data.description ?? '');
        setCategory(data.category);
        setPrice(String(data.price));
        setUnit(data.unit);
        setQuantity(String(data.quantity_available));
        setLowStockThreshold(data.low_stock_threshold != null ? String(data.low_stock_threshold) : '');
        setHarvestDate(data.harvest_date ? new Date(`${data.harvest_date}T00:00:00`) : null);
        setIsPreorder(data.is_preorder);
        setExistingPhotoUrls(data.photo_urls ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const pickPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      setLocalPhotoUris((current) => [...current, ...result.assets.map((asset) => asset.uri)]);
    }
  };

  const removeExistingPhoto = (url: string) => {
    setExistingPhotoUrls((current) => current.filter((u) => u !== url));
  };

  const removeLocalPhoto = (uri: string) => {
    setLocalPhotoUris((current) => current.filter((u) => u !== uri));
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
    if (isPreorder && (!harvestDate || harvestDate.getTime() <= Date.now())) {
      setError(strings.listingFormPreorderNeedsDate);
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

      const uploadedUrls = await Promise.all(
        localPhotoUris.map((uri) => uploadProductPhoto(user.id, uri))
      );
      const photoUrls = [...existingPhotoUrls, ...uploadedUrls];

      const quantityNumber = Number(quantity);
      const thresholdNumber = Number(lowStockThreshold);
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim(),
        price: priceNumber,
        unit: unit.trim(),
        quantity_available: Number.isFinite(quantityNumber) ? quantityNumber : 0,
        low_stock_threshold:
          lowStockThreshold.trim() && Number.isFinite(thresholdNumber) ? thresholdNumber : null,
        harvest_date: harvestDate ? toISODate(harvestDate) : null,
        is_preorder: isPreorder,
        photo_urls: photoUrls,
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
          <Text style={[typography.label, styles.fieldLabel]}>{strings.listingFormPhotosLabel}</Text>
          <View style={styles.photoRow}>
            {existingPhotoUrls.map((url) => (
              <View key={url} style={styles.photoTile}>
                <Image source={{ uri: url }} style={styles.photo} />
                <Pressable
                  onPress={() => removeExistingPhoto(url)}
                  style={styles.photoRemove}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={strings.listingFormRemovePhoto}
                >
                  <FontAwesome5 name="times" size={10} color={colors.surface} />
                </Pressable>
              </View>
            ))}
            {localPhotoUris.map((uri) => (
              <View key={uri} style={styles.photoTile}>
                <Image source={{ uri }} style={styles.photo} />
                <Pressable
                  onPress={() => removeLocalPhoto(uri)}
                  style={styles.photoRemove}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={strings.listingFormRemovePhoto}
                >
                  <FontAwesome5 name="times" size={10} color={colors.surface} />
                </Pressable>
              </View>
            ))}
            <Pressable
              onPress={pickPhotos}
              style={styles.photoAddTile}
              accessibilityRole="button"
              accessibilityLabel={strings.listingFormAddPhoto}
            >
              <FontAwesome5 name="camera" size={16} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={[typography.label, styles.fieldLabel]}>{strings.listingFormName}</Text>
          <TextField
            value={name}
            onChangeText={setName}
            placeholder={strings.listingFormNamePlaceholder}
          />

          <Text style={[typography.label, styles.fieldLabel]}>{strings.listingFormDescription}</Text>
          <TextField
            value={description}
            onChangeText={setDescription}
            placeholder={strings.listingFormDescriptionPlaceholder}
            multiline
            numberOfLines={3}
            style={styles.descriptionInput}
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

          <View style={styles.row}>
            <View style={styles.rowField}>
              <Text style={[typography.label, styles.fieldLabel]}>{strings.listingFormQuantity}</Text>
              <TextField
                value={quantity}
                onChangeText={(text) => setQuantity(text.replace(/[^0-9.]/g, ''))}
                placeholder={strings.listingFormQuantityPlaceholder}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.rowField}>
              <Text style={[typography.label, styles.fieldLabel]}>
                {strings.listingFormLowStockThreshold}
              </Text>
              <TextField
                value={lowStockThreshold}
                onChangeText={(text) => setLowStockThreshold(text.replace(/[^0-9]/g, ''))}
                placeholder={strings.listingFormLowStockThresholdPlaceholder}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <Text style={[typography.label, styles.fieldLabel]}>{strings.listingFormHarvestDate}</Text>
          <DateField
            value={harvestDate}
            onChange={setHarvestDate}
            placeholder={strings.listingFormHarvestDatePlaceholder}
            minimumDate={isPreorder ? new Date() : undefined}
            maximumDate={isPreorder ? undefined : new Date()}
          />

          <View style={styles.preorderRow}>
            <View style={styles.preorderText}>
              <Text style={[typography.body, styles.preorderLabel]}>
                {strings.listingFormPreorderLabel}
              </Text>
              <Text style={[typography.caption, styles.preorderHint]}>
                {strings.listingFormPreorderHint}
              </Text>
            </View>
            <Switch
              value={isPreorder}
              onValueChange={setIsPreorder}
              trackColor={{ true: colors.harvestGreen, false: colors.skeleton }}
              thumbColor={colors.surface}
              accessibilityRole="switch"
              accessibilityLabel={strings.listingFormPreorderLabel}
            />
          </View>

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
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  photoTile: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(42, 36, 32, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddTile: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.skeleton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionInput: {
    height: 84,
    paddingTop: spacing[16],
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  rowField: {
    flex: 1,
  },
  preorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing[12],
    marginTop: spacing[16],
    minHeight: 44,
  },
  preorderText: {
    flex: 1,
    marginRight: spacing[12],
  },
  preorderLabel: {
    color: colors.textPrimary,
  },
  preorderHint: {
    color: colors.textMuted,
    marginTop: 2,
  },
  error: {
    color: colors.danger,
    marginTop: spacing[16],
  },
  saveButton: {
    marginTop: spacing[24],
  },
});
