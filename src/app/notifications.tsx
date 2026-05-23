import { AppIcon } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Palette } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useNotificationStore } from '@/store/notificationStore';
import { formatDateTimeLabel } from '@/utils/formatters';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Swipeable from 'react-native-gesture-handler/Swipeable';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const markRead = useNotificationStore((state) => state.markRead);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const clearNotificationsByFilter = useNotificationStore((state) => state.clearNotificationsByFilter);
  const restoreLastDeletedNotification = useNotificationStore((state) => state.restoreLastDeletedNotification);
  const lastDeletedNotification = useNotificationStore((state) => state.lastDeletedNotification);
  const [filter, setFilter] = useState<'all' | 'unread' | 'reminder' | 'transaction' | 'report' | 'system'>('all');

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (filter === 'all') return true;
      if (filter === 'unread') return !notification.read;
      return notification.kind === filter;
    });
  }, [filter, notifications]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 110, gap: 16 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              backgroundColor: theme.surfaceGlass,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppIcon name="arrow-back-outline" color={theme.text} size={18} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>Notifications</Text>
            <Text style={{ color: theme.muted, fontSize: 13 }}>
              {unreadCount ? `${unreadCount} unread` : 'Everything is up to date'}
            </Text>
          </View>
        </View>
        {notifications.length ? <Button label="Mark all read" onPress={markAllRead} secondary compact /> : null}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {(['all', 'unread', 'reminder', 'transaction', 'report', 'system'] as const).map((option) => (
          <Button
            key={option}
            label={option === 'all' ? 'All' : option[0].toUpperCase() + option.slice(1)}
            onPress={() => setFilter(option)}
            secondary={filter !== option}
            compact
          />
        ))}
      </View>

      {lastDeletedNotification ? (
        <Card style={{ padding: 14, gap: 10, borderColor: theme.accent, backgroundColor: theme.surfaceElevated }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '900' }}>Notification deleted</Text>
          <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18 }}>
            You can undo the last deletion if that was a mistake.
          </Text>
          <Button
            label="Undo delete"
            onPress={restoreLastDeletedNotification}
            compact
            style={{ alignSelf: 'flex-start', backgroundColor: theme.accent }}
          />
        </Card>
      ) : null}

      {filteredNotifications.length ? (
        <Button
          label={filter === 'all' ? 'Clear all notifications' : 'Clear filtered notifications'}
          onPress={() => clearNotificationsByFilter(filter)}
          secondary
          compact
        />
      ) : null}

      {filteredNotifications.length ? (
        filteredNotifications.map((notification) => (
          <Swipeable
            key={notification.id}
            overshootRight={false}
            renderRightActions={() => (
              <View style={{ justifyContent: 'center', paddingLeft: 12 }}>
                <Button
                  label="Delete"
                  onPress={() => removeNotification(notification.id)}
                  compact
                  style={{ backgroundColor: Palette.orange }}
                />
              </View>
            )}
            onSwipeableOpen={(direction) => {
              if (direction === 'right') {
                removeNotification(notification.id);
              }
            }}
          >
            <Card
              style={{
                padding: 14,
                gap: 10,
                borderColor: notification.read ? undefined : theme.accent,
                backgroundColor: notification.read ? theme.surface : theme.surfaceElevated,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <AppIcon name={notificationIcon(notification.kind)} color={notificationColor(notification.kind)} backgroundColor={notificationBackground(notification.kind, theme)} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: theme.text, fontSize: 15, fontWeight: '900' }}>{notification.title}</Text>
                  <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18 }}>{notification.body}</Text>
                  <Text style={{ color: theme.subtle, fontSize: 11 }}>{formatDateTimeLabel(notification.timestamp)}</Text>
                </View>
                {!notification.read ? (
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: theme.accent,
                      marginTop: 4,
                    }}
                  />
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {!notification.read ? (
                  <Button
                    label="Mark read"
                    onPress={() => markRead(notification.id)}
                    secondary
                    compact
                    style={{ flex: 1 }}
                  />
                ) : null}
                <Button
                  label="Open"
                  onPress={() => {
                    markRead(notification.id);
                    router.push(`/notification/${notification.id}`);
                  }}
                  compact
                  style={{ flex: 1, backgroundColor: theme.accent }}
                />
                <Button
                  label="Delete"
                  onPress={() => removeNotification(notification.id)}
                  secondary
                  compact
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </Swipeable>
        ))
      ) : (
        <EmptyState
          icon="notifications-outline"
          title="No notifications yet"
          body="Transaction saves, reminders, and report events will appear here."
        />
      )}
    </ScrollView>
  );
}

function notificationIcon(kind: 'transaction' | 'report' | 'reminder' | 'system') {
  if (kind === 'transaction') return 'cash-outline';
  if (kind === 'report') return 'document-text-outline';
  if (kind === 'reminder') return 'alarm-outline';
  return 'notifications-outline';
}

function notificationColor(kind: 'transaction' | 'report' | 'reminder' | 'system') {
  if (kind === 'transaction') return '#10B981';
  if (kind === 'report') return '#8B5CF6';
  if (kind === 'reminder') return '#F59E0B';
  return '#3B82F6';
}

function notificationBackground(kind: 'transaction' | 'report' | 'reminder' | 'system', theme: ReturnType<typeof useAppTheme>) {
  const color = notificationColor(kind);
  return `${color}18` || theme.notificationBackground;
}
