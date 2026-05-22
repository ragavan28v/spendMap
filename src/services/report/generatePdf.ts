import { Category, TransactionRecord, Wallet } from '@/types';

export async function generateMonthlyReportPdf(options: {
  userName: string;
  monthLabel: string;
  wallets: Wallet[];
  categories: Category[];
  transactions: TransactionRecord[];
}): Promise<string> {
  // Placeholder implementation: in a production build this should use a PDF library.
  const html = `
    <html>
      <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc;">
        <h1>Monthly Report - ${options.monthLabel}</h1>
        <p>User: ${options.userName}</p>
      </body>
    </html>
  `;

  return Promise.resolve(html);
}
