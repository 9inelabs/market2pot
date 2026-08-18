import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/app/EmptyState';
import { FarmerCard } from '@/components/app/FarmerCard';
import { ProductCard } from '@/components/app/ProductCard';
import { SectionHeader } from '@/components/app/SectionHeader';
import { shortLocationLabel, useDeliveryLocation } from '@/hooks/useDeliveryLocation';
import { useFreshProducts, useProductCategories } from '@/hooks/useFreshProducts';
import { useNearbyFarmers } from '@/hooks/useNearbyFarmers';
import { strings } from '@/i18n/strings';
import { timeOfDayGreeting } from '@/lib/greeting';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { colors, geometry, spacing, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export function HouseholdHome() {
  const profile = useAuthStore((state) => state.profile);
  const farmerProfile = useAuthStore((state) => state.farmerProfile);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const itemCount = useCartStore((state) => state.itemCount);
  const addItem = useCartStore((state) => state.addItem);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { location, loading: locationLoading, refresh: refreshLocation } = useDeliveryLocation();
  const { categories } = useProductCategories();
  const {
    farmers,
    loading: farmersLoading,
    refresh: refreshFarmers,
  } = useNearbyFarmers();
  const {
    products,
    loading: productsLoading,
    refresh: refreshProducts,
  } = useFreshProducts({ category: selectedCategory });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshLocation(), refreshFarmers(), refreshProducts(), fetchProfile()]);
    setRefreshing(false);
  };

  const productRows = useMemo(() => {
    const rows: (typeof products)[] = [];
    for (let i = 0; i < products.length; i += 2) {
      rows.push(products.slice(i, i + 2));
    }
    return rows;
  }, [products]);

  const locationText = shortLocationLabel(location);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.harvestGreen} />
        }
      >
        <Animated.View entering={FadeIn.duration(220).easing(Easing.out(Easing.cubic))}>
          <View style={styles.headerRow}>
            <View style={styles.greetingBlock}>
              <Text style={[typography.caption, styles.greeting]}>{timeOfDayGreeting()}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {profile?.full_name ?? 'there'}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                onPress={() => router.push('/(app)/notifications')}
                style={styles.circleButton}
                accessibilityRole="button"
                accessibilityLabel={strings.homeNotificationsLabel}
              >
                <FontAwesome5 name="bell" size={16} color={colors.textPrimary} />
              </Pressable>
              <Pressable
                onPress={() => router.push('/(app)/cart')}
                style={styles.circleButton}
                accessibilityRole="button"
                accessibilityLabel={`${strings.homeCartLabel}, ${itemCount} items`}
              >
                <FontAwesome5 name="shopping-cart" size={16} color={colors.textPrimary} />
                {itemCount > 0 ? (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{itemCount}</Text>
                  </View>
                ) : null}
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/(app)/change-location')}
            style={styles.locationPill}
            accessibilityRole="button"
            accessibilityLabel={`${strings.homeLocationLabel}: ${locationText ?? 'not set'}`}
          >
            <FontAwesome5 name="map-marker-alt" size={13} color={colors.harvestGreen} />
            <Text style={styles.locationText} numberOfLines={1}>
              {locationLoading ? '…' : (locationText ?? 'Set location')}
            </Text>
            <FontAwesome5 name="chevron-down" size={11} color={colors.harvestGreen} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/(app)/(tabs)/search')}
            style={styles.searchBar}
            accessibilityRole="button"
            accessibilityLabel={strings.homeSearchPlaceholder}
          >
            <FontAwesome5 name="search" size={15} color={colors.textMuted} />
            <Text style={styles.searchPlaceholder}>{strings.homeSearchPlaceholder}</Text>
          </Pressable>

          {!farmerProfile ? (
            <Pressable
              onPress={() => router.push('/(app)/register-farmer/farm-details')}
              style={styles.banner}
              accessibilityRole="button"
              accessibilityLabel={strings.homeRegisterBannerTitle}
            >
              <View style={styles.bannerIconWrap}>
                <FontAwesome5 name="seedling" size={18} color={colors.surface} />
              </View>
              <View style={styles.bannerTextWrap}>
                <Text style={[typography.label, styles.bannerTitle]}>
                  {strings.homeRegisterBannerTitle}
                </Text>
                <Text style={[typography.caption, styles.bannerSubtitle]}>
                  {strings.homeRegisterBannerSubtitle}
                </Text>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color={colors.terracotta} />
            </Pressable>
          ) : null}

          <View style={styles.section}>
            <SectionHeader
              title={strings.homeFarmersNearYou}
              onSeeAll={() => router.push('/(app)/nearby-farmers')}
            />
            {farmersLoading ? null : farmers.length === 0 ? (
              <EmptyState
                icon="users"
                title={strings.homeNoFarmersTitle}
                message={strings.homeNoFarmersMessage}
              />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.farmersRow}>
                {farmers.map((farmer) => (
                  <FarmerCard
                    key={farmer.id}
                    name={farmer.fullName}
                    avatarUrl={farmer.avatarUrl}
                    isVerified={farmer.isVerified}
                    locationLine={farmer.locationLine}
                    onPress={() => router.push(`/(app)/farmer/${farmer.id}`)}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          {categories.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {categories.map((category) => {
                const selected = selectedCategory === category;
                return (
                  <Pressable
                    key={category}
                    onPress={() => setSelectedCategory(selected ? null : category)}
                    style={[styles.chip, selected && styles.chipSelected]}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${category}`}
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <View style={styles.section}>
            <SectionHeader
              title={strings.homeFreshPicks}
              onSeeAll={() => router.push('/(app)/categories')}
            />
            {productsLoading ? null : products.length === 0 ? (
              <EmptyState
                icon="seedling"
                title={strings.homeNoProductsTitle}
                message={strings.homeNoProductsMessage}
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
                        photoUrl={product.photo_url}
                        harvestDate={product.harvest_date}
                        onAddPress={addItem}
                      />
                    ))}
                    {row.length === 1 ? <View style={styles.productSpacer} /> : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  scrollContent: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[12],
    paddingBottom: spacing[32],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  greetingBlock: {
    flex: 1,
  },
  greeting: {
    color: colors.textMuted,
  },
  name: {
    ...typography.stepHeadline,
    fontSize: 20,
    color: colors.textPrimary,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing[8],
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: withOpacity(colors.deepSoil, 0.15),
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.surface,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[8],
    marginTop: 10,
    height: 36,
    paddingHorizontal: spacing[12],
    borderRadius: 18,
    backgroundColor: withOpacity(colors.harvestGreen, 0.12),
  },
  locationText: {
    ...typography.label,
    color: colors.harvestGreen,
    maxWidth: 220,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    // Measured off the mockup — noticeably shorter than the standard
    // geometry.textInput.height (70) used for form fields elsewhere; this
    // is a compact, search-specific bar, not a text-entry field.
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: withOpacity(colors.deepSoil, 0.12),
    paddingHorizontal: spacing[16],
    backgroundColor: colors.surface,
    marginTop: spacing[16],
  },
  searchPlaceholder: {
    ...typography.body,
    color: colors.textMuted,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    marginTop: spacing[16],
    padding: spacing[16],
    borderRadius: 18,
    backgroundColor: withOpacity(colors.terracotta, 0.14),
  },
  bannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    color: colors.textPrimary,
  },
  bannerSubtitle: {
    color: colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginTop: spacing[20],
  },
  farmersRow: {
    marginHorizontal: -geometry.screenPaddingButtons,
    paddingHorizontal: geometry.screenPaddingButtons,
  },
  chipsRow: {
    marginTop: spacing[16],
    marginHorizontal: -geometry.screenPaddingButtons,
    paddingHorizontal: geometry.screenPaddingButtons,
  },
  chip: {
    height: 36,
    paddingHorizontal: spacing[16],
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[8],
  },
  chipSelected: {
    backgroundColor: colors.harvestGreen,
  },
  chipLabel: {
    ...typography.label,
    color: colors.textPrimary,
  },
  chipLabelSelected: {
    color: colors.surface,
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
