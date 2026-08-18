import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/app/EmptyState';
import { LeafMark } from '@/components/brand/LeafMark';
import { AvatarPicker } from '@/components/ui/AvatarPicker';
import { useNearbyFarmers } from '@/hooks/useNearbyFarmers';
import { strings } from '@/i18n/strings';
import { getInitials } from '@/lib/initials';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function NearbyFarmersScreen() {
  const { farmers, loading, refresh } = useNearbyFarmers();

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
        <Text style={typography.button}>{strings.nearbyFarmersTitle}</Text>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={farmers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.harvestGreen} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="users"
              title={strings.homeNoFarmersTitle}
              message={strings.homeNoFarmersMessage}
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(app)/farmer/${item.id}`)}
            style={styles.row}
            accessibilityRole="button"
            accessibilityLabel={`View ${item.fullName}'s farm profile`}
          >
            <AvatarPicker uri={item.avatarUrl} initials={getInitials(item.fullName)} size={52} />
            <View style={styles.rowInfo}>
              <View style={styles.rowNameLine}>
                <Text style={[typography.label, styles.rowName]} numberOfLines={1}>
                  {item.fullName}
                </Text>
                <LeafMark width={11} height={12} />
              </View>
              <Text style={styles.rowVerified}>Verified farmer</Text>
              {item.locationLine ? (
                <Text style={[typography.caption, styles.rowLocation]} numberOfLines={1}>
                  {item.locationLine}
                </Text>
              ) : null}
            </View>
            <FontAwesome5 name="chevron-right" size={14} color={colors.textMuted} />
          </Pressable>
        )}
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
  listContent: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingBottom: spacing[32],
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    paddingVertical: spacing[12],
  },
  rowInfo: {
    flex: 1,
  },
  rowNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowName: {
    color: colors.textPrimary,
  },
  rowVerified: {
    ...typography.caption,
    fontSize: 11,
    color: colors.goldenWheatText,
    marginTop: 2,
  },
  rowLocation: {
    color: colors.textMuted,
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.skeleton,
  },
});
