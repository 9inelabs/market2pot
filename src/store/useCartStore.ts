import { create } from 'zustand';

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

type CartStore = {
  lines: CartLine[];
  // True only until the first load resolves. Deliberately NOT set on
  // subsequent refreshes — a background refetch must never blank the cart or
  // the badge that reads off it.
  loading: boolean;
  hasLoaded: boolean;
  refresh: () => Promise<void>;
  // Signature preserved exactly from the hook this store replaced — five
  // screens depend on the 'needs-clear-confirmation' sentinel to know when to
  // put up the "clear your cart?" dialog before switching farmers.
  addItem: (
    productId: string,
    farmerId: string,
    quantity: number,
    options?: { clearFirst?: boolean }
  ) => Promise<'ok' | 'needs-clear-confirmation' | string>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  clear: () => Promise<void>;
};

// One cart, shared by every screen.
//
// This replaces a plain `useState` hook that was being called from six
// separate places (Home via useProductQuickView, Cart, Checkout, Payment,
// Product detail, Welcome Back). Each call site got its OWN copy of the
// cart, so clearing the cart on the Cart screen left Home's copy untouched
// and its badge kept showing the old count until something else happened to
// refetch — exactly the "I cleared the cart and it still shows 1" report.
// A store makes every consumer read the same array, so one mutation updates
// all of them in the same tick.
export const useCartStore = create<CartStore>((set, get) => ({
  lines: [],
  loading: true,
  hasLoaded: false,

  refresh: async () => {
    const userId = useAuthStore.getState().session?.user.id;
    if (!userId) {
      set({ lines: [], loading: false, hasLoaded: true });
      return;
    }

    const { data } = await supabase
      .from('cart_items')
      .select(
        'id, quantity, products(id, name, price, unit, photo_urls, quantity_available, farmer_id, farmer_profiles(farm_name))'
      )
      .eq('household_id', userId)
      .order('created_at', { ascending: true });

    type Row = {
      id: string;
      quantity: number;
      products: {
        id: string;
        name: string;
        price: number;
        unit: string;
        photo_urls: string[];
        quantity_available: number;
        farmer_id: string;
        farmer_profiles: { farm_name: string } | null;
      } | null;
    };

    const lines = ((data as Row[] | null) ?? [])
      .filter((row) => row.products)
      .map((row) => ({
        cartItemId: row.id,
        productId: row.products!.id,
        name: row.products!.name,
        price: row.products!.price,
        unit: row.products!.unit,
        photoUrl: row.products!.photo_urls?.[0] ?? null,
        quantity: row.quantity,
        quantityAvailable: row.products!.quantity_available,
        farmerId: row.products!.farmer_id,
        farmName: row.products!.farmer_profiles?.farm_name ?? '',
      }));

    set({ lines, loading: false, hasLoaded: true });
  },

  addItem: async (productId, farmerId, quantity, options) => {
    const userId = useAuthStore.getState().session?.user.id;
    if (!userId) return 'Sign in to add items to your cart.';

    // One farmer per cart. The caller is told to confirm with the shopper
    // first and calls back with clearFirst — this never wipes a cart on its
    // own initiative.
    const currentFarmerId = get().lines[0]?.farmerId;
    if (currentFarmerId && currentFarmerId !== farmerId && !options?.clearFirst) {
      return 'needs-clear-confirmation';
    }
    if (currentFarmerId && currentFarmerId !== farmerId && options?.clearFirst) {
      await supabase.from('cart_items').delete().eq('household_id', userId);
      set({ lines: [] });
    }

    const existing = get().lines.find((line) => line.productId === productId);
    const { error } = await supabase.from('cart_items').upsert(
      {
        household_id: userId,
        product_id: productId,
        quantity: (options?.clearFirst ? 0 : (existing?.quantity ?? 0)) + quantity,
      },
      { onConflict: 'household_id,product_id' }
    );
    if (error) return error.message;
    await get().refresh();
    return 'ok';
  },

  updateQuantity: async (cartItemId, quantity) => {
    if (quantity <= 0) {
      await get().removeItem(cartItemId);
      return;
    }
    // Optimistic: the badge and the row move immediately, then the refetch
    // reconciles. Without this the user taps + and waits a round trip.
    set({
      lines: get().lines.map((line) =>
        line.cartItemId === cartItemId ? { ...line, quantity } : line
      ),
    });
    await supabase.from('cart_items').update({ quantity }).eq('id', cartItemId);
    await get().refresh();
  },

  removeItem: async (cartItemId) => {
    set({ lines: get().lines.filter((line) => line.cartItemId !== cartItemId) });
    await supabase.from('cart_items').delete().eq('id', cartItemId);
    await get().refresh();
  },

  clear: async () => {
    const userId = useAuthStore.getState().session?.user.id;
    // Cleared locally FIRST so every badge in the app drops to zero on this
    // tick rather than after the round trip.
    set({ lines: [] });
    if (!userId) return;
    await supabase.from('cart_items').delete().eq('household_id', userId);
  },
}));

// Derived selectors — components subscribe to just the number they render,
// so a quantity change doesn't re-render every screen holding a cart.
export function selectItemCount(state: CartStore): number {
  return state.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function selectSubtotal(state: CartStore): number {
  return state.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
}
