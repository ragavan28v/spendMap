import { AppNotificationItem, NoteItem } from '@/types';

export async function initializeNotifications() {
  return;
}

export async function requestNotificationPermission() {
  return false;
}

export async function cancelScheduledNotification() {
  return;
}

export async function scheduleReminderNotification() {
  return null;
}

export async function cancelAllReminderNotifications() {
  return;
}

export async function observeForegroundNotifications() {
  return () => {};
}

export async function getLastNotificationResponse() {
  return null;
}

export function buildDueReminderNotifications(notes: NoteItem[], notifications: AppNotificationItem[]) {
  const existingReminderNoteIds = new Set(
    notifications.filter((item) => item.kind === 'reminder' && item.noteId).map((item) => item.noteId as string)
  );

  return notes
    .filter((note) => note.type === 'reminder' && note.reminderAt && note.reminderAt <= Date.now())
    .filter((note) => !existingReminderNoteIds.has(note.id) && !note.reminderNotificationId)
    .map<AppNotificationItem>((note) => ({
      id: `local-reminder-${note.id}`,
      kind: 'reminder',
      title: `Reminder: ${note.title}`,
      body: note.content || 'You asked SpendMap to remind you.',
      timestamp: Date.now(),
      read: false,
      noteId: note.id,
      route: '/notifications',
    }));
}
