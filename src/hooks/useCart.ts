import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export type CartLine = {
  cartItemId: string;
  productId: string;
  name: string;
  price: number;
  unit: string;
  photoUrl: string | null;
  quantity: number;
  quantityAvailable: number;
  farmerId: string;
  farmName: string;
};

// Real, persistent cart (cart_items table) — replaces the old local-only
// useCartStore. One farmer per cart: addItem clears any existing lines from
// a different farmer first, but only after the caller has already confirmed
// that with the shopper (see ProductQuickViewModal) — this hook itself just
// does what it's told, it doesn't own the confirmation UX.
export function useCart() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setLines([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('cart_items')
      .select(
        'id, quantity, products(id, name, price, unit, photo_urls, quantity_available, farmer_id, farmer_profiles(farm_name))'
      )
      .eq('household_id', userId)
      .order('created_at', { ascending: true });

    type Row = (typeof data extends (infer R)[] | null ? R : never) & {
      products:
        | {
            id: string;
            name: string;
            price: number;
            unit: string;
            photo_urls: string[];
            quantity_available: number;
            farmer_id: string;
            farmer_profiles: { farm_name: string } | null;
          }
        | null;
    };

    setLines(
      ((data as Row[] | null) ?? [])
        .filter((row) => row.products)
        .map((row) => ({
          cartItemId: row.id,
          productId: row.products!.id,
          name: row.products!.name,
          price: row.products!.price,
          unit: row.products!.unit,
          photoUrl: row.products!.photo_urls[0] ?? null,
          quantity: row.quantity,
          quantityAvailable: row.products!.quantity_available,
          farmerId: row.products!.farmer_id,
          farmName: row.products!.farmer_profiles?.farm_name ?? 'Farm',
        }))
    );
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Returns 'ok', 'needs-clear-confirmation' (cart has a different farmer's
  // items — caller should confirm with the user before retrying with
  // clearFirst: true), or an error message string.
  const addItem = async (
    productId: string,
    farmerId: string,
    quantity: number,
    options?: { clearFirst?: boolean }
  ): Promise<'ok' | 'needs-clear-confirmation' | string> => {
    if (!userId) return 'Sign in to add items to your cart.';

    const currentFarmerId = lines[0]?.farmerId;
    if (currentFarmerId && currentFarmerId !== farmerId && !options?.clearFirst) {
      return 'needs-clear-confirmation';
    }
    if (currentFarmerId && currentFarmerId !== farmerId && options?.clearFirst) {
      await supabase.from('cart_items').delete().eq('household_id', userId);
    }

    const existing = lines.find((line) => line.productId === productId);
    const { error } = await supabase.from('cart_items').upsert(
      {
        household_id: userId,
        product_id: productId,
        quantity: (options?.clearFirst ? 0 : (existing?.quantity ?? 0)) + quantity,
      },
      { onConflict: 'household_id,product_id' }
    );
    if (error) return error.message;
    await load();
    return 'ok';
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      return removeItem(cartItemId);
    }
    setLines((current) => current.map((l) => (l.cartItemId === cartItemId ? { ...l, quantity } : l)));
    await supabase.from('cart_items').update({ quantity }).eq('id', cartItemId);
  };

  const removeItem = async (cartItemId: string) => {
    setLines((current) => current.filter((l) => l.cartItemId !== cartItemId));
    await supabase.from('cart_items').delete().eq('id', cartItemId);
  };

  const clear = async () => {
    if (!userId) return;
    setLines([]);
    await supabase.from('cart_items').delete().eq('household_id', userId);
  };

  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

  return { lines, loading, itemCount, subtotal, refresh: load, addItem, updateQuantity, removeItem, clear };
}
