import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

// Badge count for the notification bell — plain interval (not
// useAutoRefresh/useFocusEffect) since the bell lives in the Home header,
// separate from the Notifications screen's own focus lifecycle.
export function useUnreadNotificationCount() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!userId) {
      setCount(0);
      return;
    }
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', userId)
      .eq('is_read', false);
    setCount(unreadCount ?? 0);
  }, [userId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  return count;
}
