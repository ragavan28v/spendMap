import { Category, NoteItem, TransactionRecord, UserProfile, UserSettings, Wallet } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  wallets: '@spendwise:wallets',
  selectedWalletId: '@spendwise:selectedWalletId',
  transactions: '@spendwise:transactions',
  categories: '@spendwise:categories',
  settings: '@spendwise:settings',
  profile: '@spendwise:profile',
  notes: '@spendwise:notes',
};

export interface PersistedAppState {
  wallets?: Wallet[];
  selectedWalletId?: string;
  transactions?: TransactionRecord[];
  categories?: Category[];
  settings?: UserSettings;
  profile?: UserProfile | null;
  notes?: NoteItem[];
}

export async function loadPersistedState(): Promise<PersistedAppState> {
  const rawValues = await AsyncStorage.multiGet([
    KEYS.wallets,
    KEYS.selectedWalletId,
    KEYS.transactions,
    KEYS.categories,
    KEYS.settings,
    KEYS.profile,
    KEYS.notes,
  ]);

  const persisted: PersistedAppState = {};

  for (const [key, value] of rawValues) {
    if (!value) {
      continue;
    }

    try {
      switch (key) {
        case KEYS.wallets:
          persisted.wallets = JSON.parse(value) as Wallet[];
          break;
        case KEYS.selectedWalletId:
          persisted.selectedWalletId = value;
          break;
        case KEYS.transactions:
          persisted.transactions = JSON.parse(value) as TransactionRecord[];
          break;
        case KEYS.categories:
          persisted.categories = JSON.parse(value) as Category[];
          break;
        case KEYS.settings:
          persisted.settings = JSON.parse(value) as UserSettings;
          break;
        case KEYS.profile:
          persisted.profile = JSON.parse(value) as UserProfile;
          break;
        case KEYS.notes:
          persisted.notes = JSON.parse(value) as NoteItem[];
          break;
      }
    } catch {
      // Ignore invalid persisted entries and continue with defaults
    }
  }

  return persisted;
}

export async function persistWallets(wallets: Wallet[]) {
  await AsyncStorage.setItem(KEYS.wallets, JSON.stringify(wallets));
}

export async function persistSelectedWalletId(walletId: string) {
  await AsyncStorage.setItem(KEYS.selectedWalletId, walletId);
}

export async function persistTransactions(transactions: TransactionRecord[]) {
  await AsyncStorage.setItem(KEYS.transactions, JSON.stringify(transactions));
}

export async function persistCategories(categories: Category[]) {
  await AsyncStorage.setItem(KEYS.categories, JSON.stringify(categories));
}

export async function persistSettings(settings: UserSettings) {
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

export async function persistUserProfile(profile: UserProfile | null) {
  if (profile) {
    await AsyncStorage.setItem(KEYS.profile, JSON.stringify(profile));
  } else {
    await AsyncStorage.removeItem(KEYS.profile);
  }
}

export async function persistNotes(notes: NoteItem[]) {
  await AsyncStorage.setItem(KEYS.notes, JSON.stringify(notes));
}

export async function clearPersistedState() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
