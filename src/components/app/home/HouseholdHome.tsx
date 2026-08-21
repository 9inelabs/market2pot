import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CountBadge } from '@/components/app/CountBadge';
import { EmptyState } from '@/components/app/EmptyState';
import { FarmerCard } from '@/components/app/FarmerCard';
import { HomeProductCard } from '@/components/app/home/HomeProductCard';
import { ProductQuickViewModal } from '@/components/app/ProductQuickViewModal';
import { SectionHeader } from '@/components/app/SectionHeader';
import { AvatarPicker } from '@/components/ui/AvatarPicker';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useCategories } from '@/hooks/useCategories';
import { shortLocationLabel, useDeliveryLocation } from '@/hooks/useDeliveryLocation';
import { useFreshProducts } from '@/hooks/useFreshProducts';
import { useNearbyFarmers } from '@/hooks/useNearbyFarmers';
import { useProductQuickView } from '@/hooks/useProductQuickView';
import { useUnreadNotificationCount } from '@/hooks/useUnreadNotificationCount';
import { strings } from '@/i18n/strings';
import { timeOfDayGreeting } from '@/lib/greeting';
import { getInitials } from '@/lib/initials';
import { toTitleCase } from '@/lib/titleCase';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, geometry, spacing, withOpacity } from '@/theme/tokens';
import { bodyFont } from '@/theme/typography';

// Fresh Picks is a hard 3-up grid per the reference design — not the shared
// ProductGrid's default 2, and not something that should quietly fall back.
const GRID_COLUMNS = 3;

