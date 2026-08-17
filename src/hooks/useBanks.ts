import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type Bank = {
  code: string;
  name: string;
};

// Reads from the `banks` table (populated by the list-banks Edge Function,
// refreshed daily via pg_cron) — never calls Paystack directly, per build
// spec section 8.2: "Client reads from the banks table, not from the
// function."
export function useBanks() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('banks')
      .select('code, name')
      .order('name')
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setBanks(data ?? []);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { banks, loading, error };
}
