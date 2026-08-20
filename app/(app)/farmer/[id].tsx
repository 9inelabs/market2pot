import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/app/EmptyState';
import { ProductCard } from '@/components/app/ProductCard';
import { ProductQuickViewModal } from '@/components/app/ProductQuickViewModal';
import { SectionHeader } from '@/components/app/SectionHeader';
import { AvatarPicker } from '@/components/ui/AvatarPicker';
import { Button } from '@/components/ui/Button';
import { useFarmerDetail } from '@/hooks/useFarmerDetail';
import { useFreshProducts } from '@/hooks/useFreshProducts';
import { useProductQuickView } from '@/hooks/useProductQuickView';
import { strings } from '@/i18n/strings';
import { findOrCreateConversation } from '@/lib/conversations';
import { getInitials } from '@/lib/initials';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function FarmerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { farmer, loading } = useFarmerDetail(id);
  const { products, loading: productsLoading } = useFreshProducts({ farmerId: id });
  const { cart, selectedProduct, open, close, viewFull } = useProductQuickView();
  const [saved, setSaved] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const handleMessage = async () => {
    if (!farmer || messaging) return;
    setMessaging(true);
    const conversationId = await findOrCreateConversation(farmer.id);
    setMessaging(false);
    if (conversationId) {
      router.push(`/(app)/message/${conversationId}`);
    }
  };

  const productRows = useMemo(() => {
    const rows: (typeof products)[] = [];
    for (let i = 0; i < products.length; i += 2) {
      rows.push(products.slice(i, i + 2));
    }
    return rows;
  }, [products]);

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
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.harvestGreen} />
        </View>
      ) : !farmer ? (
        <EmptyState icon="user" title={strings.farmerProfileNotFound} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <AvatarPicker uri={farmer.avatarUrl} initials={getInitials(farmer.fullName)} size={88} />

            <View style={styles.nameRow}>
              <Text style={[typography.button, styles.name]}>{farmer.fullName}</Text>
              <FontAwesome5 name="check-circle" size={18} color={colors.harvestGreen} solid />
            </View>
            <Text style={styles.verified}>Verified farmer</Text>
            {farmer.locationLine ? (
              <View style={styles.locationRow}>
                <FontAwesome5 name="map-marker-alt" size={12} color={colors.harvestGreen} />
                <Text style={[typography.caption, styles.location]}>{farmer.locationLine}</Text>
              </View>
            ) : null}

            <View style={styles.actionsRow}>
              <Button
                label={strings.farmerProfileMessage}
                icon="comment-dots"
                onPress={handleMessage}
                loading={messaging}
                style={styles.messageButton}
              />
              <Pressable
                onPress={() => setSaved((current) => !current)}
                style={styles.saveButton}
                accessibilityRole="button"
                accessibilityLabel={strings.farmerProfileSaveLabel}
                accessibilityState={{ selected: saved }}
              >
                <FontAwesome5
                  name="heart"
                  solid={saved}
                  size={17}
                  color={saved ? colors.terracotta : colors.textMuted}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.bioSection}>
            <Text style={[typography.body, styles.bio]}>
              {farmer.bio?.trim() || strings.farmerProfileNoBio}
            </Text>
          </View>

          <View style={styles.section}>
            <SectionHeader title={strings.farmerProfileListings} />
            {productsLoading ? null : products.length === 0 ? (
              <EmptyState
                icon="seedling"
                title={strings.farmerProfileNoListings}
                message={strings.farmerProfileNoListingsMessage}
              />
            ) : (
              <View style={styles.productGrid}>
                {productRows.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.productRow}>
                    {row.map((product) => (
                      <ProductCard
                        key={product.id}
                        name={product.name}
                        unit={product.unit}
                        price={product.price}
                        photoUrl={product.photo_urls[0] ?? null}
                        harvestDate={product.harvest_date}
                        onPress={() => open(product)}
                      />
                    ))}
                    {row.length === 1 ? <View style={styles.productSpacer} /> : null}
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <SectionHeader title={strings.farmerProfileReviews} />
            <EmptyState
              icon="star"
              title={strings.farmerProfileNoReviews}
              message={strings.farmerProfileNoReviewsMessage}
            />
          </View>
        </ScrollView>
      )}

      <ProductQuickViewModal
        visible={!!selectedProduct}
        product={selectedProduct}
        onClose={close}
        onAddToCart={cart.addItem}
        onViewFull={viewFull}
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
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingBottom: spacing[40],
  },
  header: {
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    marginTop: spacing[16],
  },
  name: {
    color: colors.textPrimary,
  },
  verified: {
    ...typography.caption,
    color: colors.goldenWheatText,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    marginTop: spacing[4],
  },
  location: {
    color: colors.textPrimary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    marginTop: spacing[16],
    alignSelf: 'stretch',
  },
  messageButton: {
    flex: 1,
  },
  saveButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.skeleton,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioSection: {
    marginTop: spacing[24],
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing[16],
  },
  bio: {
    color: colors.textPrimary,
  },
  section: {
    marginTop: spacing[24],
  },
  productGrid: {
    gap: spacing[12],
  },
  productRow: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  productSpacer: {
    flex: 1,
  },
});
