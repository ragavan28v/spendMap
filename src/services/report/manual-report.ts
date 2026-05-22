import { buildMonthlyReportData } from '@/services/report/monthly-report';
import { TransactionRecord, Wallet, Category, UserProfile } from '@/types';
import { EncodingType, cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import { Platform } from 'react-native';
import { generateMonthlyReportExcel } from './generateExcel';
import { generateMonthlyReportPdf } from './generatePdf';

export type ReportScope = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';
export type ReportExportFormat = 'pdf' | 'excel';

export interface ManualReportOptions {
  transactions: TransactionRecord[];
  wallets: Wallet[];
  categories: Category[];
  profile?: UserProfile | null;
  currency?: string;
  scope: ReportScope;
  startDate?: string;
  endDate?: string;
}

export interface ManualReportPreview {
  title: string;
  subtitle: string;
  filteredTransactions: TransactionRecord[];
  reportLabel: string;
  startTimestamp?: number;
  endTimestamp?: number;
}

export function buildManualReportPreview(options: ManualReportOptions): ManualReportPreview {
  const window = getReportWindow(options);
  const titleMap: Record<ReportScope, string> = {
    today: 'Today',
    week: 'This week',
    month: 'This month',
    year: 'This year',
    all: 'All time',
    custom: 'Custom range',
  };

  return {
    title: titleMap[options.scope],
    subtitle: window.label,
    filteredTransactions: window.transactions,
    reportLabel: window.label,
    startTimestamp: window.startTimestamp,
    endTimestamp: window.endTimestamp,
  };
}

export async function exportManualReport(options: ManualReportOptions & { format: ReportExportFormat }) {
  const window = getReportWindow(options);
  const profileName = options.profile?.name ?? 'SpendMap user';
  const reportData = buildMonthlyReportData({
    userName: profileName,
    monthLabel: window.label,
    wallets: options.wallets,
    categories: options.categories,
    transactions: window.transactions,
    currency: options.currency ?? options.profile?.currency ?? 'INR',
  });

  const fileNameBase = slugify(`${window.label}-${options.format}`);
  const bytes = options.format === 'pdf'
    ? await generateMonthlyReportPdf({
        userName: reportData.userName,
        monthLabel: reportData.monthLabel,
        wallets: options.wallets,
        categories: options.categories,
        transactions: window.transactions,
        currency: reportData.currency,
      })
    : await generateMonthlyReportExcel({
        userName: reportData.userName,
        monthLabel: reportData.monthLabel,
        wallets: options.wallets,
        categories: options.categories,
        transactions: window.transactions,
        currency: reportData.currency,
      });

  const ext = options.format === 'pdf' ? 'pdf' : 'xlsx';
  const mimeType =
    options.format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (!cacheDirectory) {
    throw new Error('Cache directory is not available on this platform.');
  }
  const uri = `${cacheDirectory}${fileNameBase}.${ext}`;
  await writeAsStringAsync(uri, toBase64(bytes), {
    encoding: EncodingType.Base64,
  });

  const saveResult = await saveReportToDevice({
    uri,
    bytes,
    mimeType,
    fileNameBase,
    ext,
    label: window.label,
  });

  return {
    uri: saveResult.uri,
    fileName: `${fileNameBase}.${ext}`,
    mimeType,
    reportData,
    savedLocally: saveResult.savedLocally,
  };
}

function getReportWindow(options: ManualReportOptions) {
  const startTimestamp = toStartTimestamp(options.scope, options.startDate);
  const endTimestamp = toEndTimestamp(options.scope, options.endDate);
  const transactions = options.transactions.filter((transaction) => {
    if (typeof startTimestamp === 'number' && transaction.timestamp < startTimestamp) {
      return false;
    }
    if (typeof endTimestamp === 'number' && transaction.timestamp > endTimestamp) {
      return false;
    }
    return true;
  });

  return {
    label: buildLabel(options.scope, startTimestamp, endTimestamp),
    startTimestamp,
    endTimestamp,
    transactions,
  };
}

function buildLabel(scope: ReportScope, startTimestamp?: number, endTimestamp?: number) {
  if (scope === 'today') return 'Today report';
  if (scope === 'week') return 'Weekly report';
  if (scope === 'year') return 'Yearly report';
  if (scope === 'all') return 'All time report';
  if (scope === 'month') return 'Monthly report';
  if (startTimestamp && endTimestamp) {
    return `${formatDateOnly(startTimestamp)} to ${formatDateOnly(endTimestamp)} report`;
  }
  return 'Custom report';
}

function toStartTimestamp(scope: ReportScope, startDate?: string) {
  if (scope === 'today') return startOfToday();
  if (scope === 'week') return startOfWeek();
  if (scope === 'month') return startOfMonth();
  if (scope === 'year') return startOfYear();
  if (scope === 'all') return undefined;
  return startDate ? parseLocalDate(startDate, 'start') : undefined;
}

function toEndTimestamp(scope: ReportScope, endDate?: string) {
  if (scope === 'today') return endOfDay(new Date(startOfToday()));
  if (scope === 'week') return endOfDay(new Date()) ;
  if (scope === 'month') return endOfMonth();
  if (scope === 'year') return endOfYear();
  if (scope === 'all') return undefined;
  return endDate ? parseLocalDate(endDate, 'end') : undefined;
}

function parseLocalDate(value: string, boundary: 'start' | 'end') {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  if (boundary === 'start') return date.setHours(0, 0, 0, 0);
  return date.setHours(23, 59, 59, 999);
}

function startOfToday() {
  const date = new Date();
  return date.setHours(0, 0, 0, 0);
}

function startOfWeek() {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff)).setHours(0, 0, 0, 0);
}

function startOfMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function startOfYear() {
  const date = new Date();
  return new Date(date.getFullYear(), 0, 1).getTime();
}

function endOfDay(date: Date) {
  return new Date(date.setHours(23, 59, 59, 999)).getTime();
}

function endOfMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
}

function endOfYear() {
  const date = new Date();
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
}

function formatDateOnly(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString('base64');
}

async function saveReportToDevice({
  uri,
  bytes,
  mimeType,
  fileNameBase,
  ext,
}: {
  uri: string;
  bytes: Uint8Array;
  mimeType: string;
  fileNameBase: string;
  ext: 'pdf' | 'xlsx';
}) {
  if (Platform.OS !== 'android') {
    return { uri, savedLocally: false };
  }

  const FileSystem = await import('expo-file-system/legacy');
  const { StorageAccessFramework } = FileSystem;
  const initialFolder = StorageAccessFramework.getUriForDirectoryInRoot('Download');
  const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync(initialFolder);
  if (!permissions.granted) {
    return { uri, savedLocally: false };
  }

  const destinationFileUri = await StorageAccessFramework.createFileAsync(
    permissions.directoryUri,
    `${fileNameBase}.${ext}`,
    mimeType
  );
  await FileSystem.writeAsStringAsync(destinationFileUri, toBase64(bytes), {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    uri: destinationFileUri,
    savedLocally: true,
  };
}
