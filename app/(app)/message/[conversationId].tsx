import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { Easing, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmojiPickerRow } from '@/components/app/EmojiPickerRow';
import { EmptyState } from '@/components/app/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useMessages, type Message, type PendingMessage } from '@/hooks/useMessages';
import { strings } from '@/i18n/strings';
import { supabase } from '@/lib/supabase';
import { uploadMessageAttachment } from '@/lib/messageAttachmentUpload';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, geometry, spacing, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type ChatListItem = { kind: 'sent'; message: Message } | { kind: 'pending'; message: PendingMessage };

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function ChatThreadScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const userId = useAuthStore((state) => state.session?.user.id);
  const { messages, pendingMessages, loading, send, sendTyping, otherUserTyping, refresh } =
    useMessages(conversationId);
  // Realtime is the primary live-update mechanism here; this is just a
  // safety net in case a subscription silently drops (backgrounded app,
  // flaky connection) — refetches on focus and every 20s while open.
  useAutoRefresh(refresh);
  const [draft, setDraft] = useState('');
  const [otherPartyName, setOtherPartyName] = useState<string | null>(null);
  const [viewerIsHousehold, setViewerIsHousehold] = useState(false);
  const [farmerProfileId, setFarmerProfileId] = useState<string | null>(null);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const messagesById = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  const listItems: ChatListItem[] = useMemo(
    () => [
      ...messages.map((message): ChatListItem => ({ kind: 'sent', message })),
      ...pendingMessages.map((message): ChatListItem => ({ kind: 'pending', message })),
    ],
    [messages, pendingMessages]
  );

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    supabase
      .from('conversations')
      .select('household_id, household:profiles(full_name), farmer_profiles(id, farm_name)')
      .eq('id', conversationId)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const household = data.household as unknown as { full_name: string | null } | null;
        const farmerProfile = data.farmer_profiles as unknown as { id: string; farm_name: string | null } | null;
        // Show the OTHER party's name — a household sees the farm name, a
        // farmer sees the household's name.
        const isHousehold = data.household_id === userId;
        setViewerIsHousehold(isHousehold);
        setFarmerProfileId(farmerProfile?.id ?? null);
        setOtherPartyName((isHousehold ? farmerProfile?.farm_name : household?.full_name) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, userId]);

  const goToFarmerProfile = () => {
    if (farmerProfileId) router.push(`/(app)/farmer/${farmerProfileId}`);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled && result.assets[0]) {
      setPendingImageUri(result.assets[0].uri);
      setEmojiPickerVisible(false);
    }
  };

  const handleSend = async () => {
    // Guards against the exact "goes twice" report — without this, a fast
    // double-tap on Send (or on the attach/emoji buttons re-triggering this
    // handler while an upload is still in flight) fired two overlapping
    // sends. sending is now checked before anything else runs.
    if (sending) return;
    if (!draft.trim() && !pendingImageUri) return;
    setSending(true);
    let attachmentUrl: string | null = null;
    if (pendingImageUri && userId) {
      try {
        attachmentUrl = await uploadMessageAttachment(userId, pendingImageUri);
      } catch {
        setSending(false);
        return;
      }
    }
    const text = draft;
    setDraft('');
    setPendingImageUri(null);
    const replyToId = replyingTo?.id ?? null;
    setReplyingTo(null);
    await send({
      content: text,
      attachmentUrl,
      attachmentType: attachmentUrl ? 'image' : null,
      replyToId,
    });
    setSending(false);
    listRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={strings.back}
        >
          <FontAwesome5 name="chevron-left" size={16} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.avatar}>
          <FontAwesome5 name="user" size={13} color={colors.harvestGreen} />
        </View>
        <Pressable
          onPress={viewerIsHousehold ? goToFarmerProfile : undefined}
          disabled={!viewerIsHousehold}
          style={styles.headerTextWrap}
          accessibilityRole={viewerIsHousehold ? 'button' : undefined}
          accessibilityLabel={viewerIsHousehold ? `${otherPartyName}, ${strings.chatSeeFarmerProfile}` : undefined}
        >
          <Text style={[typography.label, styles.headerName]} numberOfLines={1}>
            {otherPartyName ?? '—'}
          </Text>
          {otherUserTyping ? (
            <Text style={[typography.caption, styles.typingText]}>{strings.chatTypingIndicator}</Text>
          ) : viewerIsHousehold ? (
            <Text style={[typography.caption, styles.seeProfileText]}>{strings.chatSeeFarmerProfile}</Text>
          ) : null}
        </Pressable>
        {viewerIsHousehold && farmerProfileId ? (
          <Pressable
            onPress={goToFarmerProfile}
            style={styles.viewListingsButton}
            accessibilityRole="button"
            accessibilityLabel={strings.chatViewListings}
          >
            <Text style={styles.viewListingsText}>{strings.chatViewListings}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.headerDivider} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={listItems}
          keyExtractor={(item) => (item.kind === 'sent' ? item.message.id : item.message.tempId)}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            loading ? null : (
              <EmptyState icon="comment-dots" title={strings.chatEmptyTitle} message={strings.chatEmptyMessage} />
            )
          }
          renderItem={({ item }) => {
            const isMine = item.kind === 'pending' || item.message.sender_id === userId;
            const id = item.kind === 'sent' ? item.message.id : item.message.tempId;
            const content = item.message.content;
            const attachmentUrl = item.kind === 'sent' ? item.message.attachment_url : item.message.attachmentUrl;
            const replyToId = item.kind === 'sent' ? item.message.reply_to_id : item.message.replyToId;
            const repliedTo = replyToId ? messagesById.get(replyToId) : null;

            // Animate only the moment a message is actually sending — a
            // pending item and its later-confirmed counterpart are two
            // different keys (tempId vs. the real id), so without this
            // being scoped to `kind === 'pending'` specifically, the bubble
            // would animate in once as "sending" and then animate in AGAIN
            // when it flips to confirmed. Once sent, it just renders
            // statically (the clock icon swaps for a timestamp with no
            // motion).
            const Wrapper = item.kind === 'pending' ? Animated.View : View;
            const wrapperProps =
              item.kind === 'pending'
                ? { entering: FadeInUp.duration(220).easing(Easing.out(Easing.cubic)) }
                : {};

            return (
              <Wrapper {...wrapperProps}>
                <Pressable
                  onLongPress={() => item.kind === 'sent' && setReplyingTo(item.message)}
                  style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}
                >
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    {repliedTo ? (
                      <View style={styles.quotedBox}>
                        <Text
                          style={[styles.quotedText, isMine ? styles.quotedTextMine : styles.quotedTextTheirs]}
                          numberOfLines={1}
                        >
                          {repliedTo.content || 'Photo'}
                        </Text>
                      </View>
                    ) : null}
                    {attachmentUrl ? <Image source={{ uri: attachmentUrl }} style={styles.attachmentImage} /> : null}
                    {content ? (
                      <Text style={isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>{content}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.metaRow, isMine ? styles.metaRowMine : styles.metaRowTheirs]}>
                    {item.kind === 'pending' ? (
                      <FontAwesome5 name="clock" size={9} color={colors.textMuted} />
                    ) : (
                      <Text style={styles.metaText}>{formatTime(item.message.created_at)}</Text>
                    )}
                  </View>
                </Pressable>
              </Wrapper>
            );
          }}
        />

        {replyingTo ? (
          <View style={styles.replyBar}>
            <View style={styles.replyBarText}>
              <Text style={[typography.caption, styles.replyBarLabel]}>{strings.chatReplyingTo}</Text>
              <Text style={typography.caption} numberOfLines={1}>
                {replyingTo.content || 'Photo'}
              </Text>
            </View>
            <Pressable
              onPress={() => setReplyingTo(null)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={strings.chatCancelReply}
            >
              <FontAwesome5 name="times" size={14} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : null}

        {pendingImageUri ? (
          <View style={styles.pendingImageBar}>
            <Image source={{ uri: pendingImageUri }} style={styles.pendingImage} />
            <Pressable
              onPress={() => setPendingImageUri(null)}
              hitSlop={10}
              style={styles.pendingImageRemove}
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
            >
              <FontAwesome5 name="times" size={10} color={colors.surface} />
            </Pressable>
          </View>
        ) : null}

        {emojiPickerVisible ? <EmojiPickerRow onSelect={(emoji) => setDraft((d) => d + emoji)} /> : null}

        <View style={styles.inputRow}>
          <Pressable
            onPress={pickImage}
            style={styles.attachButton}
            accessibilityRole="button"
            accessibilityLabel={strings.chatAttachImage}
          >
            <FontAwesome5 name="plus" size={16} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.inputWrap}>
            <Pressable
              onPress={() => setEmojiPickerVisible((v) => !v)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={strings.chatEmojiPicker}
            >
              <FontAwesome5 name="smile" size={16} color={colors.textMuted} />
            </Pressable>
            <TextField
              value={draft}
              onChangeText={(text) => {
                setDraft(text);
                sendTyping();
              }}
              placeholder={strings.chatInputPlaceholder}
              style={styles.input}
              multiline
            />
          </View>
          <Pressable
            onPress={handleSend}
            disabled={sending || (!draft.trim() && !pendingImageUri)}
            style={[styles.sendButton, sending || (!draft.trim() && !pendingImageUri) ? styles.sendButtonDisabled : null]}
            accessibilityRole="button"
            accessibilityLabel={strings.chatSendLabel}
          >
            <Text style={styles.sendButtonText}>{strings.chatSendLabel}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[16],
    paddingBottom: spacing[12],
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: withOpacity(colors.harvestGreen, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  headerName: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  typingText: {
    color: colors.harvestGreen,
  },
  seeProfileText: {
    color: colors.textMuted,
    marginTop: 1,
  },
  viewListingsButton: {
    height: 32,
    paddingHorizontal: spacing[12],
    borderRadius: 16,
    backgroundColor: colors.skeleton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewListingsText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.skeleton,
  },
  listContent: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingVertical: spacing[12],
    flexGrow: 1,
  },
  bubbleRow: {
    marginBottom: spacing[8],
  },
  bubbleRowMine: {
    alignItems: 'flex-end',
  },
  bubbleRowTheirs: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
  },
  bubbleMine: {
    backgroundColor: colors.harvestGreen,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.skeleton,
    borderBottomLeftRadius: 4,
  },
  bubbleTextMine: {
    ...typography.body,
    color: colors.surface,
  },
  bubbleTextTheirs: {
    ...typography.body,
    color: colors.textPrimary,
  },
  metaRow: {
    marginTop: 2,
    paddingHorizontal: 4,
  },
  metaRowMine: {
    alignItems: 'flex-end',
  },
  metaRowTheirs: {
    alignItems: 'flex-start',
  },
  metaText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  quotedBox: {
    borderLeftWidth: 2,
    borderLeftColor: colors.terracotta,
    paddingLeft: spacing[8],
    marginBottom: spacing[4],
  },
  quotedText: {
    ...typography.caption,
    fontStyle: 'italic',
  },
  quotedTextMine: {
    color: withOpacity(colors.surface, 0.85),
  },
  quotedTextTheirs: {
    color: colors.textMuted,
  },
  attachmentImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginBottom: spacing[4],
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.skeleton,
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingVertical: spacing[8],
  },
  replyBarText: {
    flex: 1,
  },
  replyBarLabel: {
    color: colors.harvestGreen,
    fontWeight: '600',
  },
  pendingImageBar: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[8],
    backgroundColor: colors.surface,
  },
  pendingImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  pendingImageRemove: {
    position: 'absolute',
    top: 4,
    left: 60,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(42, 36, 32, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingVertical: spacing[12],
    backgroundColor: colors.warmCream,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.skeleton,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[12],
  },
  input: {
    flex: 1,
    // TextField's base style fixes `height` to geometry.textInput.height
    // (70, a full form-field height) — this has to be overridden with an
    // explicit height, not just minHeight, since a style array only lets a
    // later minHeight win when the earlier style never set a concrete
    // height at all.
    height: 40,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  sendButton: {
    height: 40,
    paddingHorizontal: spacing[16],
    borderRadius: 20,
    backgroundColor: colors.deepSoil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    ...typography.label,
    color: colors.surface,
    fontWeight: '700',
  },
});
