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
  fundingSourceWalletName?: string;
}

interface BuildTransferTransactionInput {
  amount: number;
  sourceWallet: Wallet;
  destinationWallet: Wallet;
  reason: string;
  note?: string;
  timestamp?: number;
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
  fundingSourceWalletName,
}: BuildTransactionInput): TransactionRecord {
  const signedAmount = type === 'income' ? amount : type === 'expense' ? -amount : 0;
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
    fundingSourceWalletId: wallet.fundingSourceWalletId,
    fundingSourceWalletName,
  };
}

export function buildTransferTransaction({
  amount,
  sourceWallet,
  destinationWallet,
  reason,
  note,
  timestamp = Date.now(),
  totalBalanceBefore,
}: BuildTransferTransactionInput): TransactionRecord {
  if (sourceWallet.id === destinationWallet.id) {
    throw new Error('Source and destination wallets must differ.');
  }
  if (sourceWallet.balance < amount) {
    throw new Error(`Insufficient balance in ${sourceWallet.name}`);
  }

  return {
    id: `txn-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'transfer',
    amount,
    walletId: sourceWallet.id,
    walletName: sourceWallet.name,
    walletBalanceAfter: sourceWallet.balance - amount,
    categoryId: 'category-transfer',
    categoryName: 'Transfer',
    categoryColor: '#9CA3AF',
    reason: reason.trim(),
    note: note?.trim() || undefined,
    timestamp,
    balanceAfterTransaction: totalBalanceBefore,
    isRecurring: false,
    isTransfer: true,
    sourceWalletId: sourceWallet.id,
    sourceWalletName: sourceWallet.name,
    destinationWalletId: destinationWallet.id,
    destinationWalletName: destinationWallet.name,
    sourceWalletBalanceAfter: sourceWallet.balance - amount,
    destinationWalletBalanceAfter: destinationWallet.balance + amount,
    sourceFundingWalletId: sourceWallet.fundingSourceWalletId,
    destinationFundingWalletId: destinationWallet.fundingSourceWalletId,
  };
}
