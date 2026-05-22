import {
  saveCategory,
  saveNote,
  saveTransaction,
  saveUserProfile,
  saveUserSettings,
  saveWallet,
} from '@/services/firebase/firestore';
import { Category, NoteItem, TransactionRecord, UserProfile, UserSettings, Wallet } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@spendwise:syncQueue';

type QueueItem =
  | {
      type: 'transaction';
      id: string;
      payload: TransactionRecord;
      createdAt: number;
    }
  | {
      type: 'wallet';
      id: string;
      payload: Wallet;
      createdAt: number;
    }
  | {
      type: 'category';
      id: string;
      payload: Category;
      createdAt: number;
    }
  | {
      type: 'note';
      id: string;
      payload: NoteItem;
      createdAt: number;
    }
  | {
      type: 'settings';
      id: 'settings';
      payload: UserSettings;
      createdAt: number;
    }
  | {
      type: 'profile';
      id: 'profile';
      payload: UserProfile;
      createdAt: number;
    };

async function readQueue(): Promise<QueueItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as QueueItem[]) : [];
}

async function writeQueue(queue: QueueItem[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueSyncAction(item: QueueItem) {
  const queue = await readQueue();
  const withoutDuplicate = queue.filter(
    (queuedItem) => !(queuedItem.type === item.type && queuedItem.id === item.id)
  );
  await writeQueue([...withoutDuplicate, item]);
}

export async function flushSyncQueue(userId: string) {
  const queue = await readQueue();
  if (!queue.length) {
    return;
  }

  const failedItems: QueueItem[] = [];
  for (const item of queue) {
    try {
      await syncQueueItem(userId, item);
    } catch (error) {
      console.warn(`Unable to sync queued ${item.type}.`, error);
      failedItems.push(item);
    }
  }

  if (failedItems.length) {
    await writeQueue(failedItems);
  } else {
    await AsyncStorage.removeItem(QUEUE_KEY);
  }
}

export async function saveOrQueueTransaction(userId: string, transaction: TransactionRecord) {
  try {
    await saveTransaction(userId, transaction);
    await flushSyncQueue(userId);
  } catch (error) {
    console.warn('Transaction saved locally and queued for sync.', error);
    await enqueueSyncAction({
      type: 'transaction',
      id: transaction.id,
      payload: transaction,
      createdAt: Date.now(),
    });
  }
}

export async function saveOrQueueWallet(userId: string, wallet: Wallet) {
  try {
    await saveWallet(userId, wallet);
    await flushSyncQueue(userId);
  } catch (error) {
    console.warn('Wallet saved locally and queued for sync.', error);
    await enqueueSyncAction({
      type: 'wallet',
      id: wallet.id,
      payload: wallet,
      createdAt: Date.now(),
    });
  }
}

export async function saveOrQueueCategory(userId: string, category: Category) {
  try {
    await saveCategory(userId, category);
    await flushSyncQueue(userId);
  } catch (error) {
    console.warn('Category saved locally and queued for sync.', error);
    await enqueueSyncAction({
      type: 'category',
      id: category.id,
      payload: category,
      createdAt: Date.now(),
    });
  }
}

export async function saveOrQueueNote(userId: string, note: NoteItem) {
  try {
    await saveNote(userId, note);
    await flushSyncQueue(userId);
  } catch (error) {
    console.warn('Note saved locally and queued for sync.', error);
    await enqueueSyncAction({
      type: 'note',
      id: note.id,
      payload: note,
      createdAt: Date.now(),
    });
  }
}

export async function saveOrQueueSettings(userId: string, settings: UserSettings) {
  try {
    await saveUserSettings(userId, settings);
    await flushSyncQueue(userId);
  } catch (error) {
    console.warn('Settings saved locally and queued for sync.', error);
    await enqueueSyncAction({
      type: 'settings',
      id: 'settings',
      payload: settings,
      createdAt: Date.now(),
    });
  }
}

export async function saveOrQueueProfile(userId: string, profile: UserProfile) {
  try {
    await saveUserProfile(userId, profile);
    await flushSyncQueue(userId);
  } catch (error) {
    console.warn('Profile saved locally and queued for sync.', error);
    await enqueueSyncAction({
      type: 'profile',
      id: 'profile',
      payload: profile,
      createdAt: Date.now(),
    });
  }
}

export async function getSyncQueueLength(): Promise<number> {
  return (await readQueue()).length;
}

async function syncQueueItem(userId: string, item: QueueItem) {
  if (item.type === 'transaction') {
    await saveTransaction(userId, item.payload);
  } else if (item.type === 'wallet') {
    await saveWallet(userId, item.payload);
  } else if (item.type === 'category') {
    await saveCategory(userId, item.payload);
  } else if (item.type === 'note') {
    await saveNote(userId, item.payload);
  } else if (item.type === 'settings') {
    await saveUserSettings(userId, item.payload);
  } else {
    await saveUserProfile(userId, item.payload);
  }
}
