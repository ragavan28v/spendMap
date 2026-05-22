import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot } from 'expo-router';
import React, { useEffect } from 'react';
import { AppState, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { defaultWallets } from '@/constants/wallets';
import { getCurrentFirebaseUserId, observeAuthState } from '@/services/firebase/auth';
import {
  fetchUserCategories,
  fetchUserNotes,
  fetchUserSettings,
  fetchUserTransactions,
  fetchUserWallets,
  saveWallet,
} from '@/services/firebase/firestore';
import { loadPersistedState } from '@/services/persistence';
import { flushSyncQueue, saveOrQueueProfile } from '@/services/sync/offlineQueue';
import { useCategoryStore } from '@/store/categoryStore';
import { useNoteStore } from '@/store/noteStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useUserStore } from '@/store/userStore';
import { useWalletStore } from '@/store/walletStore';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const initializeWallets = useWalletStore((state) => state.initializeWallets);
  const selectWallet = useWalletStore((state) => state.selectWallet);
  const initializeCategories = useCategoryStore((state) => state.initializeCategories);
  const setTransactions = useTransactionStore((state) => state.setTransactions);
  const setNotes = useNoteStore((state) => state.setNotes);
  const setSettings = useUserStore((state) => state.setSettings);
  const setProfile = useUserStore((state) => state.setProfile);
  const clearProfile = useUserStore((state) => state.clearProfile);

  useEffect(() => {
    async function hydrate() {
      const persisted = await loadPersistedState();
      if (persisted.wallets?.length) {
        initializeWallets(persisted.wallets);
        if (persisted.selectedWalletId) {
          selectWallet(persisted.selectedWalletId);
        }
      }
      if (persisted.categories?.length) {
        initializeCategories(persisted.categories);
      }
      if (persisted.settings) {
        setSettings(persisted.settings);
      }
    }

    hydrate();
  }, [
    initializeWallets,
    initializeCategories,
    selectWallet,
    setTransactions,
    setSettings,
    setProfile,
    setNotes,
  ]);

  useEffect(() => {
    const unsubscribe = observeAuthState((user) => {
      if (user) {
        const profile = {
          uid: user.uid,
          name: user.displayName ?? 'SpendWise user',
          email: user.email ?? '',
          photoURL: user.photoURL ?? undefined,
          currency: 'INR',
          createdAt: user.metadata.creationTime ? Date.parse(user.metadata.creationTime) : Date.now(),
        };

        setProfile(profile);
        saveOrQueueProfile(user.uid, profile);
        initializeWallets([]);
        initializeCategories([]);
        setTransactions([]);
        setNotes([]);

        (async () => {
          await flushSyncQueue(user.uid);
          const [walletsResult, categoriesResult, transactionsResult, settingsResult, notesResult] =
            await Promise.allSettled([
              fetchUserWallets(user.uid),
              fetchUserCategories(user.uid),
              fetchUserTransactions(user.uid),
              fetchUserSettings(user.uid),
              fetchUserNotes(user.uid),
            ]);

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
            setSettings(settingsResult.value);
          } else if (settingsResult.status === 'rejected') {
            console.warn('Unable to sync settings from Firebase.', settingsResult.reason);
          }
          if (notesResult.status === 'fulfilled') {
            setNotes(notesResult.value);
          } else {
            console.warn('Unable to sync notes from Firebase.', notesResult.reason);
          }
        })();
      } else {
        clearProfile();
      }
    });

    return unsubscribe;
  }, [
    setProfile,
    clearProfile,
    initializeWallets,
    initializeCategories,
    setTransactions,
    setSettings,
    setNotes,
  ]);

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

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        flushForCurrentUser();
      }
    });

    flushForCurrentUser();

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Slot />
    </ThemeProvider>
  );
}
