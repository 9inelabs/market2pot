import { router } from 'expo-router';
import { useState } from 'react';

import { useCart } from '@/hooks/useCart';
import type { QuickViewProduct } from '@/components/app/ProductQuickViewModal';
import type { Product } from '@/hooks/useFreshProducts';

// Shared "tap a product -> open the quick-view overlay" wiring, reused by
// Home, Search, Categories, and Farmer Profile — every screen that shows a
// grid of ProductCards. Keeps the overlay's open/selected state and the
// addToCart/viewFull handlers in one place instead of four copies.
export function useProductQuickView() {
  const cart = useCart();
  const [selected, setSelected] = useState<QuickViewProduct | null>(null);

  const open = (product: Product) => {
    setSelected({
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      photoUrls: product.photo_urls,
      quantityAvailable: product.quantity_available,
      farmerId: product.farmer_id,
    });
  };

  const close = () => setSelected(null);

  const viewFull = (productId: string) => {
    close();
    router.push(`/(app)/product/${productId}`);
  };

  return { cart, selectedProduct: selected, open, close, viewFull };
}
