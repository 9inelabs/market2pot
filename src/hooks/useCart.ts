import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import {
  selectItemCount,
  selectSubtotal,
  useCartStore,
  type CartLine,
} from '@/store/useCartStore';

export type { CartLine };

// Module-level, not per-component: every screen that mounts useCart() would
// otherwise open its own Realtime channel and fire its own initial load.
// One subscription serves all of them, torn down when the user changes.
let channelUserId: string | null = null;
let channel: ReturnType<typeof supabase.channel> | null = null;

function ensureSubscription(userId: string | undefined) {
  if (channelUserId === (userId ?? null)) return;

  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
  channelUserId = userId ?? null;
  if (!userId) return;

  // Keeps the badge honest across devices and against writes made by an Edge
  // Function (checkout clears the cart server-side). Local mutations already
  // update the store optimistically — this is the backstop, not the primary
  // path.
  channel = supabase
    .channel(`cart_items:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cart_items', filter: `household_id=eq.${userId}` },
      () => {
        void useCartStore.getState().refresh();
      }
    )
    .subscribe();
}

// The cart, backed by a single shared store — see src/store/useCartStore.ts
// for why this stopped being a plain useState hook.
export function useCart() {
  const userId = useAuthStore((state) => state.session?.user.id);

  const lines = useCartStore((state) => state.lines);
  const loading = useCartStore((state) => state.loading);
  const hasLoaded = useCartStore((state) => state.hasLoaded);
  const refresh = useCartStore((state) => state.refresh);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clear = useCartStore((state) => state.clear);

  const itemCount = useCartStore(selectItemCount);
  const subtotal = useCartStore(selectSubtotal);

  useEffect(() => {
    ensureSubscription(userId);
    // Only the first consumer to mount triggers the initial fetch; the rest
    // read the store the subscription and that fetch already populated.
    if (!hasLoaded) {
      void refresh();
    }
  }, [userId, hasLoaded, refresh]);

  return { lines, loading, itemCount, subtotal, refresh, addItem, updateQuantity, removeItem, clear };
}
