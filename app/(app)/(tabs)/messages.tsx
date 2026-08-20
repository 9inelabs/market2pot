import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/app/EmptyState';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useConversations, type ConversationListItem } from '@/hooks/useConversations';
import { strings } from '@/i18n/strings';
import { relativeTime } from '@/lib/relativeTime';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, geometry, spacing, withOpacity } from '@/theme/tokens';
import { typography } from '@/theme/typography';

function ConversationsList({ role }: { role: 'farmer' | 'household' }) {
  const { conversations, loading, refresh, markAllRead } = useConversations(role);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };
  useAutoRefresh(refresh);

  const hasUnread = conversations.some((c) => c.unread);

  return (
    <>
      <View style={styles.headerRow}>
        <Text style={typography.button}>{strings.messagesTitle}</Text>
        <Pressable
          onPress={markAllRead}
          disabled={!hasUnread}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={strings.messagesMarkAllRead}
        >
          <Text style={[styles.markAllRead, !hasUnread && styles.markAllReadDisabled]}>
            {strings.messagesMarkAllRead}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.harvestGreen} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState icon="comment-dots" title={strings.messagesEmptyTitle} message={strings.messagesEmptyMessage} />
          )
        }
        renderItem={({ item }) => <ConversationRow item={item} />}
      />
    </>
  );
}

function ConversationRow({ item }: { item: ConversationListItem }) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.push(`/(app)/message/${item.id}`)}
        style={styles.rowMain}
        accessibilityRole="button"
        accessibilityLabel={`Conversation with ${item.otherPartyName}`}
      >
        <View style={styles.avatar}>
          <FontAwesome5 name="user" size={16} color={colors.harvestGreen} />
        </View>
        <View style={styles.info}>
          <Text style={[typography.label, styles.name]} numberOfLines={1}>
            {item.otherPartyName}
          </Text>
          <Text style={[typography.caption, styles.preview]} numberOfLines={1}>
            {item.lastMessagePreview ?? ''}
          </Text>
        </View>
        <View style={styles.meta}>
          <Text style={[typography.caption, styles.time]}>{relativeTime(item.lastMessageAt)}</Text>
          {item.unread ? <View style={styles.unreadDot} /> : null}
        </View>
      </Pressable>

      <View style={styles.actionsRow}>
        {item.farmerProfileId ? (
          <Pressable
            onPress={() => router.push(`/(app)/farmer/${item.farmerProfileId}`)}
            style={[styles.actionButton, styles.viewProfileButton]}
            accessibilityRole="button"
            accessibilityLabel={`${strings.chatSeeFarmerProfile} — ${item.otherPartyName}`}
          >
            <Text style={styles.viewProfileText}>{strings.messagesViewProfile}</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => router.push(`/(app)/message/${item.id}`)}
          style={[styles.actionButton, styles.replyButton]}
          accessibilityRole="button"
          accessibilityLabel={`${strings.messagesReply} — ${item.otherPartyName}`}
        >
          <Text style={styles.replyText}>{strings.messagesReply}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function MessagesScreen() {
  const activeView = useAuthStore((state) => state.profile?.active_view);
  const hasFarmerProfile = useAuthStore((state) => !!state.farmerProfile);
  const isFarmerView = activeView === 'farmer' && hasFarmerProfile;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ConversationsList role={isFarmerView ? 'farmer' : 'household'} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[12],
    paddingBottom: spacing[8],
    minHeight: 44,
  },
  markAllRead: {
    ...typography.label,
    color: colors.harvestGreen,
    fontWeight: '600',
  },
  markAllReadDisabled: {
    color: colors.textMuted,
    opacity: 0.5,
  },
  listContent: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingBottom: spacing[32],
    flexGrow: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.skeleton,
  },
  row: {
    paddingVertical: spacing[12],
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    minHeight: 44,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: withOpacity(colors.harvestGreen, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  preview: {
    color: colors.textMuted,
    marginTop: 2,
  },
  meta: {
    alignItems: 'flex-end',
    gap: spacing[4],
  },
  time: {
    color: colors.textMuted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.terracotta,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing[8],
    marginTop: spacing[8],
    marginLeft: 52,
  },
  actionButton: {
    height: 32,
    paddingHorizontal: spacing[16],
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewProfileButton: {
    backgroundColor: colors.harvestGreen,
  },
  viewProfileText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
  },
  replyButton: {
    backgroundColor: colors.skeleton,
  },
  replyText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
