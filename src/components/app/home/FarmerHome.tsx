import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CountBadge } from '@/components/app/CountBadge';
import { EmptyState } from '@/components/app/EmptyState';
import { OrderPreviewRow } from '@/components/app/OrderPreviewRow';
import { QuickActionGrid, type QuickAction } from '@/components/app/QuickActionGrid';
import { SectionHeader } from '@/components/app/SectionHeader';
import { StatCard } from '@/components/app/StatCard';
import { HarvestCard } from '@/components/app/home/HarvestCard';
import { LowStockBanner } from '@/components/app/home/LowStockBanner';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useFarmerOrders } from '@/hooks/useFarmerOrders';
import { useUnreadNotificationCount } from '@/hooks/useUnreadNotificationCount';
import { useFarmerStats } from '@/hooks/useFarmerStats';
import { useLowStockProducts } from '@/hooks/useLowStockProducts';
import { useUpcomingHarvest } from '@/hooks/useUpcomingHarvest';
import { strings } from '@/i18n/strings';
import { formatNaira } from '@/lib/currency';
import { timeOfDayGreeting } from '@/lib/greeting';
import { shareFarmerProfile } from '@/lib/shareProfile';
import type { OrderStatus } from '@/lib/orderStatus';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export function FarmerHome() {
  const farmerProfile = useAuthStore((state) => state.farmerProfile);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const unreadNotifications = useUnreadNotificationCount();

  const { stats, refresh: refreshStats } = useFarmerStats(farmerProfile?.id);
  const { orders, loading: ordersLoading, refresh: refreshOrders } = useFarmerOrders(
    farmerProfile?.id,
    { limit: 3 }
  );
  const {
    products: lowStockProducts,
    loading: lowStockLoading,
    refresh: refreshLowStock,
  } = useLowStockProducts(farmerProfile?.id);
  const {
    products: upcomingHarvest,
    loading: harvestLoading,
    refresh: refreshHarvest,
  } = useUpcomingHarvest(farmerProfile?.id);

  const refreshAll = async () => {
    await Promise.all([
      refreshStats(),
      refreshOrders(),
      refreshLowStock(),
      refreshHarvest(),
      fetchProfile(),
    ]);
  };

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };
  // Silent background refresh (no spinner) on focus + a 20s interval;
  // onRefresh above (with the spinner) stays reserved for manual pull.
  useAutoRefresh(refreshAll);

  const quickActions: QuickAction[] = [
    {
      key: 'add-product',
      icon: 'plus',
      label: strings.farmerHubQuickAddProduct,
      onPress: () => router.push('/(app)/listing/add'),
    },
    {
      key: 'listings',
      icon: 'list',
      label: strings.farmerHubQuickListings,
      onPress: () => router.push('/(app)/(tabs)/listings'),
    },
    {
      key: 'orders',
      icon: 'clipboard-list',
      label: strings.farmerHubQuickOrders,
      onPress: () => router.push('/(app)/(tabs)/orders'),
    },
    {
      key: 'insights',
      icon: 'chart-bar',
      label: strings.farmerHubQuickInsights,
      onPress: () => router.push('/(app)/insights'),
    },
    {
      key: 'promotions',
      icon: 'percent',
      label: strings.farmerHubQuickPromotions,
      onPress: () => router.push('/(app)/insights'),
    },
    {
      key: 'reviews',
      icon: 'star',
      label: strings.farmerHubQuickReviews,
      onPress: () => router.push('/(app)/reviews'),
    },
    {
      key: 'business',
      icon: 'store',
      label: strings.farmerHubQuickBusiness,
      onPress: () => router.push('/(app)/business/settings'),
    },
    {
      key: 'share',
      icon: 'share-alt',
      label: strings.farmerHubQuickShare,
      onPress: () => {
        if (farmerProfile) {
          shareFarmerProfile(farmerProfile.id, farmerProfile.farm_name);
        }
      },
    },
    {
      key: 'messages',
      icon: 'comment-dots',
      label: strings.farmerHubQuickMessages,
      onPress: () => router.push('/(app)/(tabs)/messages'),
    },
  ];

  const soonestHarvest = upcomingHarvest[0];

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
                <CountBadge count={unreadNotifications} />
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

          {!lowStockLoading && lowStockProducts.length > 0 ? (
            <LowStockBanner
              count={lowStockProducts.length}
              onPress={() =>
                router.push({ pathname: '/(app)/(tabs)/listings', params: { filter: 'low-stock' } })
              }
            />
          ) : null}

          <View style={styles.statsRow}>
            <StatCard label={strings.farmerHomeStatListings} value={String(stats.activeListings)} />
            <StatCard label={strings.farmerHomeStatPendingOrders} value={String(stats.pendingOrders)} />
            <StatCard label={strings.farmerHomeStatWeekTotal} value={formatNaira(stats.weekTotal)} />
          </View>

          <View style={styles.section}>
            <Text style={[typography.label, styles.sectionTitle]}>{strings.farmerHubSectionManage}</Text>
            <QuickActionGrid actions={quickActions} />
          </View>

          {!harvestLoading && soonestHarvest ? (
            <HarvestCard
              productName={soonestHarvest.name}
              harvestDate={soonestHarvest.harvest_date!}
              preorderCount={soonestHarvest.preorderCount}
              onPress={() => router.push(`/(app)/listing/${soonestHarvest.id}`)}
            />
          ) : null}

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
                  <OrderPreviewRow
                    key={order.id}
                    title={order.householdName}
                    itemSummary={order.itemSummary}
                    createdAt={order.created_at}
                    status={order.status as OrderStatus}
                    onPress={() => router.push(`/(app)/order/${order.id}`)}
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
    marginTop: spacing[16],
  },
  section: {
    marginTop: spacing[24],
  },
  sectionTitle: {
    color: colors.textPrimary,
    marginBottom: spacing[8],
  },
  ordersList: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing[12],
  },
});
