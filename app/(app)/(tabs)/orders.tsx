import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/app/EmptyState';
import { OrderPreviewRow } from '@/components/app/OrderPreviewRow';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useFarmerOrders } from '@/hooks/useFarmerOrders';
import { useHouseholdOrders, type HouseholdOrderListItem } from '@/hooks/useHouseholdOrders';
import { strings } from '@/i18n/strings';
import { supabase } from '@/lib/supabase';
import { isAtDeliveryConfirmationStage, type FulfillmentType, type OrderStatus } from '@/lib/orderStatus';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type StatusFilterKey = 'all' | OrderStatus;
type DateFilterKey = 'all' | 'today' | 'week' | 'month';

const STATUS_FILTERS: { key: StatusFilterKey; label: string }[] = [
  { key: 'all', label: strings.ordersFilterAll },
  { key: 'pending', label: strings.ordersFilterPending },
  { key: 'preparing', label: strings.ordersFilterPreparing },
  { key: 'out_for_delivery', label: strings.ordersFilterReadyOut },
  { key: 'delivered', label: strings.ordersFilterDelivered },
];

const DATE_FILTERS: { key: DateFilterKey; label: string }[] = [
  { key: 'all', label: strings.ordersDateFilterAll },
  { key: 'today', label: strings.ordersDateFilterToday },
  { key: 'week', label: strings.ordersDateFilterWeek },
  { key: 'month', label: strings.ordersDateFilterMonth },
];

function dateFilterCutoff(key: DateFilterKey): Date | null {
  if (key === 'all') return null;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  if (key === 'week') cutoff.setDate(cutoff.getDate() - cutoff.getDay());
  if (key === 'month') cutoff.setDate(1);
  return cutoff;
}

function ChipRow<K extends string>({
  items,
  active,
  onChange,
}: {
  items: { key: K; label: string }[];
  active: K;
  onChange: (key: K) => void;
}) {
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterList}
      data={items}
      keyExtractor={(item) => item.key}
      contentContainerStyle={styles.filterRow}
      renderItem={({ item }) => {
        const isActive = item.key === active;
        return (
          <Pressable
            onPress={() => onChange(item.key)}
            style={[styles.filterChip, isActive && styles.filterChipActive]}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{item.label}</Text>
          </Pressable>
        );
      }}
    />
  );
}

function FarmerOrdersList() {
  const farmerProfile = useAuthStore((state) => state.farmerProfile);
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterKey>('all');
  const { orders, loading, refresh } = useFarmerOrders(
    farmerProfile?.id,
    statusFilter === 'all' ? undefined : { status: statusFilter as OrderStatus }
  );
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };
  useAutoRefresh(refresh);

  const cutoff = dateFilterCutoff(dateFilter);
  const visibleOrders = cutoff ? orders.filter((o) => new Date(o.created_at) >= cutoff) : orders;

  return (
    <>
      <ChipRow items={STATUS_FILTERS} active={statusFilter} onChange={setStatusFilter} />
      <ChipRow items={DATE_FILTERS} active={dateFilter} onChange={setDateFilter} />
      <FlatList
        data={visibleOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.harvestGreen} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState icon="receipt" title={strings.ordersEmptyTitle} message={strings.ordersEmptyMessage} />
          )
        }
        renderItem={({ item }) => (
          <OrderPreviewRow
            title={item.householdName}
            itemSummary={item.itemSummary}
            createdAt={item.created_at}
            status={item.status as OrderStatus}
            onPress={() => router.push(`/(app)/order/${item.id}`)}
          />
        )}
      />
    </>
  );
}

function HouseholdOrdersList() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterKey>('all');
  const { orders, loading, refresh } = useHouseholdOrders(
    userId,
    statusFilter === 'all' ? undefined : { status: statusFilter as OrderStatus }
  );
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState<HouseholdOrderListItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };
  useAutoRefresh(refresh);

  const cutoff = dateFilterCutoff(dateFilter);
  const visibleOrders = useMemo(
    () => (cutoff ? orders.filter((o) => new Date(o.created_at) >= cutoff) : orders),
    [orders, cutoff]
  );

  const handleConfirmReceived = async () => {
    if (!confirmingOrder) return;
    setSubmitting(true);
    await supabase.functions.invoke('confirm-order-received', { body: { order_id: confirmingOrder.id } });
    setSubmitting(false);
    setConfirmingOrder(null);
    await refresh();
  };

  return (
    <>
      <ChipRow items={STATUS_FILTERS} active={statusFilter} onChange={setStatusFilter} />
      <ChipRow items={DATE_FILTERS} active={dateFilter} onChange={setDateFilter} />
      <FlatList
        data={visibleOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.harvestGreen} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="receipt"
              title={strings.householdOrdersEmptyTitle}
              message={strings.householdOrdersEmptyMessage}
            />
          )
        }
        renderItem={({ item }) => {
          // Once household_confirmed_at is set (or the order is delivered/
          // cancelled), it's locked for reference only — no action shown,
          // matching Track Order's own gating so there's exactly one place
          // this decision is made.
          const canMarkReceived =
            !item.household_confirmed_at &&
            isAtDeliveryConfirmationStage(
              item.status as OrderStatus,
              item.fulfillment_type as FulfillmentType | null
            );
          return (
            <View>
              <OrderPreviewRow
                title={item.farmName}
                itemSummary={item.itemSummary}
                createdAt={item.created_at}
                status={item.status as OrderStatus}
                onPress={() => router.push(`/(app)/order/${item.id}`)}
              />
              {canMarkReceived ? (
                <Pressable
                  onPress={() => setConfirmingOrder(item)}
                  style={styles.markReceivedButton}
                  accessibilityRole="button"
                  accessibilityLabel={`${strings.trackOrderProductReceived} — ${item.farmName}`}
                >
                  <Text style={styles.markReceivedText}>{strings.trackOrderProductReceived}</Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />

      <ConfirmDialog
        visible={!!confirmingOrder}
        icon="check-circle"
        title={strings.trackOrderReceivedConfirmTitle}
        message={strings.trackOrderReceivedConfirmMessage}
        confirmLabel={strings.trackOrderReceivedConfirmAction}
        cancelLabel={strings.settingsCancelAction}
        onConfirm={handleConfirmReceived}
        onCancel={() => setConfirmingOrder(null)}
      />
    </>
  );
}

export default function OrdersScreen() {
  const activeView = useAuthStore((state) => state.profile?.active_view);
  const hasFarmerProfile = useAuthStore((state) => !!state.farmerProfile);
  const isFarmerView = activeView === 'farmer' && hasFarmerProfile;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Text style={[typography.button, styles.title]}>{strings.ordersTitle}</Text>
      {isFarmerView ? <FarmerOrdersList /> : <HouseholdOrdersList />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  title: {
    color: colors.textPrimary,
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[12],
    paddingBottom: spacing[12],
  },
  filterList: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filterRow: {
    alignItems: 'center',
    paddingHorizontal: geometry.screenPaddingButtons,
    gap: spacing[8],
    paddingBottom: spacing[12],
  },
  filterChip: {
    height: 32,
    paddingHorizontal: spacing[12],
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.skeleton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.harvestGreen,
    borderColor: colors.harvestGreen,
  },
  filterChipText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  listContent: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingBottom: spacing[32],
    flexGrow: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.skeleton,
  },
  markReceivedButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing[12],
    marginTop: -spacing[4],
    minHeight: 32,
    paddingHorizontal: spacing[12],
    borderRadius: 14,
    backgroundColor: colors.harvestGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markReceivedText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
  },
});
