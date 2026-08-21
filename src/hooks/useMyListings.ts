import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Product } from '@/hooks/useFreshProducts';
import { useAuthStore } from '@/store/useAuthStore';

// The signed-in farmer's own products, available or not — Farmer Home's
// preview and the full Listings tab both read from this (unlike
// useFreshProducts, which only ever returns is_available = true rows,
// correct for a browsing household but wrong for a farmer managing their
// own list).
export function useMyListings() {
  const farmerProfileId = useAuthStore((state) => state.farmerProfile?.id);
  const [listings, setListings] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!farmerProfileId) {
      setListings([]);
      setLoading(false);
      return;
    }
    // NOT set on refetch — see useAutoRefresh. This hook is polled every 20s;
    // flipping loading back to true made every consumer unmount its list and
    // remount it, which is the visible blink/flash the screens had. loading
    // now means "first load hasn't finished", nothing else, so a background
    // refresh swaps the data underneath without the UI ever going empty.
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('farmer_id', farmerProfileId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setListings(data ?? []);
    }
    setLoading(false);
  }, [farmerProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  const setAvailability = async (productId: string, isAvailable: boolean) => {
    // Optimistic — the toggle should feel instant, not wait on a round trip.
    setListings((current) =>
      current.map((product) =>
        product.id === productId ? { ...product, is_available: isAvailable } : product
      )
    );
    const { error: updateError } = await supabase
      .from('products')
      .update({ is_available: isAvailable })
      .eq('id', productId);
    if (updateError) {
      // Revert on failure rather than leaving the UI showing a state that
      // never actually saved.
      setListings((current) =>
        current.map((product) =>
          product.id === productId ? { ...product, is_available: !isAvailable } : product
        )
      );
    }
  };

  const remove = async (productId: string) => {
    const previous = listings;
    setListings((current) => current.filter((product) => product.id !== productId));
    const { error: deleteError } = await supabase.from('products').delete().eq('id', productId);
    if (deleteError) {
      setListings(previous);
      return deleteError.message;
    }
    return null;
  };

  return { listings, loading, error, refresh: load, setAvailability, remove };
}
