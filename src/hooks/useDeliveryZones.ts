import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

export type DeliveryZone = Database['public']['Tables']['delivery_zones']['Row'];

// Business Settings' "Delivery zones & fees" list + add/edit/delete.
export function useDeliveryZones(farmerProfileId: string | undefined) {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!farmerProfileId) {
      setZones([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('delivery_zones')
      .select('*')
      .eq('farmer_id', farmerProfileId)
      .order('created_at', { ascending: true });
    setZones(data ?? []);
    setLoading(false);
  }, [farmerProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  const addZone = async (zoneName: string, fee: number) => {
    if (!farmerProfileId) return 'Your farmer profile could not be found.';
    const { error } = await supabase
      .from('delivery_zones')
      .insert({ farmer_id: farmerProfileId, zone_name: zoneName, fee });
    if (error) return error.message;
    await load();
    return null;
  };

  const updateZone = async (id: string, zoneName: string, fee: number) => {
    const { error } = await supabase
      .from('delivery_zones')
      .update({ zone_name: zoneName, fee })
      .eq('id', id);
    if (error) return error.message;
    await load();
    return null;
  };

  const removeZone = async (id: string) => {
    const previous = zones;
    setZones((current) => current.filter((z) => z.id !== id));
    const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
    if (error) {
      setZones(previous);
      return error.message;
    }
    return null;
  };

  return { zones, loading, refresh: load, addZone, updateZone, removeZone };
}
