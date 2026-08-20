import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/app/EmptyState';
import { ProductGrid } from '@/components/app/ProductGrid';
import { ProductQuickViewModal } from '@/components/app/ProductQuickViewModal';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useFreshProducts, useProductCategories } from '@/hooks/useFreshProducts';
import { useProductQuickView } from '@/hooks/useProductQuickView';
import { useProductSearch } from '@/hooks/useProductSearch';
import { strings } from '@/i18n/strings';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

const GRID_COLUMNS = 3;

// The former Search tab — now "Products," a real browse-everything screen
// (every available product from every farmer), matching the reference
// design exactly: category chips + a 3-per-row grid, no visible search
// field by default. Home's own search bar links straight here; this
// screen's header also gets its own toggleable search (a tap reveals an
// input, reusing useProductSearch) so there's still a real search-results
// experience, not just browsing.
export default function ProductsScreen() {
  const [searchVisible, setSearchVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { categories } = useProductCategories();
  const { products: browseProducts, loading: browseLoading, refresh } = useFreshProducts({
    category: selectedCategory,
    limit: 60,
  });
  const { results: searchResults, loading: searchLoading } = useProductSearch(query);
  const { cart, selectedProduct, open, close, viewFull } = useProductQuickView();

  useAutoRefresh(refresh);

  const isSearching = searchVisible && query.trim().length > 0;
  const products = isSearching ? searchResults : browseProducts;
  const loading = isSearching ? searchLoading : browseLoading;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={typography.button}>{strings.productsTitle}</Text>
        <Pressable
          onPress={() => {
            setSearchVisible((v) => !v);
            if (searchVisible) setQuery('');
          }}
          hitSlop={8}
          style={styles.searchToggle}
          accessibilityRole="button"
          accessibilityLabel={strings.searchPlaceholder}
        >
          <FontAwesome5 name={searchVisible ? 'times' : 'search'} size={16} color={colors.textPrimary} />
        </Pressable>
      </View>

      {searchVisible ? (
        <View style={styles.searchBar}>
          <FontAwesome5 name="search" size={14} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={strings.searchPlaceholder}
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoFocus
            returnKeyType="search"
          />
        </View>
      ) : null}

      {!isSearching ? (
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
      ) : null}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {loading ? null : products.length === 0 ? (
          <EmptyState
            icon="seedling"
            title={isSearching ? strings.searchNoResultsTitle : strings.homeNoProductsTitle}
            message={isSearching ? strings.searchNoResultsMessage : strings.homeNoProductsMessage}
          />
        ) : (
          <ProductGrid products={products} onPressProduct={open} columns={GRID_COLUMNS} />
        )}
      </ScrollView>

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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[12],
    paddingBottom: spacing[8],
    minHeight: 44,
  },
  searchToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.skeleton,
    paddingHorizontal: spacing[16],
    backgroundColor: colors.surface,
    marginHorizontal: geometry.screenPaddingButtons,
    marginBottom: spacing[8],
  },
  searchInput: {
    ...typography.body,
    flex: 1,
    color: colors.textPrimary,
    padding: 0,
  },
  chipsRow: {
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: geometry.screenPaddingButtons,
    marginBottom: spacing[12],
  },
  chip: {
    height: 32,
    paddingHorizontal: spacing[16],
    borderRadius: 16,
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
