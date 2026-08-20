import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/app/EmptyState';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { strings } from '@/i18n/strings';
import { relativeTime } from '@/lib/relativeTime';
import { colors, geometry, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

const ICON_BY_TYPE: Record<string, { icon: React.ComponentProps<typeof FontAwesome5>['name']; bg: string; fg: string }> = {
  new_order: { icon: 'clipboard-list', bg: '#EAF1EC', fg: colors.harvestGreen },
  low_stock: { icon: 'exclamation-triangle', bg: '#F9E8C8', fg: colors.goldenWheatText },
  new_review: { icon: 'star', bg: '#F4E4D4', fg: colors.terracotta },
  verification: { icon: 'shield-alt', bg: '#EAF1EC', fg: colors.harvestGreen },
  order_paid: { icon: 'clipboard-list', bg: '#EAF1EC', fg: colors.harvestGreen },
  delivery_confirmed_pending_other_side: { icon: 'truck', bg: '#EAF1EC', fg: colors.harvestGreen },
  order_delivered_released: { icon: 'check-circle', bg: '#E1EEE3', fg: colors.harvestGreen },
  order_cancelled: { icon: 'times-circle', bg: '#EDE4D3', fg: colors.danger },
  refund_requested: { icon: 'exclamation-triangle', bg: '#F9E8C8', fg: colors.goldenWheatText },
  refund_completed: { icon: 'check-circle', bg: '#E1EEE3', fg: colors.harvestGreen },
  new_message: { icon: 'comment-dots', bg: '#EAF1EC', fg: colors.harvestGreen },
};

// Notification types that deep-link to a specific order (related_id is an
// orders.id) vs. a specific conversation (new_message, related_id is a
// conversations.id) vs. no specific record at all (falls back to a list
// screen, per the type).
const ORDER_TYPES = new Set([
  'order_paid',
  'delivery_confirmed_pending_other_side',
  'order_delivered_released',
  'order_cancelled',
  'refund_requested',
  'refund_completed',
]);

function routeFor(notification: Notification): string {
  if (ORDER_TYPES.has(notification.type) && notification.related_id) {
    return `/(app)/order/${notification.related_id}`;
  }
  if (notification.type === 'new_message' && notification.related_id) {
    return `/(app)/message/${notification.related_id}`;
  }
  switch (notification.type) {
    case 'new_order':
      return '/(app)/(tabs)/orders';
    case 'low_stock':
      return '/(app)/(tabs)/listings';
    case 'new_review':
      return '/(app)/reviews';
    case 'verification':
      return '/(app)/business/verification';
    default:
      return '/(app)/(tabs)';
  }
}

function NotificationRow({ notification, onPress }: { notification: Notification; onPress: () => void }) {
  const style = ICON_BY_TYPE[notification.type] ?? ICON_BY_TYPE.new_order;
  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={notification.title}
    >
      <View style={[styles.iconWrap, { backgroundColor: style.bg }]}>
        <FontAwesome5 name={style.icon} size={14} color={style.fg} />
      </View>
      <View style={styles.rowText}>
        <Text style={[typography.body, styles.rowTitle, !notification.is_read && styles.rowTitleUnread]}>
          {notification.title}
        </Text>
        <Text style={[typography.caption, styles.rowTime]}>{relativeTime(notification.created_at)}</Text>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const { notifications, loading, markRead, refresh } = useNotifications();
  useAutoRefresh(refresh);

  const { today, earlier } = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayItems: Notification[] = [];
    const earlierItems: Notification[] = [];
    for (const n of notifications) {
      if (new Date(n.created_at) >= startOfToday) {
        todayItems.push(n);
      } else {
        earlierItems.push(n);
      }
    }
    return { today: todayItems, earlier: earlierItems };
  }, [notifications]);

  const handlePress = async (notification: Notification) => {
    await markRead(notification.id);
    router.push(routeFor(notification));
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
          <Text style={styles.backLabel}>‹ {strings.back}</Text>
        </Pressable>
        <Text style={typography.button}>{strings.notificationsTitle}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!loading && notifications.length === 0 ? (
          <EmptyState
            icon="bell"
            title={strings.notificationsEmptyTitle}
            message={strings.notificationsEmptyMessage}
          />
        ) : (
          <>
            {today.length > 0 ? (
              <>
                <Text style={[typography.caption, styles.sectionLabel]}>{strings.notificationsToday}</Text>
                {today.map((n) => (
                  <NotificationRow key={n.id} notification={n} onPress={() => handlePress(n)} />
                ))}
              </>
            ) : null}
            {earlier.length > 0 ? (
              <>
                <Text style={[typography.caption, styles.sectionLabel]}>{strings.notificationsEarlier}</Text>
                {earlier.map((n) => (
                  <NotificationRow key={n.id} notification={n} onPress={() => handlePress(n)} />
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
  },
  backLabel: {
    ...typography.label,
    fontSize: 16,
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: geometry.screenPaddingButtons,
    paddingTop: spacing[8],
    paddingBottom: spacing[32],
  },
  sectionLabel: {
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing[16],
    marginBottom: spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[12],
    paddingVertical: spacing[8],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.skeleton,
    minHeight: 44,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    color: colors.textPrimary,
  },
  rowTitleUnread: {
    fontWeight: '600',
  },
  rowTime: {
    color: colors.textMuted,
    marginTop: 2,
  },
});
