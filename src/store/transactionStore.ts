import { getCurrentFirebaseUserId } from '@/services/firebase/auth';
import { persistTransactions } from '@/services/persistence';
import { saveOrQueueTransaction } from '@/services/sync/offlineQueue';
import { useUserStore } from '@/store/userStore';
import { TransactionRecord } from '@/types';
import { create } from 'zustand';

export interface TransactionState {
  transactions: TransactionRecord[];
  addTransaction: (transaction: TransactionRecord) => void;
  addTransactionLocal: (transaction: TransactionRecord) => void;
  setTransactions: (transactions: TransactionRecord[]) => void;
  getRecentTransactions: () => TransactionRecord[];
  getTransactionsByFilter: (filter: {
    walletId?: string;
    categoryId?: string;
    type?: 'income' | 'expense';
    startTime?: number;
    endTime?: number;
  }) => TransactionRecord[];
}

export const useTransactionStore = create<TransactionState>()((set, get) => ({
    transactions: [],

    addTransaction: (transaction) => {
      set((state) => {
        const transactions = [transaction, ...state.transactions];
        persistTransactions(transactions);
        const userId = useUserStore.getState().profile?.uid ?? getCurrentFirebaseUserId();
        if (userId) {
          saveOrQueueTransaction(userId, transaction);
        }
        return {
          ...state,
          transactions,
        };
      });
    },

    addTransactionLocal: (transaction) => {
      set((state) => {
        const transactions = [transaction, ...state.transactions];
        persistTransactions(transactions);
        return {
          ...state,
          transactions,
        };
      });
    },

    setTransactions: (transactions) => {
      set((state) => {
        persistTransactions(transactions);
        return {
          ...state,
          transactions,
        };
      });
    },

    getRecentTransactions: () => {
      return get().transactions.slice(0, 5);
    },

    getTransactionsByFilter: (filter) => {
      return get().transactions.filter((transaction) => {
        if (filter.walletId && transaction.walletId !== filter.walletId) {
          return false;
        }
        if (filter.categoryId && transaction.categoryId !== filter.categoryId) {
          return false;
        }
        if (filter.type && transaction.type !== filter.type) {
          return false;
        }
        if (filter.startTime && transaction.timestamp < filter.startTime) {
          return false;
        }
        if (filter.endTime && transaction.timestamp > filter.endTime) {
          return false;
        }
        return true;
      });
    },
  }));
