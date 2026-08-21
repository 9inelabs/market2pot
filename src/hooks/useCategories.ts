import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type Category = {
  id: string;
  name: string;
  sortOrder: number;
};

// The one place the app learns what categories exist — Home's filter row,
// the Categories browse screen, the Products tab, and Add/Edit Product's
// picker all read this. Nothing hardcodes the list, and nothing derives it
// from `select distinct category` over live listings any more (which made
// the chip row change shape as listings came and went).
//
// Module-level cache: this is reference data that changes only in a
// migration, so the first screen to ask pays for the fetch and every screen
// after it renders the chips on the first frame — no empty-then-populate
// flash when moving between tabs.
let cached: Category[] | null = null;
let inFlight: Promise<Category[]> | null = null;

async function fetchCategories(): Promise<Category[]> {
  const { data } = await supabase
    .from('categories')
    .select('id, name, sort_order')
    .order('sort_order', { ascending: true });

  return (data ?? []).map((row) => ({ id: row.id, name: row.name, sortOrder: row.sort_order }));
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);

  useEffect(() => {
    if (cached !== null) return;

    let active = true;
    inFlight ??= fetchCategories();
    void inFlight.then((rows) => {
      cached = rows;
      inFlight = null;
      if (active) {
        setCategories(rows);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return { categories, loading };
}
