import { useTransactionStore } from '@/store/transactionStore';
import { startOfMonth, startOfToday } from '@/utils/formatters';
import { useMemo } from 'react';

export function useRecentTransactions() {
  const transactions = useTransactionStore((state) => state.transactions);
  return useMemo(() => transactions.slice(0, 5), [transactions]);
}

export function useTransactionSummary() {
  const transactions = useTransactionStore((state) => state.transactions);

  return useMemo(() => {
    const todayStart = startOfToday();
    const monthStart = startOfMonth();

    const summary = {
      earnedToday: 0,
      spentToday: 0,
      earnedMonth: 0,
      spentMonth: 0,
      highestCategory: 'No expenses yet',
      highestCategoryAmount: 0,
      mostUsedWallet: 'No wallet yet',
    };
    const categoryTotals = new Map<string, number>();
    const walletCounts = new Map<string, number>();

    transactions.forEach((transaction) => {
      if (transaction.timestamp >= todayStart) {
        if (transaction.type === 'income') summary.earnedToday += transaction.amount;
        if (transaction.type === 'expense' && !transaction.isTransfer) summary.spentToday += transaction.amount;
      }
      if (transaction.timestamp >= monthStart) {
        if (transaction.type === 'income') summary.earnedMonth += transaction.amount;
        if (transaction.type === 'expense' && !transaction.isTransfer) summary.spentMonth += transaction.amount;
      }
      if (transaction.type === 'expense' && !transaction.isTransfer) {
        categoryTotals.set(
          transaction.categoryName,
          (categoryTotals.get(transaction.categoryName) ?? 0) + transaction.amount
        );
      }
      walletCounts.set(transaction.walletName, (walletCounts.get(transaction.walletName) ?? 0) + 1);
    });

    categoryTotals.forEach((amount, category) => {
      if (amount > summary.highestCategoryAmount) {
        summary.highestCategory = category;
        summary.highestCategoryAmount = amount;
      }
    });
    let maxWalletCount = 0;
    walletCounts.forEach((count, wallet) => {
      if (count > maxWalletCount) {
        maxWalletCount = count;
        summary.mostUsedWallet = wallet;
      }
    });

    return summary;
  }, [transactions]);
}
