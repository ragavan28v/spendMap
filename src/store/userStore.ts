import { getCurrentFirebaseUserId } from '@/services/firebase/auth';
import { saveOrQueueSettings } from '@/services/sync/offlineQueue';
import { saveStoredThemePreference } from '@/services/theme-preference';
import { UserProfile, UserSettings } from '@/types';
import { create } from 'zustand';

export interface UserState {
  profile: UserProfile | null;
  settings: UserSettings;
  isAuthenticated: boolean;
  setProfile: (profile: UserProfile) => void;
  clearProfile: () => void;
  setSettings: (settings: Partial<UserSettings>) => void;
}

const initialSettings: UserSettings = {
  theme: 'system',
  currency: 'INR',
  appLockEnabled: false,
  notificationsEnabled: true,
};

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  settings: initialSettings,
  isAuthenticated: false,
  setProfile: (profile) => {
    set(() => ({
      profile,
      isAuthenticated: true,
    }));
  },
  clearProfile: () => {
    set(() => ({
      profile: null,
      isAuthenticated: false,
    }));
  },
  setSettings: (settings) => {
    set((state) => {
      const nextSettings = {
        ...state.settings,
        ...settings,
      };
      if (settings.theme) {
        void saveStoredThemePreference(settings.theme);
      }
      const userId = state.profile?.uid ?? getCurrentFirebaseUserId();
      if (userId) {
        void saveOrQueueSettings(userId, nextSettings);
      }
      return {
        settings: nextSettings,
      };
    });
  },
}));

