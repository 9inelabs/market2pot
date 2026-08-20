import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

// Badge count for the Messages tab icon — number of this user's
// conversations with at least one unread message, for whichever role
// they're currently in. Standalone (not derived from useConversations)
// since it needs to live in the tab bar itself, outside the Messages
// screen's own component tree.
export function useUnreadMessageCount() {
  const farmerProfile = useAuthStore((state) => state.farmerProfile);
  const userId = useAuthStore((state) => state.session?.user.id);
  const activeView = useAuthStore((state) => state.profile?.active_view);
  const isFarmerView = activeView === 'farmer' && !!farmerProfile;
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!userId) {
      setCount(0);
      return;
    }
    let conversationQuery = supabase.from('conversations').select('id');
    conversationQuery = isFarmerView
      ? conversationQuery.eq('farmer_id', farmerProfile!.id)
      : conversationQuery.eq('household_id', userId);
    const { data: conversations } = await conversationQuery;
    const conversationIds = (conversations ?? []).map((c) => c.id);
    if (conversationIds.length === 0) {
      setCount(0);
      return;
    }

    const { data: unreadRows } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .is('read_at', null)
      .neq('sender_id', userId);

    setCount(new Set((unreadRows ?? []).map((r) => r.conversation_id)).size);
  }, [userId, isFarmerView, farmerProfile]);

  // The tab bar layout that renders this badge isn't itself a "screen" with
  // its own navigation focus lifecycle (it's the navigator container, so
  // useFocusEffect doesn't apply cleanly here) — a plain interval is the
  // right tool for a badge that has to stay live regardless of which tab
  // is currently active.
  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  return count;
}
