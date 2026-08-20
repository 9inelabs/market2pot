import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/app/EmptyState';
import { ProductGrid } from '@/components/app/ProductGrid';
import { ProductQuickViewModal } from '@/components/app/ProductQuickViewModal';
import { useFreshProducts, useProductCategories } from '@/hooks/useFreshProducts';
import { useProductQuickView } from '@/hooks/useProductQuickView';
import { strings } from '@/i18n/strings';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export default function CategoriesScreen() {
  const { categories, loading: categoriesLoading } = useProductCategories();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { products, loading: productsLoading } = useFreshProducts({ category: selectedCategory, limit: 60 });
  const { cart, selectedProduct, open, close, viewFull } = useProductQuickView();

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
        <Text style={typography.button}>{strings.categoriesTitle}</Text>
        <View style={{ width: 44 }} />
      </View>

      {!categoriesLoading && categories.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="th-large"
            title={strings.categoriesEmptyTitle}
            message={strings.categoriesEmptyMessage}
          />
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
            {categories.map((category) => {
              const selected = selectedCategory === category;
              return (
                <Pressable
                  key={category}
                  onPress={() => setSelectedCategory(selected ? null : category)}
                  style={[styles.chip, selected && styles.chipSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${category}`}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{category}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView contentContainerStyle={styles.content}>
            {productsLoading ? null : products.length === 0 ? (
              <EmptyState icon="seedling" title={strings.homeNoProductsTitle} message={strings.homeNoProductsMessage} />
            ) : (
              <ProductGrid products={products} onPressProduct={open} />
            )}
          </ScrollView>
        </>
      )}

      <ProductQuickViewModal
        visible={!!selectedProduct}
        product={selectedProduct}
        onClose={close}
        onAddToCart={cart.addItem}
        onViewFull={viewFull}
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
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: {
    paddingHorizontal: geometry.screenPaddingButtons,
    marginBottom: spacing[12],
  },
  chip: {
    height: 36,
    paddingHorizontal: spacing[16],
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.skeleton,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[8],
  },
  chipSelected: {
    backgroundColor: colors.harvestGreen,
    borderColor: colors.harvestGreen,
  },
  chipLabel: {
    ...typography.label,
    color: colors.textPrimary,
  },
  chipLabelSelected: {
    color: colors.surface,
  },
  content: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingBottom: spacing[32],
  },
});