export function HouseholdHome() {
  const profile = useAuthStore((state) => state.profile);
  const farmerProfile = useAuthStore((state) => state.farmerProfile);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const { cart, selectedProduct, open, close, viewFull } = useProductQuickView();
  const itemCount = cart.itemCount;
  const unreadNotifications = useUnreadNotificationCount();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { location, refresh: refreshLocation } = useDeliveryLocation();
  const { categories } = useCategories();
  const { farmers, loading: farmersLoading, refresh: refreshFarmers } = useNearbyFarmers();
  const {
    products,
    loading: productsLoading,
    refresh: refreshProducts,
  } = useFreshProducts({ category: selectedCategory });

  const refreshAll = async () => {
    await Promise.all([refreshLocation(), refreshFarmers(), refreshProducts(), fetchProfile()]);
  };

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };
  // Silent background refresh on focus + a 20s interval. The hooks it drives
  // no longer flip `loading` back to true on a refetch, so this swaps data
  // underneath the rendered lists instead of unmounting and remounting them
  // — that unmount/remount was the visible blink. onRefresh above (with the
  // spinner) stays reserved for a deliberate manual pull.
  useAutoRefresh(refreshAll);

  const productRows = useMemo(() => {
    const rows: (typeof products)[] = [];
    for (let i = 0; i < products.length; i += GRID_COLUMNS) {
      rows.push(products.slice(i, i + GRID_COLUMNS));
    }
    return rows;
  }, [products]);

  const locationText = shortLocationLabel(location);
  const displayName = toTitleCase(profile?.full_name) || 'there';

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.harvestGreen}
          />
        }
      >
        {/* ---- Green header ------------------------------------------- */}
        {/* Bleeds to the physical top of the screen (the status bar sits on
            the green), so the safe-area inset is applied inside it rather
            than around the whole screen. */}
        <View style={styles.header}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerInner}>
              <View style={styles.headerTopRow}>
                <AvatarPicker uri={profile?.avatar_url ?? null} initials={getInitials(profile?.full_name)} size={36} />

                <View style={styles.greetingBlock}>
                  <Text style={styles.greeting} numberOfLines={1}>
                    {timeOfDayGreeting()}
                  </Text>
                  <Text style={styles.name} numberOfLines={1}>
                    {displayName}
                  </Text>
                </View>

                <Pressable
                  onPress={() => router.push('/(app)/notifications')}
                  style={styles.circleButton}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={
                    unreadNotifications > 0
                      ? `${strings.homeNotificationsLabel}, ${unreadNotifications} unread`
                      : strings.homeNotificationsLabel
                  }
                >
                  <FontAwesome5 name="bell" size={15} color={colors.textPrimary} />
                  <CountBadge count={unreadNotifications} />
                </Pressable>

                <Pressable
                  onPress={() => router.push('/(app)/cart')}
                  style={styles.circleButton}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={
                    itemCount > 0
                      ? `${strings.homeCartLabel}, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`
                      : `${strings.homeCartLabel}, empty`
                  }
                >
                  <FontAwesome5 name="shopping-cart" size={15} color={colors.textPrimary} />
                  <CountBadge count={itemCount} color={colors.goldenWheat} />
                </Pressable>
              </View>

              <Pressable
                onPress={() => router.push('/(app)/change-location')}
                style={styles.locationPill}
                hitSlop={{ top: 8, bottom: 8 }}
                accessibilityRole="button"
                accessibilityHint="Changes the address your produce is delivered to"
                accessibilityLabel={`${strings.homeLocationLabel}: ${locationText ?? 'not set'}`}
              >
                <FontAwesome5 name="map-marker-alt" size={12} color={colors.surface} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {locationText ?? 'Set your location'}
                </Text>
                <FontAwesome5 name="chevron-down" size={10} color={colors.surface} />
              </Pressable>

              <Pressable
                onPress={() => router.push('/(app)/(tabs)/search')}
                style={styles.searchBar}
                accessibilityRole="search"
                accessibilityLabel={strings.homeSearchPlaceholder}
              >
                <FontAwesome5 name="search" size={14} color={colors.textMuted} />
                <Text style={styles.searchPlaceholder}>{strings.homeSearchPlaceholder}</Text>
              </Pressable>

              {!farmerProfile ? (
                <Pressable
                  onPress={() => router.push('/(app)/register-farmer/farm-details')}
                  style={styles.banner}
                  accessibilityRole="button"
                  accessibilityLabel={`${strings.homeRegisterBannerTitle} ${strings.homeRegisterBannerSubtitle}`}
                >
                  <View style={styles.bannerIconWrap}>
                    <FontAwesome5 name="seedling" size={14} color={colors.surface} />
                  </View>
                  <View style={styles.bannerTextWrap}>
                    <Text style={styles.bannerTitle}>{strings.homeRegisterBannerTitle}</Text>
                    <Text style={styles.bannerSubtitle}>{strings.homeRegisterBannerSubtitle}</Text>
                  </View>
                  <FontAwesome5 name="chevron-right" size={13} color={colors.surface} />
                </Pressable>
              ) : null}
            </View>
          </SafeAreaView>
        </View>

        {/* ---- Body ---------------------------------------------------- */}
        <View style={styles.body}>
          <View style={styles.sectionHeaderWrap}>
            <SectionHeader
              title={strings.homeFarmersNearYou}
              onSeeAll={() => router.push('/(app)/nearby-farmers')}
            />
          </View>

          {farmersLoading ? null : farmers.length === 0 ? (
            <EmptyState
              icon="users"
              title={strings.homeNoFarmersTitle}
              message={strings.homeNoFarmersMessage}
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.farmersRow}
            >
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

          {categories.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {categories.map((category) => {
                const selected = selectedCategory === category.name;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => setSelectedCategory(selected ? null : category.name)}
                    style={[styles.chip, selected && styles.chipSelected]}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${category.name}`}
                    accessibilityHint={selected ? 'Tap again to show all produce' : undefined}
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <View style={styles.sectionHeaderWrap}>
            <SectionHeader
              title={strings.homeFreshPicks}
              onSeeAll={() => router.push('/(app)/categories')}
            />
          </View>

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
                    <HomeProductCard
                      key={product.id}
                      name={product.name}
                      unit={product.unit}
                      price={product.price}
                      photoUrl={product.photo_urls[0] ?? null}
                      onPress={() => open(product)}
                    />
                  ))}
                  {/* Keeps a short final row left-aligned at the same card
                      width instead of stretching its cards across the row. */}
                  {Array.from({ length: GRID_COLUMNS - row.length }).map((_, index) => (
                    <View key={`spacer-${index}`} style={styles.productSpacer} />
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <ProductQuickViewModal
        visible={!!selectedProduct}
        product={selectedProduct}
        onClose={close}
        onAddToCart={cart.addItem}
        onViewFull={viewFull}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  scrollContent: {
    paddingBottom: spacing[32],
  },

  // ---- Header ----
  header: {
    backgroundColor: colors.harvestGreen,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerInner: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[12],
    paddingBottom: spacing[16],
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  greetingBlock: {
    flex: 1,
    marginLeft: spacing[4],
  },
  greeting: {
    ...bodyFont('regular'),
    fontSize: 13,
    color: withOpacity(colors.surface, 0.85),
  },
  name: {
    ...bodyFont('bold'),
    // The loudest thing on the screen, per the design.
    fontSize: 20,
    color: colors.surface,
    marginTop: 1,
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[8],
    marginTop: spacing[12],
    height: 32,
    paddingHorizontal: spacing[12],
    borderRadius: 16,
    // Semi-transparent white over the green, not a solid fill.
    backgroundColor: withOpacity(colors.surface, 0.18),
  },
  locationText: {
    ...bodyFont('semibold'),
    fontSize: 13,
    color: colors.surface,
    maxWidth: 200,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    height: 44,
    borderRadius: 22,
    paddingHorizontal: spacing[16],
    backgroundColor: colors.surface,
    marginTop: spacing[16],
  },
  searchPlaceholder: {
    ...bodyFont('regular'),
    fontSize: 15,
    color: colors.textMuted,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    marginTop: spacing[16],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
    borderRadius: 14,
    backgroundColor: colors.deepSoil,
  },
  bannerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: withOpacity(colors.surface, 0.35),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    ...bodyFont('bold'),
    fontSize: 13,
    color: colors.surface,
  },
  bannerSubtitle: {
    ...bodyFont('regular'),
    fontSize: 10,
    lineHeight: 13,
    color: withOpacity(colors.surface, 0.6),
    marginTop: 2,
  },

  // ---- Body ----
  body: {
    // Deliberately tight — the header block and the first section are meant
    // to read as one dense unit, not two separated ones.
    paddingTop: 5,
  },
  sectionHeaderWrap: {
    paddingHorizontal: geometry.screenPaddingButtons,
  },
  farmersRow: {
    paddingHorizontal: geometry.screenPaddingButtons,
    gap: 15,
    paddingBottom: spacing[4],
  },
  chipsRow: {
    paddingHorizontal: geometry.screenPaddingButtons,
    gap: spacing[8],
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
  },
  chip: {
    height: 32,
    paddingHorizontal: spacing[16],
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: withOpacity(colors.deepSoil, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.harvestGreen,
    borderColor: colors.harvestGreen,
  },
  chipLabel: {
    ...bodyFont('medium'),
    fontSize: 12,
    color: colors.textPrimary,
  },
  chipLabelSelected: {
    color: colors.surface,
  },
  productGrid: {
    paddingHorizontal: geometry.screenPaddingButtons,
    gap: spacing[8],
  },
  productRow: {
    flexDirection: 'row',
    gap: 11,
  },
  productSpacer: {
    flex: 1,
  },
});
