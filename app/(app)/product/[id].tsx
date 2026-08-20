import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/app/EmptyState';
import { ProductQuickViewModal } from '@/components/app/ProductQuickViewModal';
import { useCart } from '@/hooks/useCart';
import type { Product } from '@/hooks/useFreshProducts';
import { strings } from '@/i18n/strings';
import { formatNaira } from '@/lib/currency';
import { supabase } from '@/lib/supabase';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

const screenWidth = Dimensions.get('window').width;

type ProductWithFarm = Product & { farm_name: string | null; farmer_profile_id: string | null };

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<ProductWithFarm | null>(null);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const cart = useCart();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    supabase
      .from('products')
      .select('*, farmer_profiles(id, farm_name)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          const farmerProfile = data.farmer_profiles as unknown as { id: string; farm_name: string } | null;
          setProduct({ ...data, farm_name: farmerProfile?.farm_name ?? null, farmer_profile_id: farmerProfile?.id ?? null });
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

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
        <Text style={typography.button}>{strings.productDetailTitle}</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.harvestGreen} />
        </View>
      ) : !product ? (
        <EmptyState icon="seedling" title={strings.productDetailNotFound} />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {(product.photo_urls.length > 0 ? product.photo_urls : [null]).map((url, index) => (
                <View key={index} style={[styles.photoPage, { width: screenWidth }]}>
                  {url ? (
                    <Image source={{ uri: url }} style={styles.photo} />
                  ) : (
                    <View style={[styles.photo, styles.photoPlaceholder]}>
                      <FontAwesome5 name="seedling" size={32} color={colors.textMuted} />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>

            <View style={styles.body}>
              <Text style={[typography.button, styles.name]}>{product.name}</Text>
              <Text style={[typography.label, styles.price]}>
                {formatNaira(product.price)} • {product.unit}
              </Text>

              {product.farm_name ? (
                <Pressable
                  onPress={() => router.push(`/(app)/farmer/${product.farmer_profile_id}`)}
                  style={styles.farmRow}
                  accessibilityRole="button"
                  accessibilityLabel={`${strings.productDetailSoldBy} ${product.farm_name}`}
                >
                  <FontAwesome5 name="seedling" size={13} color={colors.harvestGreen} />
                  <Text style={styles.farmText}>
                    {strings.productDetailSoldBy} {product.farm_name}
                  </Text>
                  <FontAwesome5 name="chevron-right" size={11} color={colors.harvestGreen} />
                </Pressable>
              ) : null}

              <Text style={[typography.label, styles.sectionTitle]}>
                {strings.productDetailDescriptionTitle}
              </Text>
              <Text style={[typography.body, styles.description]}>
                {product.description?.trim() || strings.productDetailNoDescription}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={() => setAddModalVisible(true)}
              style={styles.addButton}
              accessibilityRole="button"
              accessibilityLabel={strings.productQuickViewAddToCart}
            >
              <Text style={styles.addButtonText}>{strings.productQuickViewAddToCart}</Text>
            </Pressable>
          </View>

          <ProductQuickViewModal
            visible={addModalVisible}
            product={{
              id: product.id,
              name: product.name,
              price: product.price,
              unit: product.unit,
              photoUrls: product.photo_urls,
              quantityAvailable: product.quantity_available,
              farmerId: product.farmer_id,
            }}
            onClose={() => setAddModalVisible(false)}
            onAddToCart={cart.addItem}
            onViewFull={() => setAddModalVisible(false)}
          />
        </>
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingBottom: spacing[48],
  },
  photoPage: {
    aspectRatio: 1,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    backgroundColor: colors.skeleton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[16],
  },
  name: {
    color: colors.textPrimary,
  },
  price: {
    color: colors.harvestGreen,
    marginTop: spacing[4],
  },
  farmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    marginTop: spacing[16],
    minHeight: 44,
  },
  farmText: {
    ...typography.label,
    color: colors.harvestGreen,
    flex: 1,
  },
  sectionTitle: {
    color: colors.textPrimary,
    marginTop: spacing[20],
    marginBottom: spacing[8],
  },
  description: {
    color: colors.textMuted,
  },
  footer: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingVertical: spacing[16],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.skeleton,
  },
  addButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.harvestGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    ...typography.button,
    color: colors.surface,
  },
});
