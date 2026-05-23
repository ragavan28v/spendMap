import { getCurrentFirebaseUserId } from '@/services/firebase/auth';
import { cancelScheduledNotification } from '@/services/notifications/notifications';
import { saveOrQueueNote } from '@/services/sync/offlineQueue';
import { useNotificationStore } from '@/store/notificationStore';
import { useUserStore } from '@/store/userStore';
import { NoteItem } from '@/types';
import { create } from 'zustand';

export interface NoteState {
  notes: NoteItem[];
  setNotes: (notes: NoteItem[]) => void;
  upsertNote: (note: NoteItem) => void;
  togglePinned: (noteId: string) => void;
  deleteNote: (noteId: string) => void;
}

export const useNoteStore = create<NoteState>()((set) => ({
  notes: [],

  setNotes: (notes) => {
    set((state) => {
      return {
        ...state,
        notes,
      };
    });
  },

  upsertNote: (note) => {
    set((state) => {
      const existingNote = state.notes.find((item) => item.id === note.id);
      const exists = Boolean(existingNote);
      if (existingNote?.reminderNotificationId && existingNote.reminderNotificationId !== note.reminderNotificationId) {
        void cancelScheduledNotification(existingNote.reminderNotificationId);
      }
      const notes = exists
        ? state.notes.map((item) => (item.id === note.id ? note : item))
        : [note, ...state.notes];
      const sortedNotes = notes.sort((first, second) => {
        if (first.pinned !== second.pinned) {
          return first.pinned ? -1 : 1;
        }
        return second.updatedAt - first.updatedAt;
      });
      const userId = useUserStore.getState().profile?.uid ?? getCurrentFirebaseUserId();
      if (userId) {
        saveOrQueueNote(userId, note);
      }
      return {
        ...state,
        notes: sortedNotes,
      };
    });
  },

    togglePinned: (noteId) => {
      set((state) => {
        const notes = state.notes.map((note) =>
          note.id === noteId ? { ...note, pinned: !note.pinned, updatedAt: Date.now() } : note
        );
        const userId = useUserStore.getState().profile?.uid ?? getCurrentFirebaseUserId();
        const note = notes.find((item) => item.id === noteId);
        if (userId && note) {
          saveOrQueueNote(userId, note);
      }
      return {
        ...state,
        notes,
      };
    });
  },

  deleteNote: (noteId) => {
    set((state) => {
      const note = state.notes.find((item) => item.id === noteId);
      if (note?.reminderNotificationId) {
        void cancelScheduledNotification(note.reminderNotificationId);
      }

      const notes = state.notes.filter((item) => item.id !== noteId);
      useNotificationStore.getState().removeNotificationsByNoteId(noteId);

      return {
        ...state,
        notes,
      };
    });
  },
}));

