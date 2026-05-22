import { Category, NoteItem, TransactionRecord, UserProfile, UserSettings, Wallet } from '@/types';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    runTransaction,
    setDoc,
    writeBatch
} from 'firebase/firestore';
import { firebaseFirestore } from './config';

function withoutUndefinedFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => withoutUndefinedFields(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, fieldValue]) => fieldValue !== undefined)
        .map(([fieldKey, fieldValue]) => [fieldKey, withoutUndefinedFields(fieldValue)])
    ) as T;
  }

  return value;
}

export const getUserDoc = (userId: string) => doc(firebaseFirestore, 'users', userId);
export const getUserProfileRef = (userId: string) => doc(firebaseFirestore, 'users', userId, 'profile', 'main');
export const getWalletsCollection = (userId: string) => collection(firebaseFirestore, 'users', userId, 'wallets');
export const getCategoriesCollection = (userId: string) => collection(firebaseFirestore, 'users', userId, 'categories');
export const getTransactionsCollection = (userId: string) => collection(firebaseFirestore, 'users', userId, 'transactions');
export const getNotesCollection = (userId: string) => collection(firebaseFirestore, 'users', userId, 'notes');
export const getSettingsDoc = (userId: string) => doc(firebaseFirestore, 'users', userId, 'settings', 'main');

export async function fetchUserWallets(userId: string): Promise<Wallet[]> {
  const snapshot = await getDocs(getWalletsCollection(userId));
  return snapshot.docs.map((docSnap) => docSnap.data() as Wallet);
}

export async function fetchUserCategories(userId: string): Promise<Category[]> {
  const snapshot = await getDocs(getCategoriesCollection(userId));
  return snapshot.docs.map((docSnap) => docSnap.data() as Category);
}

export async function fetchUserTransactions(userId: string): Promise<TransactionRecord[]> {
  const q = query(getTransactionsCollection(userId), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => docSnap.data() as TransactionRecord);
}

export async function fetchUserNotes(userId: string): Promise<NoteItem[]> {
  const snapshot = await getDocs(getNotesCollection(userId));
  return snapshot.docs
    .map((docSnap) => docSnap.data() as NoteItem)
    .sort((first, second) => {
      if (first.pinned !== second.pinned) {
        return first.pinned ? -1 : 1;
      }
      return second.updatedAt - first.updatedAt;
    });
}

export async function saveTransaction(userId: string, transaction: TransactionRecord) {
  const transactionRef = doc(getTransactionsCollection(userId), transaction.id);
  await setDoc(transactionRef, withoutUndefinedFields(transaction));
}

export async function saveWallet(userId: string, wallet: Wallet) {
  const walletRef = doc(getWalletsCollection(userId), wallet.id);
  await setDoc(walletRef, withoutUndefinedFields(wallet));
}

export async function saveTransactionWithWallet(
  userId: string,
  transaction: TransactionRecord,
  wallet: Wallet
) {
  const transactionRef = doc(getTransactionsCollection(userId), transaction.id);
  const walletRef = doc(getWalletsCollection(userId), wallet.id);
  const batch = writeBatch(firebaseFirestore);

  batch.set(transactionRef, withoutUndefinedFields(transaction));
  batch.set(walletRef, withoutUndefinedFields(wallet));

  await batch.commit();
}

export async function saveCategory(userId: string, category: Category) {
  const categoryRef = doc(getCategoriesCollection(userId), category.id);
  await setDoc(categoryRef, withoutUndefinedFields(category));
}

export async function saveNote(userId: string, note: NoteItem) {
  const noteRef = doc(getNotesCollection(userId), note.id);
  await setDoc(noteRef, withoutUndefinedFields(note));
}

export async function saveUserProfile(userId: string, profile: UserProfile) {
  const profileRef = getUserProfileRef(userId);
  await setDoc(profileRef, withoutUndefinedFields(profile), { merge: true });
}

export async function fetchUserSettings(userId: string): Promise<UserSettings | null> {
  const snapshot = await getDoc(getSettingsDoc(userId));
  return snapshot.exists() ? (snapshot.data() as UserSettings) : null;
}

export async function saveUserSettings(userId: string, settings: UserSettings) {
  const settingsRef = getSettingsDoc(userId);
  await setDoc(settingsRef, withoutUndefinedFields(settings), { merge: true });
}

export async function transactWalletBalance(userId: string, transaction: TransactionRecord) {
  const walletRef = doc(getWalletsCollection(userId), transaction.walletId);
  const transactionRef = doc(getTransactionsCollection(userId), transaction.id);

  await runTransaction(firebaseFirestore, async (tx) => {
    const walletSnapshot = await tx.get(walletRef);
    if (!walletSnapshot.exists()) {
      throw new Error('Wallet not found');
    }

    const wallet = walletSnapshot.data() as Wallet;
    const newBalance = transaction.walletBalanceAfter;
    tx.set(walletRef, withoutUndefinedFields({ ...wallet, balance: newBalance }));
    tx.set(transactionRef, withoutUndefinedFields(transaction));
  });
}
