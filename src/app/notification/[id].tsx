import { AppIcon } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useNotificationStore } from '@/store/notificationStore';
import { formatDateTimeLabel } from '@/utils/formatters';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const notification = useNotificationStore((state) => state.notifications.find((item) => item.id === id));
  const markRead = useNotificationStore((state) => state.markRead);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  const accent = useMemo(() => notificationColor(notification?.kind ?? 'system'), [notification?.kind]);

  if (!notification) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 110, gap: 16 }}
      >
        <Card style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '900' }}>Notification not found</Text>
          <Text style={{ color: theme.muted, fontSize: 13 }}>
            This item may have been deleted or already cleared.
          </Text>
          <Button label="Back to inbox" onPress={() => router.replace('/notifications')} secondary />
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 110, gap: 16 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <Button label="Back" icon="arrow-back-outline" onPress={() => router.back()} secondary compact />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 26, fontWeight: '900' }}>Notification</Text>
            <Text style={{ color: theme.muted, fontSize: 13 }}>A closer look at this app event.</Text>
          </View>
        </View>
      </View>

      <Card style={{ padding: 16, gap: 14, borderColor: accent }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <AppIcon name={notificationIcon(notification.kind)} color={accent} backgroundColor={`${accent}18`} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '900' }}>{notification.title}</Text>
            <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 19 }}>{notification.body}</Text>
            <Text style={{ color: theme.subtle, fontSize: 11 }}>{formatDateTimeLabel(notification.timestamp)}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {!notification.read ? (
            <Button
              label="Mark read"
              onPress={() => markRead(notification.id)}
              secondary
              compact
              style={{ flexGrow: 1, minWidth: 140 }}
            />
          ) : null}
          <Button
            label="Delete"
            onPress={() => {
              removeNotification(notification.id);
              router.replace('/notifications');
            }}
            secondary
            compact
            style={{ flexGrow: 1, minWidth: 140 }}
          />
        </View>
      </Card>

      <Card style={{ padding: 16, gap: 12 }}>
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>Related action</Text>
        <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 19 }}>
          {relatedActionText(notification.kind)}
        </Text>
        <Button
          label={relatedActionLabel(notification.kind)}
          onPress={() => {
            markRead(notification.id);
            router.push(relatedActionRoute(notification.kind));
          }}
        />
      </Card>

      {notification.noteId ? (
        <Card style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>Reminder link</Text>
          <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 19 }}>
            This reminder is connected to a note, so you can edit or delete it from the Notes tab.
          </Text>
          <Button label="Open Notes" onPress={() => router.push('/notes')} secondary />
        </Card>
      ) : null}
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

function relatedActionText(kind: 'transaction' | 'report' | 'reminder' | 'system') {
  if (kind === 'transaction') return 'Go to History to see the transaction that triggered this notification.';
  if (kind === 'report') return 'Open the report generator to create another export or change the date range.';
  if (kind === 'reminder') return 'Open Notes to update or delete the reminder.';
  return 'This is a general system notification from the app.';
}

function relatedActionLabel(kind: 'transaction' | 'report' | 'reminder' | 'system') {
  if (kind === 'transaction') return 'Open History';
  if (kind === 'report') return 'Open Reports';
  if (kind === 'reminder') return 'Open Notes';
  return 'Go Home';
}

function relatedActionRoute(kind: 'transaction' | 'report' | 'reminder' | 'system') {
  if (kind === 'transaction') return '/history';
  if (kind === 'report') return '/report';
  if (kind === 'reminder') return '/notes';
  return '/dashboard';
}
