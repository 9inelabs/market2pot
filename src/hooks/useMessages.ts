import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { useAuthStore } from '@/store/useAuthStore';

export type Message = Database['public']['Tables']['messages']['Row'];

// A message this device has sent but not yet confirmed by the server —
// rendered with a clock icon instead of a timestamp until it resolves into
// a real Message (or is dropped, on failure).
export type PendingMessage = {
  tempId: string;
  content: string;
  attachmentUrl: string | null;
  attachmentType: 'image' | null;
  replyToId: string | null;
  createdAt: string;
};

type SendArgs = {
  content: string;
  attachmentUrl?: string | null;
  attachmentType?: 'image' | null;
  replyToId?: string | null;
};

function addMessageDeduped(current: Message[], incoming: Message): Message[] {
  return current.some((m) => m.id === incoming.id) ? current : [...current, incoming];
}

// Chat thread — real messages for one conversation, a Supabase Realtime
// subscription for new messages, and a Broadcast channel (same channel,
// different event) for an ephemeral typing indicator that's never
// persisted to the database.
export function useMessages(conversationId: string | undefined) {
  const userId = useAuthStore((state) => state.session?.user.id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setMessages(data ?? []);
    setLoading(false);

    // Mark every not-mine, unread message in this thread as read now that
    // it's actually being viewed.
    if (userId) {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .is('read_at', null)
        .neq('sender_id', userId);
    }
  }, [conversationId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          // Without this dedup check, a message this same device just sent
          // arrives twice: once from send()'s own optimistic insert-return
          // below, and once more from this realtime event for the exact
          // same row — producing a duplicate `id` in the list (the crash
          // seen as "Encountered two children with the same key").
          setMessages((current) => addMessageDeduped(current, payload.new as Message));
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.userId === userId) return;
        setOtherUserTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setOtherUserTyping(false), 3000);
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId, userId]);

  const sendTyping = () => {
    if (!userId) return;
    channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId } });
  };

  const send = async ({ content, attachmentUrl, attachmentType, replyToId }: SendArgs) => {
    if (!conversationId || !userId) return null;
    const trimmed = content.trim();
    if (!trimmed && !attachmentUrl) return null;

    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setPendingMessages((current) => [
      ...current,
      {
        tempId,
        content: trimmed,
        attachmentUrl: attachmentUrl ?? null,
        attachmentType: attachmentType ?? null,
        replyToId: replyToId ?? null,
        createdAt: new Date().toISOString(),
      },
    ]);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: trimmed,
        attachment_url: attachmentUrl ?? null,
        attachment_type: attachmentType ?? null,
        reply_to_id: replyToId ?? null,
      })
      .select()
      .single();

    setPendingMessages((current) => current.filter((m) => m.tempId !== tempId));

    if (error) return error.message;
    // Inserting the confirmed row immediately (rather than waiting for the
    // realtime event to round-trip back) keeps the send feeling instant on
    // the sender's own screen; the postgres_changes handler above dedupes
    // against this by id when it arrives moments later.
    setMessages((current) => addMessageDeduped(current, data));
    return null;
  };

  return { messages, pendingMessages, loading, send, sendTyping, otherUserTyping, refresh: load };
}
