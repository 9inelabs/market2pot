import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export type ConversationListItem = {
  id: string;
  otherPartyName: string;
  lastMessagePreview: string | null;
  lastMessageAt: string;
  unread: boolean;
  // Only set for a household's own inbox — the farmer_profiles.id to link
  // to their public profile. Farmers have no equivalent target (households
  // don't have a public profile screen), so this is undefined on that side.
  farmerProfileId: string | null;
};

// Messages inbox, for either role — most recent first. Unread means the
// last message wasn't sent by the viewer and hasn't been read yet; that
// requires the last message row itself (sender_id + read_at), not just the
// conversation's denormalized preview text.
export function useConversations(role: 'farmer' | 'household') {
  const farmerProfile = useAuthStore((state) => state.farmerProfile);
  const userId = useAuthStore((state) => state.session?.user.id);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (role === 'farmer' && !farmerProfile) {
      setConversations([]);
      setLoading(false);
      return;
    }
    if (role === 'household' && !userId) {
      setConversations([]);
      setLoading(false);
      return;
    }
    // NOT set on refetch — see useAutoRefresh. This hook is polled every 20s;
    // flipping loading back to true made every consumer unmount its list and
    // remount it, which is the visible blink/flash the screens had. loading
    // now means "first load hasn't finished", nothing else, so a background
    // refresh swaps the data underneath without the UI ever going empty.

    let query = supabase
      .from('conversations')
      .select('id, last_message_preview, last_message_at, household:profiles(full_name), farmer_profiles(id, farm_name)')
      .order('last_message_at', { ascending: false });
    query = role === 'farmer' ? query.eq('farmer_id', farmerProfile!.id) : query.eq('household_id', userId!);

    const { data } = await query;

    const conversationIds = (data ?? []).map((row) => row.id);
    const unreadIds = new Set<string>();
    if (conversationIds.length > 0 && userId) {
      const { data: unreadRows } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .is('read_at', null)
        .neq('sender_id', userId);
      for (const row of unreadRows ?? []) {
        unreadIds.add(row.conversation_id);
      }
    }

    setConversations(
      (data ?? []).map((row) => {
        const household = row.household as unknown as { full_name: string | null } | null;
        const farmer = row.farmer_profiles as unknown as { id: string; farm_name: string | null } | null;
        return {
          id: row.id,
          otherPartyName: (role === 'farmer' ? household?.full_name : farmer?.farm_name) ?? 'Unknown',
          lastMessagePreview: row.last_message_preview,
          lastMessageAt: row.last_message_at,
          unread: unreadIds.has(row.id),
          farmerProfileId: role === 'household' ? (farmer?.id ?? null) : null,
        };
      })
    );
    setLoading(false);
  }, [role, farmerProfile, userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Marks every unread message across every one of this viewer's
  // conversations as read in one go — the inbox's "Mark all as read".
  const markAllRead = async () => {
    if (!userId) return;
    const conversationIds = conversations.map((c) => c.id);
    if (conversationIds.length === 0) return;
    setConversations((current) => current.map((c) => ({ ...c, unread: false })));
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('conversation_id', conversationIds)
      .is('read_at', null)
      .neq('sender_id', userId);
  };

  return { conversations, loading, refresh: load, markAllRead };
}
