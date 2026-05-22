import { getCurrentFirebaseUserId } from '@/services/firebase/auth';
import { persistSettings, persistUserProfile } from '@/services/persistence';
import { saveOrQueueSettings } from '@/services/sync/offlineQueue';
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
  biometricEnabled: false,
  notificationsEnabled: true,
};

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  settings: initialSettings,
  isAuthenticated: false,

    setProfile: (profile) => {
      set((state) => {
        persistUserProfile(profile);
        return {
          ...state,
          profile,
          isAuthenticated: true,
        };
      });
    },

    clearProfile: () => {
      set((state) => {
        persistUserProfile(null);
        return {
          ...state,
          profile: null,
          isAuthenticated: false,
        };
      });
    },

    setSettings: (settings) => {
      set((state) => {
        const nextSettings = {
          ...state.settings,
          ...settings,
        };
        persistSettings(nextSettings);
        const userId = state.profile?.uid ?? getCurrentFirebaseUserId();
        if (userId) {
          saveOrQueueSettings(userId, nextSettings);
        }
        return {
          ...state,
          settings: nextSettings,
        };
      });
    },
  }));

