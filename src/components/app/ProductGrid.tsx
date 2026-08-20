import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProductCard } from '@/components/app/ProductCard';
import type { Product } from '@/hooks/useFreshProducts';
import { spacing } from '@/theme/tokens';

type Props = {
  products: Product[];
  onPressProduct: (product: Product) => void;
  // Search/Categories use the default 2; the Products tab uses 3, matching
  // its reference design exactly.
  columns?: number;
};

// N-column product grid — Search, Categories, and Products (the former
// Search tab) results. Home and Farmer Profile chunk their own 2-column
// rows inline (built before this existed); not worth churning working code
// to adopt this, but any new product-grid screen should use it.
export function ProductGrid({ products, onPressProduct, columns = 2 }: Props) {
  const rows = useMemo(() => {
    const chunks: Product[][] = [];
    for (let i = 0; i < products.length; i += columns) {
      chunks.push(products.slice(i, i + columns));
    }
    return chunks;
  }, [products, columns]);

  return (
    <View style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((product) => (
            <ProductCard
              key={product.id}
              name={product.name}
              unit={product.unit}
              price={product.price}
              photoUrl={product.photo_urls[0] ?? null}
              harvestDate={product.harvest_date}
              onPress={() => onPressProduct(product)}
            />
          ))}
          {Array.from({ length: columns - row.length }).map((_, spacerIndex) => (
            <View key={`spacer-${spacerIndex}`} style={styles.spacer} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing[12],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[12],
  },
  spacer: {
    flex: 1,
  },
});
