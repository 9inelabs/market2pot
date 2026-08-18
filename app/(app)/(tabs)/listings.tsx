import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/app/EmptyState';
import { ListingRow } from '@/components/app/ListingRow';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useMyListings } from '@/hooks/useMyListings';
import { strings } from '@/i18n/strings';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function ListingsScreen() {
  const { listings, loading, refresh, setAvailability, remove } = useMyListings();
  const [refreshing, setRefreshing] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={typography.button}>{strings.listingsTitle}</Text>
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

      <FlatList
        data={listings}
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
        renderItem={({ item }) => (
          <ListingRow
            name={item.name}
            unit={item.unit}
            price={item.price}
            photoUrl={item.photo_url}
            isAvailable={item.is_available}
            onToggleAvailable={(next) => setAvailability(item.id, next)}
            onPress={() => router.push(`/(app)/listing/${item.id}`)}
            onDelete={() => setPendingDeleteId(item.id)}
          />
        )}
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.harvestGreen,
    alignItems: 'center',
    justifyContent: 'center',
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
