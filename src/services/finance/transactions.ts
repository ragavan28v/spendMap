import { Category, RecurringType, TransactionRecord, TransactionType, Wallet } from '@/types';

type TransactionCategory = Pick<Category, 'id' | 'name' | 'color'>;

interface BuildTransactionInput {
  type: TransactionType;
  amount: number;
  wallet: Wallet;
  category: TransactionCategory;
  reason: string;
  note?: string;
  timestamp?: number;
  recurringType?: RecurringType;
  totalBalanceBefore: number;
}

export function buildTransaction({
  type,
  amount,
  wallet,
  category,
  reason,
  note,
  timestamp = Date.now(),
  recurringType = 'none',
  totalBalanceBefore,
}: BuildTransactionInput): TransactionRecord {
  const signedAmount = type === 'income' ? amount : -amount;
  const walletBalanceAfter = wallet.balance + signedAmount;

  if (type === 'expense' && walletBalanceAfter < 0) {
    throw new Error(`Insufficient balance in ${wallet.name}`);
  }

  return {
    id: `txn-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    amount,
    walletId: wallet.id,
    walletName: wallet.name,
    walletBalanceAfter,
    categoryId: category.id,
    categoryName: category.name,
    categoryColor: category.color,
    reason: reason.trim(),
    note: note?.trim() || undefined,
    timestamp,
    balanceAfterTransaction: totalBalanceBefore + signedAmount,
    isRecurring: recurringType !== 'none',
    recurringType,
  };
}
