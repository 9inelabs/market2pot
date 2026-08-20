import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeliveryZoneFormModal } from '@/components/app/DeliveryZoneFormModal';
import { EmptyState } from '@/components/app/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDeliveryZones, type DeliveryZone } from '@/hooks/useDeliveryZones';
import { strings } from '@/i18n/strings';
import { formatNaira } from '@/lib/currency';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function DeliveryZonesScreen() {
  const farmerProfile = useAuthStore((state) => state.farmerProfile);
  const { zones, loading, addZone, updateZone, removeZone } = useDeliveryZones(farmerProfile?.id);
  const [formVisible, setFormVisible] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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
        <Text style={typography.button}>{strings.deliveryZonesTitle}</Text>
        <Pressable
          onPress={() => {
            setEditingZone(null);
            setFormVisible(true);
          }}
          hitSlop={8}
          style={styles.addButton}
          accessibilityRole="button"
          accessibilityLabel={strings.deliveryZonesAdd}
        >
          <FontAwesome5 name="plus" size={16} color={colors.surface} />
        </Pressable>
      </View>

      <FlatList
        data={zones}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="map-marked-alt"
              title={strings.deliveryZonesEmptyTitle}
              message={strings.deliveryZonesEmptyMessage}
            />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={[typography.label, styles.zoneName]}>{item.zone_name}</Text>
              <Text style={[typography.caption, styles.zoneFee]}>{formatNaira(item.fee)}</Text>
            </View>
            <Pressable
              onPress={() => {
                setEditingZone(item);
                setFormVisible(true);
              }}
              hitSlop={10}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.zone_name}`}
            >
              <FontAwesome5 name="pencil-alt" size={14} color={colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => setPendingDeleteId(item.id)}
              hitSlop={10}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.zone_name}`}
            >
              <FontAwesome5 name="trash-alt" size={14} color={colors.danger} />
            </Pressable>
          </View>
        )}
      />

      <DeliveryZoneFormModal
        visible={formVisible}
        editingZone={editingZone}
        onCancel={() => setFormVisible(false)}
        onSubmit={async (zoneName, fee) => {
          const error = editingZone
            ? await updateZone(editingZone.id, zoneName, fee)
            : await addZone(zoneName, fee);
          if (!error) setFormVisible(false);
          return error;
        }}
      />

      <ConfirmDialog
        visible={!!pendingDeleteId}
        icon="trash-alt"
        destructive
        title={strings.deliveryZonesDeleteTitle}
        message={strings.deliveryZonesDeleteMessage}
        confirmLabel={strings.listingsDeleteConfirm}
        cancelLabel={strings.listingsDeleteCancel}
        onConfirm={async () => {
          if (pendingDeleteId) await removeZone(pendingDeleteId);
          setPendingDeleteId(null);
        }}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[12],
    gap: spacing[8],
  },
  rowInfo: {
    flex: 1,
  },
  zoneName: {
    color: colors.textPrimary,
  },
  zoneFee: {
    color: colors.textMuted,
    marginTop: 2,
  },
  iconButton: {
    padding: spacing[4],
  },
});
