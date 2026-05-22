import { AppIcon } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { SelectionChip } from '@/components/ui/selection-chip';
import { Palette } from '@/constants/design';
import { useNoteStore } from '@/store/noteStore';
import { NoteItem } from '@/types';
import { formatDateLabel } from '@/utils/formatters';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NoteType = NoteItem['type'];

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const notes = useNoteStore((state) => state.notes);
  const upsertNote = useNoteStore((state) => state.upsertNote);
  const togglePinned = useNoteStore((state) => state.togglePinned);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<NoteType>('quick');

  function handleSave() {
    if (!title.trim() && !content.trim()) return;
    const timestamp = Date.now();
    upsertNote({
      id: `note-${timestamp}`,
      title: title.trim() || 'Untitled note',
      content: content.trim(),
      type,
      pinned: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    setTitle('');
    setContent('');
    setType('quick');
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: Palette.navy }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 110, gap: 16 }}
    >
      <View style={{ gap: 6 }}>
        <Text style={{ color: Palette.text, fontSize: 28, fontWeight: '900' }}>Money notes</Text>
        <Text style={{ color: Palette.muted, fontSize: 13 }}>Goals, reminders, budgets, and quick ideas.</Text>
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
        <Button label="Save note" icon="document-text-outline" onPress={handleSave} />
      </Card>

      {notes.length ? (
        notes.map((note) => (
          <Card key={note.id} style={{ padding: 16, gap: 10, borderColor: note.pinned ? `${Palette.purple}70` : Palette.border }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <AppIcon name={noteIcon(note.type)} color={Palette.purple} backgroundColor="rgba(139, 92, 246, 0.18)" />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ color: Palette.text, fontSize: 16, fontWeight: '900' }}>{note.title}</Text>
                <Text style={{ color: Palette.muted, fontSize: 13, lineHeight: 19 }}>{note.content}</Text>
                <Text style={{ color: Palette.slate, fontSize: 11 }}>{formatDateLabel(note.updatedAt)} • {note.type}</Text>
              </View>
              <Pressable onPress={() => togglePinned(note.id)}>
                <AppIcon name={note.pinned ? 'pin' : 'pin-outline'} color={note.pinned ? Palette.purple : Palette.muted} />
              </Pressable>
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
