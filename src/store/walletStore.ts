import { defaultWallets, mergeWithDefaultWallets } from '@/constants/wallets';
import { getCurrentFirebaseUserId } from '@/services/firebase/auth';
import { saveOrQueueWallet } from '@/services/sync/offlineQueue';
import { useUserStore } from '@/store/userStore';
import { TransactionRecord, Wallet } from '@/types';
import { create } from 'zustand';

export interface WalletState {
  wallets: Wallet[];
  selectedWalletId: string;
  initializeWallets: (wallets: Wallet[]) => void;
  resetWallets: () => void;
  selectWallet: (walletId: string) => void;
  updateWalletBalance: (walletId: string, amount: number) => void;
  upsertWallet: (wallet: Wallet) => void;
  toggleWallet: (walletId: string) => void;
  applyTransaction: (transaction: TransactionRecord) => void;
  applyTransactionLocal: (transaction: TransactionRecord) => void;
  totalBalance: () => number;
  getWalletById: (walletId: string) => Wallet | undefined;
}

export const useWalletStore = create<WalletState>()((set, get) => ({
    wallets: defaultWallets,
    selectedWalletId: defaultWallets[0].id,

    initializeWallets: (wallets) => {
      const mergedWallets = mergeWithDefaultWallets(wallets);
      const selectedWalletId = mergedWallets.some((wallet) => wallet.id === get().selectedWalletId)
        ? get().selectedWalletId
        : mergedWallets[0].id;
      set((state) => ({
        ...state,
        wallets: mergedWallets,
        selectedWalletId,
      }));
    },

    resetWallets: () => {
      set(() => ({
        wallets: defaultWallets,
        selectedWalletId: defaultWallets[0].id,
      }));
    },

    selectWallet: (walletId) => {
      set((state) => {
        const selected = state.wallets.some((wallet: Wallet) => wallet.id === walletId)
          ? walletId
          : state.selectedWalletId;
        return {
          ...state,
          selectedWalletId: selected,
        };
      });
    },

    updateWalletBalance: (walletId, amount) => {
      set((state) => {
        const wallets = state.wallets.map((wallet: Wallet) =>
          wallet.id === walletId ? { ...wallet, balance: wallet.balance + amount } : wallet
        );
        const userId = useUserStore.getState().profile?.uid ?? getCurrentFirebaseUserId();
        if (userId) {
          const wallet = wallets.find((item) => item.id === walletId);
          if (wallet) {
            saveOrQueueWallet(userId, wallet);
          }
        }
        return {
          ...state,
          wallets,
        };
      });
    },

    upsertWallet: (wallet) => {
      set((state) => {
        const exists = state.wallets.some((item) => item.id === wallet.id);
        const wallets = exists
          ? state.wallets.map((item: Wallet) => (item.id === wallet.id ? wallet : item))
          : [...state.wallets, wallet];
        const userId = useUserStore.getState().profile?.uid ?? getCurrentFirebaseUserId();
        if (userId) {
          saveOrQueueWallet(userId, wallet);
        }
        return {
          ...state,
          wallets,
        };
      });
    },

    toggleWallet: (walletId) => {
      set((state) => {
        const wallets = state.wallets.map((wallet: Wallet) =>
          wallet.id === walletId ? { ...wallet, isEnabled: !wallet.isEnabled } : wallet
        );
        const userId = useUserStore.getState().profile?.uid ?? getCurrentFirebaseUserId();
        const wallet = wallets.find((item) => item.id === walletId);
        if (userId && wallet) {
          saveOrQueueWallet(userId, wallet);
        }
        return {
          ...state,
          wallets,
        };
      });
    },

    applyTransaction: (transaction) => {
      set((state) => {
        const wallets = state.wallets.map((wallet: Wallet) =>
          wallet.id === transaction.walletId
            ? { ...wallet, balance: transaction.walletBalanceAfter }
            : wallet
        );
        const userId = useUserStore.getState().profile?.uid ?? getCurrentFirebaseUserId();
        if (userId) {
          const wallet = wallets.find((item) => item.id === transaction.walletId);
          if (wallet) {
            saveOrQueueWallet(userId, wallet);
          }
        }
        return {
          ...state,
          wallets,
        };
      });
    },

    applyTransactionLocal: (transaction) => {
      set((state) => {
        const wallets = state.wallets.map((wallet: Wallet) =>
          wallet.id === transaction.walletId
            ? { ...wallet, balance: transaction.walletBalanceAfter }
            : wallet
        );
        return {
          ...state,
          wallets,
        };
      });
    },

    totalBalance: () => {
      return get().wallets.reduce((sum, wallet) => (wallet.isEnabled ? sum + wallet.balance : sum), 0);
    },

    getWalletById: (walletId) => {
      return get().wallets.find((wallet) => wallet.id === walletId);
    },
  }));

