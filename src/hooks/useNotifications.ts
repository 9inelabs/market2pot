import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { useAuthStore } from '@/store/useAuthStore';

export type Notification = Database['public']['Tables']['notifications']['Row'];

// Notifications tab — real query for the signed-in profile (works
// identically whichever active_view they're currently in, since
// notifications.profile_id is the underlying profiles.id either way).
export function useNotifications() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    // NOT set on refetch — see useAutoRefresh. This hook is polled every 20s;
    // flipping loading back to true made every consumer unmount its list and
    // remount it, which is the visible blink/flash the screens had. loading
    // now means "first load hasn't finished", nothing else, so a background
    // refresh swaps the data underneath without the UI ever going empty.
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false });
    setNotifications(data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id: string) => {
    setNotifications((current) =>
      current.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  return { notifications, loading, refresh: load, markRead };
}
