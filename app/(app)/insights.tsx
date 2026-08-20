import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreatePromotionModal } from '@/components/app/CreatePromotionModal';
import { EmptyState } from '@/components/app/EmptyState';
import { SalesBarChart } from '@/components/app/SalesBarChart';
import { SectionHeader } from '@/components/app/SectionHeader';
import { useBestSellers } from '@/hooks/useBestSellers';
import { useFarmerPromotions } from '@/hooks/useFarmerPromotions';
import { useMyListings } from '@/hooks/useMyListings';
import { useReviews } from '@/hooks/useReviews';
import { useWeeklySales } from '@/hooks/useWeeklySales';
import { strings } from '@/i18n/strings';
import { shareFarmerProfile } from '@/lib/shareProfile';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export default function InsightsScreen() {
  const farmerProfile = useAuthStore((state) => state.farmerProfile);
  const { days, loading: salesLoading } = useWeeklySales(farmerProfile?.id);
  const { items: bestSellers, loading: bestSellersLoading } = useBestSellers(farmerProfile?.id);
  const { promotions, loading: promotionsLoading, create } = useFarmerPromotions(farmerProfile?.id);
  const { reviews, average, count, loading: reviewsLoading } = useReviews(farmerProfile?.id, 1);
  const { listings } = useMyListings();
  const [promoModalVisible, setPromoModalVisible] = useState(false);

  const latestReview = reviews[0];

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
        <Text style={typography.button}>{strings.insightsTitle}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[typography.label, styles.sectionTitle]}>{strings.insightsWeeklySales}</Text>
        {salesLoading ? (
          <ActivityIndicator color={colors.harvestGreen} style={styles.loadingSpacer} />
        ) : (
          <SalesBarChart days={days} />
        )}

        <SectionHeader title={strings.insightsBestSellers} />
        {bestSellersLoading ? null : bestSellers.length === 0 ? (
          <EmptyState icon="chart-line" title={strings.insightsBestSellersEmpty} />
        ) : (
          <View style={styles.bestSellersList}>
            {bestSellers.map((item, index) => (
              <View key={item.productName} style={styles.bestSellerRow}>
                <Text style={[typography.label, styles.bestSellerRank]}>{index + 1}</Text>
                <Text style={[typography.body, styles.bestSellerName]} numberOfLines={1}>
                  {item.productName}
                </Text>
                <Text style={[typography.caption, styles.bestSellerCount]}>
                  {item.unitsSold} {strings.insightsSoldSuffix}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.promotionCard}>
          {promotionsLoading ? null : promotions.length === 0 ? (
            <>
              <Text style={[typography.label, styles.promotionTitle]}>{strings.insightsNoPromotionsTitle}</Text>
              <Text style={[typography.caption, styles.promotionSubtitle]}>
                {strings.insightsNoPromotionsMessage}
              </Text>
              <Pressable
                onPress={() => setPromoModalVisible(true)}
                style={styles.promotionButton}
                accessibilityRole="button"
                accessibilityLabel={strings.insightsCreatePromotion}
              >
                <Text style={styles.promotionButtonText}>{strings.insightsCreatePromotion}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[typography.label, styles.promotionTitle]}>{strings.insightsActivePromotion}</Text>
              <Text style={[typography.caption, styles.promotionSubtitle]}>
                {promotions[0].discountPercent}% off {promotions[0].productName} ·{' '}
                {daysUntil(promotions[0].endsAt) === 0
                  ? strings.insightsPromotionEndsToday
                  : strings.insightsPromotionEndsIn(daysUntil(promotions[0].endsAt))}
              </Text>
              <Pressable
                onPress={() => setPromoModalVisible(true)}
                style={styles.promotionButton}
                accessibilityRole="button"
                accessibilityLabel={strings.insightsCreateAnotherPromotion}
              >
                <Text style={styles.promotionButtonText}>{strings.insightsCreateAnotherPromotion}</Text>
              </Pressable>
            </>
          )}
        </View>

        <Pressable
          onPress={() => router.push('/(app)/reviews')}
          style={styles.reviewsSection}
          accessibilityRole="button"
          accessibilityLabel={strings.insightsViewAllReviews}
        >
          {reviewsLoading ? null : count === 0 ? (
            <Text style={[typography.body, styles.reviewsEmpty]}>{strings.insightsNoReviewsYet}</Text>
          ) : (
            <>
              <View style={styles.reviewsSummaryRow}>
                <Text style={styles.stars}>{'★'.repeat(Math.round(average))}</Text>
                <Text style={[typography.body, styles.reviewsSummaryText]}>
                  {average.toFixed(1)} · {count} {strings.insightsReviewsSuffix}
                </Text>
              </View>
              {latestReview?.comment ? (
                <Text style={[typography.caption, styles.latestReview]} numberOfLines={2}>
                  "{latestReview.comment}" — {latestReview.reviewerName ?? 'Anonymous'}
                </Text>
              ) : null}
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => farmerProfile && shareFarmerProfile(farmerProfile.id, farmerProfile.farm_name)}
          style={styles.shareCard}
          accessibilityRole="button"
          accessibilityLabel={strings.insightsSharePromptTitle}
        >
          <FontAwesome5 name="share-alt" size={18} color={colors.harvestGreen} />
          <View style={styles.shareText}>
            <Text style={[typography.label, styles.shareTitle]}>{strings.insightsSharePromptTitle}</Text>
            <Text style={[typography.caption, styles.shareSubtitle]}>
              {strings.insightsSharePromptSubtitle}
            </Text>
          </View>
          <View style={styles.shareIconWrap}>
            <FontAwesome5 name="paper-plane" size={14} color={colors.surface} />
          </View>
        </Pressable>
      </ScrollView>

      <CreatePromotionModal
        visible={promoModalVisible}
        products={listings}
        onCancel={() => setPromoModalVisible(false)}
        onSubmit={async (productId, discountPercent, endsAt) => {
          const error = await create(productId, discountPercent, endsAt);
          if (!error) setPromoModalVisible(false);
          return error;
        }}
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
  content: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingBottom: spacing[40],
  },
  sectionTitle: {
    color: colors.textPrimary,
    marginBottom: spacing[8],
  },
  loadingSpacer: {
    marginVertical: spacing[24],
  },
  bestSellersList: {
    marginBottom: spacing[8],
  },
  bestSellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    paddingVertical: spacing[8],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.skeleton,
  },
  bestSellerRank: {
    width: 16,
    color: colors.harvestGreen,
  },
  bestSellerName: {
    flex: 1,
    color: colors.textPrimary,
  },
  bestSellerCount: {
    color: colors.textMuted,
  },
  promotionCard: {
    backgroundColor: '#F4E4D4',
    borderColor: '#E3C6A3',
    borderWidth: 0.5,
    borderRadius: 12,
    padding: spacing[12],
    marginTop: spacing[16],
  },
  promotionTitle: {
    color: colors.textPrimary,
  },
  promotionSubtitle: {
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing[8],
  },
  promotionButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.terracotta,
    borderRadius: 16,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    minHeight: 36,
    justifyContent: 'center',
  },
  promotionButtonText: {
    ...typography.caption,
    color: colors.terracotta,
    fontWeight: '600',
  },
  reviewsSection: {
    marginTop: spacing[16],
    minHeight: 44,
    justifyContent: 'center',
  },
  reviewsEmpty: {
    color: colors.textMuted,
  },
  reviewsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  stars: {
    color: colors.goldenWheat,
    fontSize: 15,
  },
  reviewsSummaryText: {
    color: colors.textPrimary,
  },
  latestReview: {
    color: colors.textMuted,
    marginTop: spacing[4],
  },
  shareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    backgroundColor: '#EAF1EC',
    borderColor: '#C7DBCB',
    borderWidth: 0.5,
    borderRadius: 12,
    padding: spacing[12],
    marginTop: spacing[20],
    minHeight: 44,
  },
  shareText: {
    flex: 1,
  },
  shareTitle: {
    color: colors.textPrimary,
  },
  shareSubtitle: {
    color: colors.textMuted,
    marginTop: 2,
  },
  shareIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.harvestGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
