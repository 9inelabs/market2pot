import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/app/EmptyState';
import { ListingRow } from '@/components/app/ListingRow';
import { QuickAccessItem } from '@/components/app/QuickAccessItem';
import { SectionHeader } from '@/components/app/SectionHeader';
import { StatCard } from '@/components/app/StatCard';
import { Button } from '@/components/ui/Button';
import { useFarmerOrders } from '@/hooks/useFarmerOrders';
import { useFarmerStats } from '@/hooks/useFarmerStats';
import { useMyListings } from '@/hooks/useMyListings';
import { strings } from '@/i18n/strings';
import { formatNaira } from '@/lib/currency';
import { timeOfDayGreeting } from '@/lib/greeting';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export function FarmerHome() {
  const farmerProfile = useAuthStore((state) => state.farmerProfile);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);

  const { stats, refresh: refreshStats } = useFarmerStats(farmerProfile?.id);
  const { orders, loading: ordersLoading, refresh: refreshOrders } = useFarmerOrders(
    farmerProfile?.id,
    4
  );
  const {
    listings,
    loading: listingsLoading,
    refresh: refreshListings,
    setAvailability,
  } = useMyListings();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshStats(), refreshOrders(), refreshListings(), fetchProfile()]);
    setRefreshing(false);
  };

  const listingsPreview = listings.slice(0, 3);

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
              <Text style={[typography.button, styles.name]} numberOfLines={1}>
                {farmerProfile?.farm_name ?? 'your farm'}
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
                onPress={() => router.push('/(app)/(tabs)/profile')}
                style={styles.circleButton}
                accessibilityRole="button"
                accessibilityLabel={strings.farmerHomeQuickSettings}
              >
                <FontAwesome5 name="cog" size={16} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatCard label={strings.farmerHomeStatListings} value={String(stats.activeListings)} />
            <StatCard label={strings.farmerHomeStatPendingOrders} value={String(stats.pendingOrders)} />
            <StatCard label={strings.farmerHomeStatWeekTotal} value={formatNaira(stats.weekTotal)} />
          </View>

          <Button
            label={strings.farmerHomeAddListing}
            icon="plus"
            onPress={() => router.push('/(app)/listing/add')}
            style={styles.addButton}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRow}>
            <QuickAccessItem
              icon="store-alt"
              label={strings.farmerHomeQuickListings}
              onPress={() => router.push('/(app)/(tabs)/listings')}
            />
            <QuickAccessItem
              icon="receipt"
              label={strings.farmerHomeQuickOrders}
              onPress={() => router.push('/(app)/(tabs)/orders')}
            />
            <QuickAccessItem
              icon="comment-dots"
              label={strings.farmerHomeQuickMessages}
              onPress={() => router.push('/(app)/(tabs)/messages')}
            />
            <QuickAccessItem
              icon="user-edit"
              label={strings.farmerHomeQuickEditProfile}
              onPress={() => router.push('/(app)/(tabs)/profile')}
            />
            <QuickAccessItem
              icon="university"
              label={strings.farmerHomeQuickBankDetails}
              onPress={() => router.push('/(app)/(tabs)/profile')}
            />
            <QuickAccessItem
              icon="cog"
              label={strings.farmerHomeQuickSettings}
              onPress={() => router.push('/(app)/(tabs)/profile')}
            />
          </ScrollView>

          <View style={styles.section}>
            <SectionHeader
              title={strings.farmerHomeRecentOrders}
              onSeeAll={() => router.push('/(app)/(tabs)/orders')}
            />
            {ordersLoading ? null : orders.length === 0 ? (
              <EmptyState
                icon="receipt"
                title={strings.farmerHomeNoOrdersTitle}
                message={strings.farmerHomeNoOrdersMessage}
              />
            ) : (
              <View style={styles.ordersList}>
                {orders.map((order) => (
                  <View key={order.id} style={styles.orderRow}>
                    <Text style={[typography.label, styles.orderStatus]}>{order.status}</Text>
                    <Text style={[typography.label, styles.orderTotal]}>
                      {formatNaira(order.total)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <SectionHeader
              title={strings.farmerHomeMyListings}
              onSeeAll={() => router.push('/(app)/(tabs)/listings')}
            />
            {listingsLoading ? null : listings.length === 0 ? (
              <EmptyState
                icon="seedling"
                title={strings.farmerHomeNoListingsTitle}
                message={strings.farmerHomeNoListingsMessage}
              />
            ) : (
              <View style={styles.listingsList}>
                {listingsPreview.map((product) => (
                  <ListingRow
                    key={product.id}
                    name={product.name}
                    unit={product.unit}
                    price={product.price}
                    photoUrl={product.photo_url}
                    isAvailable={product.is_available}
                    onToggleAvailable={(next) => setAvailability(product.id, next)}
                    onPress={() => router.push(`/(app)/listing/${product.id}`)}
                  />
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
    color: colors.textPrimary,
    marginTop: 2,
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
    borderColor: colors.skeleton,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[12],
    marginTop: spacing[20],
  },
  addButton: {
    marginTop: spacing[16],
  },
  quickRow: {
    marginTop: spacing[20],
  },
  section: {
    marginTop: spacing[24],
  },
  ordersList: {
    gap: spacing[8],
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing[12],
  },
  orderStatus: {
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  orderTotal: {
    color: colors.harvestGreen,
  },
  listingsList: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing[12],
  },
});
