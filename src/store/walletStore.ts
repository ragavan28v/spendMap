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
  deleteWallet: (walletId: string) => void;
  linkWalletToParent: (walletId: string, parentWalletId?: string) => void;
  applyTransaction: (transaction: TransactionRecord) => void;
  applyTransactionLocal: (transaction: TransactionRecord) => void;
  totalBalance: () => number;
  getWalletById: (walletId: string) => Wallet | undefined;
}

export const useWalletStore = create<WalletState>()((set, get) => {
  const syncLinkedWalletBalances = (wallets: Wallet[]) => {
    const walletById = new Map(wallets.map((wallet) => [wallet.id, wallet]));
    return wallets.map((wallet) => {
      if (!wallet.fundingSourceWalletId) {
        return wallet;
      }
      const parent = walletById.get(wallet.fundingSourceWalletId);
      return parent ? { ...wallet, balance: parent.balance } : wallet;
    });
  };

  return {
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
        const syncedWallets = syncLinkedWalletBalances(wallets);
        const userId = useUserStore.getState().profile?.uid ?? getCurrentFirebaseUserId();
        if (userId) {
          const wallet = syncedWallets.find((item) => item.id === walletId);
          if (wallet) {
            saveOrQueueWallet(userId, wallet);
          }
        }
        return {
          ...state,
          wallets: syncedWallets,
        };
      });
    },

    upsertWallet: (wallet) => {
      set((state) => {
        const exists = state.wallets.some((item) => item.id === wallet.id);
        let wallets = exists
          ? state.wallets.map((item: Wallet) => (item.id === wallet.id ? wallet : item))
          : [...state.wallets, wallet];
        wallets = syncLinkedWalletBalances(wallets);

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

    deleteWallet: (walletId) => {
      set((state) => {
        const wallets = state.wallets.filter((wallet) => wallet.id !== walletId);
        const newSelectedId = state.selectedWalletId === walletId ? wallets[0]?.id || defaultWallets[0].id : state.selectedWalletId;

        const userId = useUserStore.getState().profile?.uid ?? getCurrentFirebaseUserId();
        if (userId) {
          // TODO: Also delete associated transactions for this wallet
          // For now, just remove the wallet from state
        }

        return {
          ...state,
          wallets,
          selectedWalletId: newSelectedId,
        };
      });
    },

    linkWalletToParent: (walletId, parentWalletId) => {
      set((state) => {
        const wallets = state.wallets.map((w) =>
          w.id === walletId ? { ...w, fundingSourceWalletId: parentWalletId } : w
        );

        const syncedWallets = syncLinkedWalletBalances(wallets);

        const userId = useUserStore.getState().profile?.uid ?? getCurrentFirebaseUserId();
        if (userId) {
          const updatedWallet = syncedWallets.find((w) => w.id === walletId);
          if (updatedWallet) {
            saveOrQueueWallet(userId, updatedWallet);
          }
          if (parentWalletId) {
            const updatedParent = syncedWallets.find((w) => w.id === parentWalletId);
            if (updatedParent) {
              saveOrQueueWallet(userId, updatedParent);
            }
          }
        }

        return {
          ...state,
          wallets: syncedWallets,
        };
      });
    },

    applyTransaction: (transaction) => {
      set((state) => {
        const sourceFundingDelta = new Map<string, number>();
        const destinationFundingDelta = new Map<string, number>();

        if (transaction.isTransfer && transaction.sourceWalletId && transaction.destinationWalletId) {
          const sourceWallet = state.wallets.find((item) => item.id === transaction.sourceWalletId);
          const destinationWallet = state.wallets.find((item) => item.id === transaction.destinationWalletId);

          if (sourceWallet?.fundingSourceWalletId) {
            sourceFundingDelta.set(sourceWallet.fundingSourceWalletId, -transaction.amount);
          }
          if (destinationWallet?.fundingSourceWalletId) {
            destinationFundingDelta.set(destinationWallet.fundingSourceWalletId, transaction.amount);
          }
        }

        const wallets = state.wallets.map((wallet: Wallet) => {
          if (transaction.isTransfer && transaction.sourceWalletId && transaction.destinationWalletId) {
            if (wallet.id === transaction.sourceWalletId) {
              return { ...wallet, balance: transaction.sourceWalletBalanceAfter ?? transaction.walletBalanceAfter };
            }
            if (wallet.id === transaction.destinationWalletId) {
              return { ...wallet, balance: transaction.destinationWalletBalanceAfter ?? wallet.balance };
            }
            const sourceDelta = sourceFundingDelta.get(wallet.id) ?? 0;
            const destinationDelta = destinationFundingDelta.get(wallet.id) ?? 0;
            if (sourceDelta || destinationDelta) {
              return { ...wallet, balance: wallet.balance + sourceDelta + destinationDelta };
            }
            return wallet;
          }

          const targetWalletId = transaction.walletId;
          if (wallet.id === targetWalletId) {
            return { ...wallet, balance: transaction.walletBalanceAfter };
          }

          if (wallet.id === transaction.fundingSourceWalletId) {
            const signedAmount = transaction.type === 'income' ? transaction.amount : transaction.type === 'expense' ? -transaction.amount : 0;
            return { ...wallet, balance: wallet.balance + signedAmount };
          }

          return wallet;
        });

        const userId = useUserStore.getState().profile?.uid ?? getCurrentFirebaseUserId();
        if (userId) {
          if (transaction.isTransfer && transaction.sourceWalletId && transaction.destinationWalletId) {
            const sourceWallet = wallets.find((item) => item.id === transaction.sourceWalletId);
            const destinationWallet = wallets.find((item) => item.id === transaction.destinationWalletId);
            const sourceFundingWallet = sourceWallet?.fundingSourceWalletId
              ? wallets.find((item) => item.id === sourceWallet.fundingSourceWalletId)
              : undefined;
            const destinationFundingWallet = destinationWallet?.fundingSourceWalletId
              ? wallets.find((item) => item.id === destinationWallet.fundingSourceWalletId)
              : undefined;

            if (sourceWallet) {
              saveOrQueueWallet(userId, sourceWallet);
            }
            if (destinationWallet) {
              saveOrQueueWallet(userId, destinationWallet);
            }
            if (sourceFundingWallet && sourceFundingWallet.id !== sourceWallet?.id) {
              saveOrQueueWallet(userId, sourceFundingWallet);
            }
            if (destinationFundingWallet && destinationFundingWallet.id !== destinationWallet?.id && destinationFundingWallet.id !== sourceFundingWallet?.id) {
              saveOrQueueWallet(userId, destinationFundingWallet);
            }
          } else {
            const wallet = wallets.find((item) => item.id === transaction.walletId);
            if (wallet) {
              saveOrQueueWallet(userId, wallet);
            }
            if (transaction.fundingSourceWalletId) {
              const fundingWallet = wallets.find((item) => item.id === transaction.fundingSourceWalletId);
              if (fundingWallet) {
                saveOrQueueWallet(userId, fundingWallet);
              }
            }
          }
        }

        const syncedWallets = syncLinkedWalletBalances(wallets);
        return {
          ...state,
          wallets: syncedWallets,
        };
      });
    },

    applyTransactionLocal: (transaction) => {
      set((state) => {
        const sourceFundingDelta = new Map<string, number>();
        const destinationFundingDelta = new Map<string, number>();

        if (transaction.isTransfer && transaction.sourceWalletId && transaction.destinationWalletId) {
          const sourceWallet = state.wallets.find((item) => item.id === transaction.sourceWalletId);
          const destinationWallet = state.wallets.find((item) => item.id === transaction.destinationWalletId);

          if (sourceWallet?.fundingSourceWalletId) {
            sourceFundingDelta.set(sourceWallet.fundingSourceWalletId, -transaction.amount);
          }
          if (destinationWallet?.fundingSourceWalletId) {
            destinationFundingDelta.set(destinationWallet.fundingSourceWalletId, transaction.amount);
          }
        }

        const wallets = state.wallets.map((wallet: Wallet) => {
          if (transaction.isTransfer && transaction.sourceWalletId && transaction.destinationWalletId) {
            if (wallet.id === transaction.sourceWalletId) {
              return { ...wallet, balance: transaction.sourceWalletBalanceAfter ?? transaction.walletBalanceAfter };
            }
            if (wallet.id === transaction.destinationWalletId) {
              return { ...wallet, balance: transaction.destinationWalletBalanceAfter ?? wallet.balance };
            }
            const sourceDelta = sourceFundingDelta.get(wallet.id) ?? 0;
            const destinationDelta = destinationFundingDelta.get(wallet.id) ?? 0;
            if (sourceDelta || destinationDelta) {
              return { ...wallet, balance: wallet.balance + sourceDelta + destinationDelta };
            }
            return wallet;
          }

          const targetWalletId = transaction.walletId;
          if (wallet.id === targetWalletId) {
            return { ...wallet, balance: transaction.walletBalanceAfter };
          }

          if (wallet.id === transaction.fundingSourceWalletId) {
            const signedAmount = transaction.type === 'income' ? transaction.amount : transaction.type === 'expense' ? -transaction.amount : 0;
            return { ...wallet, balance: wallet.balance + signedAmount };
          }

          return wallet;
        });
        const syncedWallets = syncLinkedWalletBalances(wallets);
        return {
          ...state,
          wallets: syncedWallets,
        };
      });
    },

    totalBalance: () => {
      const seen = new Set<string>();
      return get().wallets.reduce((sum, wallet) => {
        if (!wallet.isEnabled) {
          return sum;
        }

        const effectiveWalletId = wallet.fundingSourceWalletId ?? wallet.id;
        if (seen.has(effectiveWalletId)) {
          return sum;
        }

        seen.add(effectiveWalletId);
        const effectiveWallet = get().wallets.find((item) => item.id === effectiveWalletId);
        return sum + (effectiveWallet ? effectiveWallet.balance : wallet.balance);
      }, 0);
    },

    getWalletById: (walletId) => {
      return get().wallets.find((wallet) => wallet.id === walletId);
    },
  };
});

