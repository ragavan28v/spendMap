import { getCurrentFirebaseUserId } from '@/services/firebase/auth';
import { persistNotes } from '@/services/persistence';
import { saveOrQueueNote } from '@/services/sync/offlineQueue';
import { useUserStore } from '@/store/userStore';
import { NoteItem } from '@/types';
import { create } from 'zustand';

export interface NoteState {
  notes: NoteItem[];
  setNotes: (notes: NoteItem[]) => void;
  upsertNote: (note: NoteItem) => void;
  togglePinned: (noteId: string) => void;
}

export const useNoteStore = create<NoteState>()((set) => ({
  notes: [],

  setNotes: (notes) => {
    set((state) => {
      persistNotes(notes);
      return {
        ...state,
        notes,
      };
    });
  },

  upsertNote: (note) => {
    set((state) => {
      const exists = state.notes.some((item) => item.id === note.id);
      const notes = exists
        ? state.notes.map((item) => (item.id === note.id ? note : item))
        : [note, ...state.notes];
      const sortedNotes = notes.sort((first, second) => {
        if (first.pinned !== second.pinned) {
          return first.pinned ? -1 : 1;
        }
        return second.updatedAt - first.updatedAt;
      });
      persistNotes(sortedNotes);
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
      persistNotes(notes);
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
}));

