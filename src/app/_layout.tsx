import { DarkTheme, DefaultTheme, Theme, ThemeProvider } from '@react-navigation/native';
import Constants from 'expo-constants';
import { Redirect, Slot, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { User } from 'firebase/auth';
import React, { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppLockScreen } from '@/components/security/app-lock-screen';
import { FeedbackDialog } from '@/components/ui/feedback-dialog';
import { defaultWallets } from '@/constants/wallets';
import { useAppTheme } from '@/hooks/use-app-theme';
import { configureGoogleSignIn, getCurrentFirebaseUserId, observeAuthState, restoreFirebaseAuth } from '@/services/firebase/auth';
import {
    fetchUserCategories,
    fetchUserNotes,
    fetchUserNotifications,
    fetchUserProfile,
    fetchUserSettings,
    fetchUserTransactions,
    fetchUserWallets,
    saveWallet,
} from '@/services/firebase/firestore';
import {
    buildDueReminderNotifications,
    cancelAllReminderNotifications,
    initializeNotifications,
} from '@/services/notifications/notifications';
import {
    clearAppLockBackgroundAt,
    getAppLockBackgroundAt,
    hasPin,
    setAppLockBackgroundAt,
} from '@/services/security/app-lock';
import { flushSyncQueue, saveOrQueueNotification, saveOrQueueProfile } from '@/services/sync/offlineQueue';
import { getStoredThemePreference } from '@/services/theme-preference';
import { useCategoryStore } from '@/store/categoryStore';
import { useNoteStore } from '@/store/noteStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useUserStore } from '@/store/userStore';
import { useWalletStore } from '@/store/walletStore';
import { AppNotificationItem } from '@/types';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  const theme = useAppTheme();
  const pathname = usePathname();
  const initializeWallets = useWalletStore((state) => state.initializeWallets);
  const initializeCategories = useCategoryStore((state) => state.initializeCategories);
  const setTransactions = useTransactionStore((state) => state.setTransactions);
  const setNotes = useNoteStore((state) => state.setNotes);
  const setSettings = useUserStore((state) => state.setSettings);
  const settings = useUserStore((state) => state.settings);
  const setProfile = useUserStore((state) => state.setProfile);
  const clearProfile = useUserStore((state) => state.clearProfile);
  const hydrateNotifications = useNotificationStore((state) => state.hydrateNotifications);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const notifications = useNotificationStore((state) => state.notifications);
  const notes = useNoteStore((state) => state.notes);
  const [lockReady, setLockReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [authRestored, setAuthRestored] = useState(false);
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const wasBackgroundedRef = useRef(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const storedTheme = await getStoredThemePreference();
        if (!active) {
          return;
        }
        if (storedTheme) {
          setSettings({ theme: storedTheme });
        }
      } catch (error) {
        console.warn('Unable to resolve stored theme preference.', error);
      } finally {
        if (active) {
          setThemeReady(true);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [setSettings]);

  useEffect(() => {
    void initializeNotifications();
  }, []);

  useEffect(() => {
    let active = true;
    const fallback = setTimeout(() => {
      if (active) {
        setLockReady(true);
      }
    }, 1200);

    void (async () => {
      try {
        const storedPinExists = await hasPin();
        const backgroundAt = await getAppLockBackgroundAt();
        if (!active) return;
        if (settings.appLockEnabled && !storedPinExists) {
          setSettings({ appLockEnabled: false });
        }
        setIsLocked(Boolean(settings.appLockEnabled && storedPinExists && backgroundAt));
      } catch (error) {
        console.warn('Unable to resolve app lock state.', error);
        if (active) {
          setIsLocked(false);
        }
      } finally {
        if (active) {
          setLockReady(true);
          clearTimeout(fallback);
        }
      }
    })();

    return () => {
      active = false;
      clearTimeout(fallback);
    };
  }, [settings.appLockEnabled, setSettings]);

  useEffect(() => {
    if (!settings.notificationsEnabled) {
      void cancelAllReminderNotifications();
    }
  }, [settings.notificationsEnabled]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        if (settings.appLockEnabled) {
          void setAppLockBackgroundAt(Date.now());
        }
        wasBackgroundedRef.current = true;
      } else if (nextState === 'active' && wasBackgroundedRef.current) {
        void clearAppLockBackgroundAt();
        wasBackgroundedRef.current = false;
      }
    });

    return () => {
      subscription.remove();
    };
  }, [settings.appLockEnabled]);

  useEffect(() => {
    const manifest = Constants.expoConfig ?? Constants.manifest;
    const extra = (manifest as { extra?: Record<string, string> })?.extra ?? null;
    const googleWebClientId = extra?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const googleIosClientId = extra?.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined;

    if (!googleWebClientId) {
      return;
    }

    configureGoogleSignIn({ webClientId: googleWebClientId, iosClientId: googleIosClientId });
    void restoreFirebaseAuth();
  }, []);

  useEffect(() => {
    if (!settings.notificationsEnabled) {
      return;
    }

    const dueReminders = buildDueReminderNotifications(notes, notifications);
    if (!dueReminders.length) {
      return;
    }

    dueReminders.forEach((notification) => {
      addNotification(notification);
      const note = useNoteStore.getState().notes.find((item) => item.id === notification.noteId);
      if (note) {
        useNoteStore.getState().upsertNote({
          ...note,
          reminderNotificationId: notification.id,
        });
      }
    });
  }, [addNotification, notes, notifications, settings.notificationsEnabled]);

  useEffect(() => {
    if (!authRestored) {
      return;
    }

    let active = true;
    const unsubscribe = observeAuthState((user) => {
      setSessionUser(user);
      setAuthResolved(true);

      if (user) {
        const loginThemePreference = useUserStore.getState().settings.theme;
        const existingProfile = useUserStore.getState().profile;
        const existingProfileMatchesUser = existingProfile?.uid === user.uid;
        const profile = {
          uid: user.uid,
          name: existingProfileMatchesUser
            ? existingProfile?.name ?? user.displayName ?? 'SpendWise user'
            : user.displayName ?? 'SpendWise user',
          email: user.email ?? '',
          photoURL: existingProfileMatchesUser
            ? existingProfile?.photoURL ?? user.photoURL ?? undefined
            : user.photoURL ?? undefined,
          currency: 'INR',
          createdAt: existingProfileMatchesUser
            ? existingProfile?.createdAt ?? (user.metadata.creationTime ? Date.parse(user.metadata.creationTime) : Date.now())
            : user.metadata.creationTime
              ? Date.parse(user.metadata.creationTime)
              : Date.now(),
        };

        setProfile(profile);
        initializeWallets([]);
        initializeCategories([]);
        setTransactions([]);
        setNotes([]);
        hydrateNotifications([]);
        setSessionHydrated(true);

        void (async () => {
          try {
            await flushSyncQueue(user.uid);
            const [
              profileResult,
              walletsResult,
              categoriesResult,
              transactionsResult,
              settingsResult,
              notesResult,
              notificationsResult,
            ] = await Promise.allSettled([
              fetchUserProfile(user.uid),
              fetchUserWallets(user.uid),
              fetchUserCategories(user.uid),
              fetchUserTransactions(user.uid),
              fetchUserSettings(user.uid),
              fetchUserNotes(user.uid),
              fetchUserNotifications<AppNotificationItem>(user.uid),
            ]);

            if (!active) {
              return;
            }

            if (profileResult.status === 'fulfilled' && profileResult.value) {
              setProfile({
                ...profile,
                ...profileResult.value,
                uid: user.uid,
              });
            } else {
              void saveOrQueueProfile(user.uid, profile);
            }

            if (walletsResult.status === 'fulfilled') {
              initializeWallets(walletsResult.value);
              const remoteWalletIds = new Set(walletsResult.value.map((wallet) => wallet.id));
              const missingDefaultWallets = defaultWallets.filter((wallet) => !remoteWalletIds.has(wallet.id));
              if (missingDefaultWallets.length) {
                const seedResults = await Promise.allSettled(
                  missingDefaultWallets.map((wallet) => saveWallet(user.uid, wallet))
                );
                seedResults.forEach((result) => {
                  if (result.status === 'rejected') {
                    console.warn('Unable to seed default wallet in Firebase.', result.reason);
                  }
                });
              }
            } else {
              console.warn('Unable to sync wallets from Firebase.', walletsResult.reason);
            }
            if (categoriesResult.status === 'fulfilled') {
              initializeCategories(categoriesResult.value);
            } else {
              console.warn('Unable to sync categories from Firebase.', categoriesResult.reason);
            }
            if (transactionsResult.status === 'fulfilled') {
              setTransactions(transactionsResult.value);
            } else {
              console.warn('Unable to sync transactions from Firebase.', transactionsResult.reason);
            }
            if (settingsResult.status === 'fulfilled' && settingsResult.value) {
              setSettings({
                ...settingsResult.value,
                theme: loginThemePreference,
              });
            } else if (settingsResult.status === 'fulfilled') {
              setSettings({ theme: loginThemePreference });
            } else if (settingsResult.status === 'rejected') {
              console.warn('Unable to sync settings from Firebase.', settingsResult.reason);
            }
            if (notesResult.status === 'fulfilled') {
              setNotes(notesResult.value);
            } else {
              console.warn('Unable to sync notes from Firebase.', notesResult.reason);
            }

            const remoteNotifications = notificationsResult.status === 'fulfilled' ? notificationsResult.value : [];
            if (notificationsResult.status === 'rejected') {
              console.warn('Unable to sync notifications from Firebase.', notificationsResult.reason);
            }
            const localNotifications = useNotificationStore.getState().notifications;
            const mergedNotifications = mergeNotifications(localNotifications, remoteNotifications);
            hydrateNotifications(mergedNotifications);
            const remoteNotificationIds = new Set(remoteNotifications.map((notification) => notification.id));
            const localOnlyNotifications = mergedNotifications.filter((notification) => !remoteNotificationIds.has(notification.id));
            if (localOnlyNotifications.length) {
              const uploads = await Promise.allSettled(
                localOnlyNotifications.map((notification) => saveOrQueueNotification(user.uid, notification))
              );
              uploads.forEach((result) => {
                if (result.status === 'rejected') {
                  console.warn('Unable to persist notification to Firebase.', result.reason);
                }
              });
            }
          } catch (error) {
            console.warn('Unable to hydrate app data on startup.', error);
          }
        })();
      } else {
        clearProfile();
        setIsLocked(false);
        setSessionHydrated(true);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [
    authRestored,
    setProfile,
    clearProfile,
    initializeWallets,
    initializeCategories,
    setTransactions,
    setSettings,
    setNotes,
    hydrateNotifications,
  ]);

  useEffect(() => {
    let active = true;
    const manifest = Constants.expoConfig ?? Constants.manifest;
    const extra = (manifest as { extra?: Record<string, string> })?.extra ?? null;
    const googleWebClientId = extra?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const googleIosClientId = extra?.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined;

    async function initializeGoogleAuth() {
      if (!googleWebClientId) {
        if (active) {
          setAuthRestored(true);
        }
        return;
      }

      configureGoogleSignIn({ webClientId: googleWebClientId, iosClientId: googleIosClientId });
      try {
        await restoreFirebaseAuth();
      } catch (error) {
        console.warn('Silent auth restore failed.', error);
      } finally {
        if (active) {
          setAuthRestored(true);
        }
      }
    }

    void initializeGoogleAuth();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    async function flushForCurrentUser() {
      const userId = useUserStore.getState().profile?.uid ?? getCurrentFirebaseUserId();
      if (userId) {
        await flushSyncQueue(userId);
      }
    }

    const interval = setInterval(() => {
      flushForCurrentUser();
    }, 15000);

    flushForCurrentUser();

    return () => {
      clearInterval(interval);
    };
  }, []);

  const navigationTheme: Theme = {
    ...(theme.themeMode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.themeMode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.background,
      card: theme.surface,
      border: theme.border,
      text: theme.text,
      primary: theme.accent,
      notification: theme.accent,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style={theme.themeMode === 'dark' ? 'light' : 'dark'} />
        <AnimatedSplashOverlay />
        <FeedbackDialog />
        {!themeReady || !authResolved || !authRestored || (sessionUser && !sessionHydrated) || !lockReady ? (
          <LoadingShell />
        ) : !sessionUser ? pathname === '/login' ? (
          <Slot />
        ) : (
          <Redirect href="/login" />
        ) : isLocked && settings.appLockEnabled ? (
          <AppLockScreen
            onUnlock={async () => {
              await clearAppLockBackgroundAt();
              wasBackgroundedRef.current = false;
              setIsLocked(false);
            }}
          />
        ) : pathname === '/login' ? (
          <Redirect href="/dashboard" />
        ) : (
          <Slot />
        )}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function LoadingShell() {
  return (
    <AnimatedSplashOverlay />
  );
}

function mergeNotifications(localNotifications: AppNotificationItem[], remoteNotifications: AppNotificationItem[]) {
  const byId = new Map<string, AppNotificationItem>();
  remoteNotifications.forEach((notification) => {
    byId.set(notification.id, notification);
  });
  localNotifications.forEach((notification) => {
    byId.set(notification.id, notification);
  });
  return Array.from(byId.values()).sort((first, second) => second.timestamp - first.timestamp);
}
