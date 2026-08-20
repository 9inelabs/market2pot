import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/app/EmptyState';
import { strings } from '@/i18n/strings';
import { useReviews } from '@/hooks/useReviews';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function ReviewsScreen() {
  const farmerProfile = useAuthStore((state) => state.farmerProfile);
  const { reviews, loading } = useReviews(farmerProfile?.id);

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
        <Text style={typography.button}>{strings.reviewsTitle}</Text>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="star"
              title={strings.reviewsEmptyTitle}
              message={strings.reviewsEmptyMessage}
            />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.stars}>{'★'.repeat(item.rating)}</Text>
              <Text style={[typography.label, styles.reviewerName]}>
                {item.reviewerName ?? 'Anonymous'}
              </Text>
            </View>
            {item.comment ? (
              <Text style={[typography.body, styles.comment]}>{item.comment}</Text>
            ) : null}
          </View>
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
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.skeleton,
  },
  row: {
    paddingVertical: spacing[12],
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  stars: {
    color: colors.goldenWheat,
    fontSize: 13,
  },
  reviewerName: {
    color: colors.textPrimary,
  },
  comment: {
    color: colors.textMuted,
    marginTop: spacing[4],
  },
});
