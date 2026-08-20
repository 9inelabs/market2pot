import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BulkPriceModal } from '@/components/app/BulkPriceModal';
import { EmptyState } from '@/components/app/EmptyState';
import { ListingRow } from '@/components/app/ListingRow';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useActivePromotions } from '@/hooks/useActivePromotions';
import { useMyListings } from '@/hooks/useMyListings';
import { strings } from '@/i18n/strings';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function ListingsScreen() {
  const farmerProfileId = useAuthStore((state) => state.farmerProfile?.id);
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const { listings, loading, refresh, setAvailability, remove } = useMyListings();
  const { byProductId: promotionsByProductId } = useActivePromotions(farmerProfileId);

  const [refreshing, setRefreshing] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkPriceModalVisible, setBulkPriceModalVisible] = useState(false);

  const visibleListings = useMemo(() => {
    if (filter !== 'low-stock') return listings;
    return listings.filter(
      (item) => item.low_stock_threshold != null && item.quantity_available <= item.low_stock_threshold
    );
  }, [listings, filter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const pendingDeleteName = listings.find((l) => l.id === pendingDeleteId)?.name;

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    await remove(id);
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((i) => i !== id) : [...current, id]
    );
  };

  const applyBulkPrice = async (price: number) => {
    setBulkPriceModalVisible(false);
    await supabase.from('products').update({ price }).in('id', selectedIds);
    exitSelectMode();
    await refresh();
  };

  const applyBulkToggleAvailability = async () => {
    const selected = listings.filter((item) => selectedIds.includes(item.id));
    const allAvailable = selected.every((item) => item.is_available);
    await Promise.all(selected.map((item) => setAvailability(item.id, !allAvailable)));
    exitSelectMode();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={typography.button}>{strings.listingsTitle}</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={selectMode ? strings.listingsSelectCancel : strings.listingsSelect}
          >
            <Text style={styles.selectLabel}>
              {selectMode ? strings.listingsSelectCancel : strings.listingsSelect}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(app)/listing/add')}
            style={styles.addButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={strings.listingsAddLabel}
          >
            <FontAwesome5 name="plus" size={16} color={colors.surface} />
          </Pressable>
        </View>
      </View>

      {selectMode && selectedIds.length > 0 ? (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkBarCount}>{strings.listingsSelectedCount(selectedIds.length)}</Text>
          <View style={styles.bulkBarActions}>
            <Pressable
              onPress={() => setBulkPriceModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={strings.listingsBulkUpdatePrice}
              hitSlop={8}
            >
              <Text style={styles.bulkBarActionText}>{strings.listingsBulkUpdatePrice}</Text>
            </Pressable>
            <Pressable
              onPress={applyBulkToggleAvailability}
              accessibilityRole="button"
              accessibilityLabel={strings.listingsBulkToggleAvailability}
              hitSlop={8}
            >
              <Text style={styles.bulkBarActionText}>{strings.listingsBulkToggleAvailability}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <FlatList
        data={visibleListings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.harvestGreen} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="seedling"
              title={strings.listingsEmptyTitle}
              message={strings.listingsEmptyMessage}
            />
          )
        }
        renderItem={({ item }) => {
          const isLowStock =
            item.low_stock_threshold != null && item.quantity_available <= item.low_stock_threshold;
          const promotionPercent = promotionsByProductId[item.id];
          return (
            <ListingRow
              name={item.name}
              unit={item.unit}
              price={item.price}
              photoUrl={item.photo_urls[0] ?? null}
              photoCount={item.photo_urls.length}
              isAvailable={item.is_available}
              onToggleAvailable={(next) => setAvailability(item.id, next)}
              onPress={() => router.push(`/(app)/listing/${item.id}`)}
              onDelete={selectMode ? undefined : () => setPendingDeleteId(item.id)}
              lowStockLabel={isLowStock ? strings.listingsLowStockLabel(item.quantity_available) : null}
              promotionLabel={promotionPercent ? strings.listingsPromotionLabel(promotionPercent) : null}
              selectable={selectMode}
              selected={selectedIds.includes(item.id)}
              onToggleSelect={() => toggleSelect(item.id)}
            />
          );
        }}
      />

      <ConfirmDialog
        visible={!!pendingDeleteId}
        icon="trash-alt"
        destructive
        title={strings.listingsDeleteTitle}
        message={pendingDeleteName ? `"${pendingDeleteName}" — ${strings.listingsDeleteMessage}` : strings.listingsDeleteMessage}
        confirmLabel={strings.listingsDeleteConfirm}
        cancelLabel={strings.listingsDeleteCancel}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

      <BulkPriceModal
        visible={bulkPriceModalVisible}
        onCancel={() => setBulkPriceModalVisible(false)}
        onApply={applyBulkPrice}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[12],
    paddingBottom: spacing[8],
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[16],
  },
  selectLabel: {
    ...typography.label,
    color: colors.harvestGreen,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.harvestGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.deepSoil,
    borderRadius: 12,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    marginHorizontal: geometry.screenPaddingButtons,
    marginBottom: spacing[8],
    minHeight: 44,
  },
  bulkBarCount: {
    ...typography.caption,
    color: colors.warmCream,
  },
  bulkBarActions: {
    flexDirection: 'row',
    gap: spacing[16],
  },
  bulkBarActionText: {
    ...typography.caption,
    color: colors.warmCream,
    fontWeight: '600',
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
});
