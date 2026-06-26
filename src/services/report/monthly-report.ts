import { Category, TransactionRecord, Wallet } from '@/types';

export interface MonthlyReportOptions {
  userName: string;
  monthLabel: string;
  wallets: Wallet[];
  categories: Category[];
  transactions: TransactionRecord[];
  currency?: string;
}

export interface MonthlyReportSummary {
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  incomeCount: number;
  expenseCount: number;
  topCategory: string;
  topCategoryAmount: number;
  topWallet: string;
}

export interface MonthlyReportDailyPoint {
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface MonthlyReportCategoryPoint {
  name: string;
  amount: number;
  share: number;
  color: string;
}

export interface MonthlyReportWalletPoint {
  name: string;
  balance: number;
  share: number;
  color: string;
}

export interface MonthlyReportRow {
  timestamp: number;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  walletName: string;
  categoryName: string;
  reason: string;
  note?: string;
}

export interface MonthlyReportData {
  userName: string;
  monthLabel: string;
  currency: string;
  summary: MonthlyReportSummary;
  wallets: MonthlyReportWalletPoint[];
  categories: MonthlyReportCategoryPoint[];
  dailySeries: MonthlyReportDailyPoint[];
  transactions: MonthlyReportRow[];
}

export function buildMonthlyReportData(options: MonthlyReportOptions): MonthlyReportData {
  const currency = options.currency ?? 'INR';
  const transactions = [...options.transactions].sort((first, second) => second.timestamp - first.timestamp);
  const incomeTransactions = transactions.filter((transaction) => transaction.type === 'income');
  const expenseTransactions = transactions.filter((transaction) => transaction.type === 'expense');
  const totalIncome = incomeTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalExpense = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const summary: MonthlyReportSummary = {
    totalIncome,
    totalExpense,
    netFlow: totalIncome - totalExpense,
    incomeCount: incomeTransactions.length,
    expenseCount: expenseTransactions.length,
    topCategory: 'No expenses yet',
    topCategoryAmount: 0,
    topWallet: 'No wallet yet',
  };

  const categoryTotals = new Map<string, { amount: number; color: string }>();
  expenseTransactions.forEach((transaction) => {
    const current = categoryTotals.get(transaction.categoryName) ?? { amount: 0, color: transaction.categoryColor };
    categoryTotals.set(transaction.categoryName, {
      amount: current.amount + transaction.amount,
      color: transaction.categoryColor || current.color,
    });
  });

  for (const [name, value] of categoryTotals.entries()) {
    if (value.amount > summary.topCategoryAmount) {
      summary.topCategory = name;
      summary.topCategoryAmount = value.amount;
    }
  }

  const walletsSorted = [...options.wallets].sort((first, second) => second.balance - first.balance);
  summary.topWallet = walletsSorted[0]?.name ?? summary.topWallet;
  const totalBalance = walletsSorted.reduce((sum, wallet) => sum + wallet.balance, 0) || 1;

  const wallets: MonthlyReportWalletPoint[] = walletsSorted.map((wallet) => ({
    name: wallet.name,
    balance: wallet.balance,
    share: wallet.balance / totalBalance,
    color: wallet.color,
  }));

  const categories: MonthlyReportCategoryPoint[] = Array.from(categoryTotals.entries())
    .map(([name, value]) => ({
      name,
      amount: value.amount,
      share: value.amount / (totalExpense || 1),
      color: value.color,
    }))
    .sort((first, second) => second.amount - first.amount);

  const dailyMap = new Map<string, MonthlyReportDailyPoint>();
  transactions.forEach((transaction) => {
    const date = new Date(transaction.timestamp);
    const dayKey = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const current = dailyMap.get(dayKey) ?? { label, income: 0, expense: 0, net: 0 };
    if (transaction.type === 'income') {
      current.income += transaction.amount;
    } else if (transaction.type === 'expense') {
      current.expense += transaction.amount;
    }
    current.net = current.income - current.expense;
    dailyMap.set(dayKey, current);
  });

  const dailySeries = Array.from(dailyMap.entries())
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
    .map(([, value]) => value);

  return {
    userName: options.userName,
    monthLabel: options.monthLabel,
    currency,
    summary,
    wallets,
    categories,
    dailySeries,
    transactions: transactions.map((transaction) => ({
      timestamp: transaction.timestamp,
      type: transaction.type,
      amount: transaction.amount,
      walletName: transaction.walletName,
      categoryName: transaction.categoryName,
      reason: transaction.reason,
      note: transaction.note,
    })),
  };
}

export function formatReportMoney(value: number, currency = 'INR') {
  return `${currency} ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value)}`;
}

export function buildMonthlyReportEmailHtml(data: MonthlyReportData) {
  const categoryRows = data.categories
    .map(
      (category) => `
        <tr>
          <td>${escapeHtml(category.name)}</td>
          <td>${formatReportMoney(category.amount, data.currency)}</td>
          <td>${Math.round(category.share * 100)}%</td>
        </tr>`
    )
    .join('');

  const walletRows = data.wallets
    .map(
      (wallet) => `
        <tr>
          <td>${escapeHtml(wallet.name)}</td>
          <td>${formatReportMoney(wallet.balance, data.currency)}</td>
          <td>${Math.round(wallet.share * 100)}%</td>
        </tr>`
    )
    .join('');

  const transactionRows = data.transactions
    .slice(0, 30)
    .map((transaction) => {
      const sign = transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : '';
      return `
        <tr>
          <td>${new Date(transaction.timestamp).toLocaleString('en-IN')}</td>
          <td>${escapeHtml(transaction.reason)}</td>
          <td>${escapeHtml(transaction.categoryName)}</td>
          <td>${escapeHtml(transaction.walletName)}</td>
          <td>${sign}${formatReportMoney(transaction.amount, data.currency)}</td>
        </tr>`;
    })
    .join('');

  const categorySvg = buildBarChartSvg(
    'Category analysis',
    data.categories.map((category) => ({ label: category.name, value: category.amount, color: category.color }))
  );

  const daySvg = buildBarChartSvg(
    'Daily net flow',
    data.dailySeries.map((point) => ({
      label: point.label,
      value: Math.abs(point.net),
      color: point.net >= 0 ? '#10B981' : '#EF4444',
    }))
  );

  return `
    <html>
      <body style="font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a;padding:24px">
        <h1>Monthly report - ${escapeHtml(data.monthLabel)}</h1>
        <p>Hello ${escapeHtml(data.userName)}, here is your monthly summary.</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          ${summaryCard('Income', formatReportMoney(data.summary.totalIncome, data.currency))}
          ${summaryCard('Expense', formatReportMoney(data.summary.totalExpense, data.currency))}
          ${summaryCard('Net flow', formatReportMoney(data.summary.netFlow, data.currency))}
          ${summaryCard('Top category', escapeHtml(data.summary.topCategory))}
        </div>
        <h2>Graph snapshots</h2>
        <div>${categorySvg}</div>
        <div>${daySvg}</div>
        <h2>Wallet balances</h2>
        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%">
          <thead><tr><th align="left">Wallet</th><th align="left">Balance</th><th align="left">Share</th></tr></thead>
          <tbody>${walletRows}</tbody>
        </table>
        <h2>Category analysis</h2>
        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%">
          <thead><tr><th align="left">Category</th><th align="left">Amount</th><th align="left">Share</th></tr></thead>
          <tbody>${categoryRows}</tbody>
        </table>
        <h2>Detailed transaction table</h2>
        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%">
          <thead><tr><th align="left">Date</th><th align="left">Reason</th><th align="left">Category</th><th align="left">Wallet</th><th align="left">Amount</th></tr></thead>
          <tbody>${transactionRows}</tbody>
        </table>
      </body>
    </html>
  `;
}

function summaryCard(label: string, value: string) {
  return `
    <div style="padding:12px 16px;border:1px solid #cbd5e1;border-radius:12px;min-width:160px;background:white">
      <div style="font-size:12px;color:#475569">${escapeHtml(label)}</div>
      <div style="font-size:18px;font-weight:700;margin-top:6px">${escapeHtml(value)}</div>
    </div>`;
}

export function buildMonthlyReportSvgSnapshots(data: MonthlyReportData) {
  return {
    categoryChart: buildBarChartSvg(
      'Category analysis',
      data.categories.map((category) => ({ label: category.name, value: category.amount, color: category.color }))
    ),
    dailyChart: buildBarChartSvg(
      'Daily net flow',
      data.dailySeries.map((point) => ({
        label: point.label,
        value: Math.abs(point.net),
        color: point.net >= 0 ? '#10B981' : '#EF4444',
      }))
    ),
  };
}

function buildBarChartSvg(title: string, items: { label: string; value: number; color: string }[]) {
  const width = 680;
  const height = 220;
  const chartHeight = 120;
  const leftPadding = 40;
  const topPadding = 44;
  const barWidth = Math.max(18, Math.min(40, (width - leftPadding * 2) / Math.max(items.length, 1) - 8));
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  const bars = items
    .map((item, index) => {
      const x = leftPadding + index * (barWidth + 8);
      const barHeight = Math.max(4, (item.value / maxValue) * chartHeight);
      const y = topPadding + (chartHeight - barHeight);
      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${item.color}" />
        <text x="${x + barWidth / 2}" y="${topPadding + chartHeight + 16}" text-anchor="middle" font-size="10" fill="#475569">${escapeXml(
          item.label.length > 10 ? `${item.label.slice(0, 10)}…` : item.label
        )}</text>
      `;
    })
    .join('');

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" rx="16" fill="#ffffff" stroke="#cbd5e1"/>
      <text x="24" y="28" font-size="16" font-weight="700" fill="#0f172a">${escapeXml(title)}</text>
      <line x1="${leftPadding}" y1="${topPadding + chartHeight}" x2="${width - leftPadding}" y2="${topPadding + chartHeight}" stroke="#cbd5e1" />
      ${bars}
    </svg>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeXml(value: string) {
  return escapeHtml(value);
}

