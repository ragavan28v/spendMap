export type WalletType =
  | 'cash'
  | 'gpay'
  | 'amazon_pay'
  | 'airtel_pay'
  | 'paytm'
  | 'bank'
  | 'credit_card'
  | 'custom';

export type TransactionType = 'income' | 'expense' | 'transfer';
export type RecurringType = 'daily' | 'weekly' | 'monthly' | 'none';
export type AppNotificationKind = 'transaction' | 'report' | 'reminder' | 'system';

export interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  balance: number;
  icon: string;
  color: string;
  isEnabled: boolean;
  isDefault: boolean;
  createdAt: number;
  fundingSourceWalletId?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  isCustom: boolean;
  monthlyBudget?: number;
  createdAt: number;
}

export interface TransactionRecord {
  id: string;
  type: TransactionType;
  amount: number;
  walletId: string;
  walletName: string;
  walletBalanceAfter: number;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  reason: string;
  note?: string;
  timestamp: number;
  balanceAfterTransaction: number;
  isRecurring: boolean;
  recurringType?: RecurringType;
  isTransfer?: boolean;
  sourceWalletId?: string;
  sourceWalletName?: string;
  destinationWalletId?: string;
  destinationWalletName?: string;
  sourceWalletBalanceAfter?: number;
  destinationWalletBalanceAfter?: number;
  sourceFundingWalletId?: string;
  destinationFundingWalletId?: string;
  fundingSourceWalletId?: string;
  fundingSourceWalletName?: string;
}

export interface NoteItem {
  id: string;
  type: 'quick' | 'budget' | 'goal' | 'reminder';
  title: string;
  content: string;
  pinned: boolean;
  reminderAt?: number;
  reminderNotificationId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BudgetItem {
  id: string;
  categoryId: string;
  monthlyLimit: number;
  month: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  currency: string;
  createdAt: number;
}

export interface UserSettings {
  theme: 'dark' | 'light' | 'system';
  currency: string;
  appLockEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface AppNotificationItem {
  id: string;
  kind: AppNotificationKind;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  noteId?: string;
  transactionId?: string;
  route?: string;
}
