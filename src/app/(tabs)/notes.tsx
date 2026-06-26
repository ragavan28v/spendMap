import { AppIcon } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { SelectionChip } from '@/components/ui/selection-chip';
import { Palette } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
import { scheduleReminderNotification } from '@/services/notifications/notifications';
import { showFeedbackDialog } from '@/store/feedbackDialogStore';
import { useNoteStore } from '@/store/noteStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useUserStore } from '@/store/userStore';
import { NoteItem } from '@/types';
import { formatDateLabel, formatDateTimeLabel } from '@/utils/formatters';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NoteType = NoteItem['type'];

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const notes = useNoteStore((state) => state.notes);
  const upsertNote = useNoteStore((state) => state.upsertNote);
  const togglePinned = useNoteStore((state) => state.togglePinned);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const notificationsEnabled = useUserStore((state) => state.settings.notificationsEnabled);
  const deleteNote = useNoteStore((state) => state.deleteNote);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<NoteType>('quick');
  const [reminderDateText, setReminderDateText] = useState(() => toDateInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [reminderTimeText, setReminderTimeText] = useState(() => toTimeInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [error, setError] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const reminderPreview = useMemo(() => {
    const parsed = parseReminderInputs(reminderDateText, reminderTimeText);
    return parsed ? formatDateTimeLabel(parsed.getTime()) : 'Invalid date or time';
  }, [reminderDateText, reminderTimeText]);

  const upcomingReminders = useMemo(() => {
    return notes
      .filter((note) => note.type === 'reminder' && note.reminderAt && note.reminderAt > Date.now())
      .sort((first, second) => (first.reminderAt ?? 0) - (second.reminderAt ?? 0))
      .slice(0, 3);
  }, [notes]);

  async function handleSave() {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle && !trimmedContent) return;

    const timestamp = Date.now();
    const noteId = editingNoteId ?? `note-${timestamp}`;
    const selectedTitle = trimmedTitle || 'Untitled note';
    const isReminder = type === 'reminder';
    const reminderDate = isReminder ? parseReminderInputs(reminderDateText, reminderTimeText) : null;

    if (isReminder && !reminderDate) {
      setError('Enter a valid future date and time in YYYY-MM-DD and HH:MM format.');
      return;
    }

    if (isReminder && reminderDate && reminderDate.getTime() <= Date.now()) {
      setError('Pick a future date and time for the reminder.');
      return;
    }

    const reminderMessage = isReminder
      ? `Reminder set for ${formatDateTimeLabel(reminderDate!.getTime())}.`
      : 'Your note is ready and saved.';

    const note: NoteItem = {
      id: noteId,
      title: selectedTitle,
      content: trimmedContent,
      type,
      pinned: false,
      reminderAt: isReminder ? reminderDate!.getTime() : undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setError(null);

    let reminderNotificationId: string | undefined;

    if (isReminder && notificationsEnabled) {
      try {
        reminderNotificationId = (await scheduleReminderNotification({
          title: `Reminder: ${selectedTitle}`,
          body: trimmedContent || 'You asked SpendMap to remind you.',
          triggerAt: reminderDate!,
          noteId,
        })) ?? undefined;
      } catch (scheduleError) {
        console.warn('Unable to schedule reminder notification.', scheduleError);
      }
    }

    upsertNote({
      ...note,
      reminderNotificationId,
    });

    addNotification({
      id: `notification-${timestamp}`,
      kind: isReminder ? 'reminder' : 'system',
      title: isReminder ? 'Reminder saved' : 'Note saved',
      body: isReminder
        ? notificationsEnabled && reminderNotificationId
          ? reminderMessage
          : `${reminderMessage} System notifications are currently off.`
        : 'Your note has been stored locally.',
      timestamp,
      read: false,
      noteId,
      route: '/notifications',
    });

    setTitle('');
    setContent('');
    setType('quick');
    setReminderDateText(toDateInput(new Date(Date.now() + 60 * 60 * 1000)));
    setReminderTimeText(toTimeInput(new Date(Date.now() + 60 * 60 * 1000)));
    setEditingNoteId(null);
    showFeedbackDialog({
      title: isReminder ? 'Reminder saved' : 'Note saved',
      message: isReminder
        ? 'Your reminder is stored and will appear in the inbox when it becomes due.'
        : 'Your note is ready and stored safely.',
      variant: 'success',
    });
  }

  function handleEdit(note: NoteItem) {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setType(note.type);
    if (note.reminderAt) {
      const reminderDate = new Date(note.reminderAt);
      setReminderDateText(toDateInput(reminderDate));
      setReminderTimeText(toTimeInput(reminderDate));
    } else {
      const fallback = new Date(Date.now() + 60 * 60 * 1000);
      setReminderDateText(toDateInput(fallback));
      setReminderTimeText(toTimeInput(fallback));
    }
  }

  function handleDelete(noteId: string) {
    showFeedbackDialog({
      title: 'Delete note?',
      message: 'This will remove the note and any reminder from the inbox.',
      variant: 'warning',
      primaryLabel: 'Delete',
      secondaryLabel: 'Cancel',
      onPrimary: () => {
        deleteNote(noteId);
        if (editingNoteId === noteId) {
          setEditingNoteId(null);
          setTitle('');
          setContent('');
          setType('quick');
        }
      },
    });
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 110, gap: 16 }}
    >
      <View style={{ gap: 6 }}>
        <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>Money notes</Text>
        <Text style={{ color: theme.muted, fontSize: 13 }}>Goals, reminders, budgets, and quick ideas.</Text>
      </View>

      <Card style={{ padding: 16, gap: 14 }}>
        <Input label="Title" value={title} onChangeText={setTitle} placeholder="Emergency fund, rent reminder..." />
        <Input
          label="Note"
          value={content}
          onChangeText={setContent}
          placeholder="Write your plan..."
          multiline
          numberOfLines={4}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {(['quick', 'goal', 'budget', 'reminder'] as NoteType[]).map((option) => (
            <SelectionChip
              key={option}
              label={option}
              icon={noteIcon(option)}
              selected={type === option}
              color={Palette.purple}
              onPress={() => setType(option)}
            />
          ))}
        </View>
      </Card>

      {type === 'reminder' ? (
        <Card style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>Reminder time</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>
            Enter a date and time in plain text so it works smoothly on every build.
          </Text>
          <Input label="Date" value={reminderDateText} onChangeText={setReminderDateText} placeholder="YYYY-MM-DD" />
          <Input label="Time" value={reminderTimeText} onChangeText={setReminderTimeText} placeholder="HH:MM" />
          <Text style={{ color: theme.subtle, fontSize: 11 }}>Preview: {reminderPreview}</Text>
        </Card>
      ) : null}

      {error ? <Text style={{ color: Palette.orange, fontWeight: '700' }}>{error}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {editingNoteId ? (
          <Button
            label="Cancel edit"
            icon="close-outline"
            onPress={() => {
              setEditingNoteId(null);
              setTitle('');
              setContent('');
              setType('quick');
              const fallback = new Date(Date.now() + 60 * 60 * 1000);
              setReminderDateText(toDateInput(fallback));
              setReminderTimeText(toTimeInput(fallback));
            }}
            secondary
            compact
            style={{ flex: 1 }}
          />
        ) : null}
        <Button
          label={editingNoteId ? 'Update note' : 'Save note'}
          icon="document-text-outline"
          onPress={handleSave}
          style={{ flex: 1 }}
        />
      </View>

      <Card style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>Upcoming reminders</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>{upcomingReminders.length} queued</Text>
        </View>
        {upcomingReminders.length ? (
          upcomingReminders.map((note) => (
            <View key={note.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <AppIcon name="alarm-outline" color={Palette.purple} backgroundColor="rgba(139, 92, 246, 0.18)" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800' }}>{note.title}</Text>
                <Text style={{ color: theme.muted, fontSize: 12 }}>
                  {note.reminderAt ? formatDateTimeLabel(note.reminderAt) : 'No reminder time'}
                </Text>
              </View>
              <Button label="Edit" onPress={() => handleEdit(note)} secondary compact />
            </View>
          ))
        ) : (
          <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18 }}>
            No upcoming reminders. Add one from the reminder note type to see it here.
          </Text>
        )}
      </Card>

      {notes.length ? (
        notes.map((note) => (
          <Card
            key={note.id}
            style={{ padding: 16, gap: 10, borderColor: note.pinned ? `${Palette.purple}70` : undefined }}
          >
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <AppIcon name={noteIcon(note.type)} color={Palette.purple} backgroundColor="rgba(139, 92, 246, 0.18)" />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>{note.title}</Text>
                <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 19 }}>{note.content}</Text>
                <Text style={{ color: theme.subtle, fontSize: 11 }}>
                  {formatDateLabel(note.updatedAt)} • {note.type}
                  {note.reminderAt ? ` • Reminds ${formatDateTimeLabel(note.reminderAt)}` : ''}
                </Text>
              </View>
              <Pressable onPress={() => togglePinned(note.id)}>
                <AppIcon name={note.pinned ? 'pin' : 'pin-outline'} color={note.pinned ? Palette.purple : theme.muted} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Edit" icon="create-outline" onPress={() => handleEdit(note)} secondary compact style={{ flex: 1 }} />
              <Button
                label="Delete"
                icon="trash-outline"
                onPress={() => handleDelete(note.id)}
                secondary
                compact
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        ))
      ) : (
        <EmptyState icon="document-text-outline" title="No notes yet" body="Save your first goal, budget plan, or payment reminder." />
      )}
    </ScrollView>
  );
}

function noteIcon(type: NoteType) {
  if (type === 'goal') return 'trophy-outline';
  if (type === 'budget') return 'pie-chart-outline';
  if (type === 'reminder') return 'alarm-outline';
  return 'sparkles-outline';
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toTimeInput(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseReminderInputs(dateText: string, timeText: string) {
  const dateParts = dateText.split('-').map(Number);
  const timeParts = timeText.split(':').map(Number);
  if (dateParts.length !== 3 || timeParts.length !== 2) return null;

  const [year, month, day] = dateParts;
  const [hour, minute] = timeParts;
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date;
}
