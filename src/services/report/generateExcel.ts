import { Category, TransactionRecord, Wallet } from '@/types';

export async function generateMonthlyReportExcel(options: {
  monthLabel: string;
  wallets: Wallet[];
  categories: Category[];
  transactions: TransactionRecord[];
}): Promise<Uint8Array> {
  const csvRows = [
    ['Month', options.monthLabel],
    ['Wallets', 'Balance'],
    ...options.wallets.map((wallet) => [wallet.name, wallet.balance.toString()]),
    [],
    ['Transactions'],
    ['Date', 'Type', 'Amount', 'Category', 'Wallet', 'Reason'],
    ...options.transactions.map((transaction) => [
      new Date(transaction.timestamp).toISOString(),
      transaction.type,
      transaction.amount.toString(),
      transaction.categoryName,
      transaction.walletName,
      transaction.reason,
    ]),
  ];
  const csv = csvRows.map((row) => row.join(',')).join('\n');
  return new TextEncoder().encode(csv);
}
