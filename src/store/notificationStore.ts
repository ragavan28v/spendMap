import { getCurrentFirebaseUserId } from '@/services/firebase/auth';
import { deleteOrQueueNotification, saveOrQueueNotification } from '@/services/sync/offlineQueue';
import { useUserStore } from '@/store/userStore';
import { AppNotificationItem } from '@/types';
import { create } from 'zustand';

interface NotificationState {
  notifications: AppNotificationItem[];
  unreadCount: number;
  lastDeletedNotification: AppNotificationItem | null;
  hydrateNotifications: (notifications: AppNotificationItem[]) => void;
  addNotification: (notification: AppNotificationItem) => void;
  markRead: (notificationId: string) => void;
  markAllRead: () => void;
  removeNotification: (notificationId: string) => void;
  removeNotificationsByNoteId: (noteId: string) => void;
  removeNotificationsByTransactionId: (transactionId: string) => void;
  clearNotificationsByFilter: (filter: 'all' | 'unread' | 'reminder' | 'transaction' | 'report' | 'system') => void;
  restoreLastDeletedNotification: () => void;
  clearNotifications: () => void;
}

function sortNotifications(notifications: AppNotificationItem[]) {
  return [...notifications].sort((first, second) => second.timestamp - first.timestamp);
}

function getNotificationUserId() {
  return useUserStore.getState().profile?.uid ?? getCurrentFirebaseUserId();
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  lastDeletedNotification: null,

  hydrateNotifications: (notifications) => {
    const sorted = sortNotifications(notifications);
    const unreadCount = sorted.filter((notification) => !notification.read).length;
    set((state) => ({
      ...state,
      notifications: sorted,
      unreadCount,
    }));
  },

  addNotification: (notification) => {
    const userId = getNotificationUserId();
    set((state) => {
      const notifications = sortNotifications([notification, ...state.notifications.filter((item) => item.id !== notification.id)]);
      const unreadCount = notifications.filter((item) => !item.read).length;
      if (userId) {
        void saveOrQueueNotification(userId, notification);
      }
      return {
        ...state,
        notifications,
        unreadCount,
      };
    });
  },

  markRead: (notificationId) => {
    const userId = getNotificationUserId();
    set((state) => {
      const notifications = state.notifications.map((item) =>
        item.id === notificationId ? { ...item, read: true } : item
      );
      const unreadCount = notifications.filter((item) => !item.read).length;
      if (userId) {
        const updatedNotification = notifications.find((item) => item.id === notificationId);
        if (updatedNotification) {
          void saveOrQueueNotification(userId, updatedNotification);
        }
      }
      return {
        ...state,
        notifications,
        unreadCount,
      };
    });
  },

  markAllRead: () => {
    const userId = getNotificationUserId();
    set((state) => {
      const notifications = state.notifications.map((item) => ({ ...item, read: true }));
      if (userId) {
        notifications.forEach((notification) => {
          void saveOrQueueNotification(userId, notification);
        });
      }
      return {
        ...state,
        notifications,
        unreadCount: 0,
      };
    });
  },

  removeNotification: (notificationId) => {
    const userId = getNotificationUserId();
    set((state) => {
      const deletedNotification = state.notifications.find((item) => item.id === notificationId) ?? null;
      const notifications = state.notifications.filter((item) => item.id !== notificationId);
      const unreadCount = notifications.filter((item) => !item.read).length;
      if (userId && deletedNotification) {
        void deleteOrQueueNotification(userId, deletedNotification);
      }
      return {
        ...state,
        notifications,
        unreadCount,
        lastDeletedNotification: deletedNotification,
      };
    });
  },

  removeNotificationsByNoteId: (noteId) => {
    const userId = getNotificationUserId();
    set((state) => {
      const deletedNotifications = state.notifications.filter((item) => item.noteId === noteId);
      const notifications = state.notifications.filter((item) => item.noteId !== noteId);
      const unreadCount = notifications.filter((item) => !item.read).length;
      if (userId) {
        deletedNotifications.forEach((notification) => {
          void deleteOrQueueNotification(userId, notification);
        });
      }
      return {
        ...state,
        notifications,
        unreadCount,
      };
    });
  },

  removeNotificationsByTransactionId: (transactionId) => {
    const userId = getNotificationUserId();
    set((state) => {
      const deletedNotifications = state.notifications.filter((item) => item.transactionId === transactionId);
      const notifications = state.notifications.filter((item) => item.transactionId !== transactionId);
      const unreadCount = notifications.filter((item) => !item.read).length;
      if (userId) {
        deletedNotifications.forEach((notification) => {
          void deleteOrQueueNotification(userId, notification);
        });
      }
      return {
        ...state,
        notifications,
        unreadCount,
      };
    });
  },

  clearNotificationsByFilter: (filter) => {
    const userId = getNotificationUserId();
    set((state) => {
      const removedNotifications =
        filter === 'all'
          ? state.notifications
          : state.notifications.filter((item) => {
              if (filter === 'unread') return !item.read;
              return item.kind === filter;
            });
      const notifications =
        filter === 'all'
          ? []
          : state.notifications.filter((item) => {
              if (filter === 'unread') return item.read;
              return item.kind !== filter;
            });
      const unreadCount = notifications.filter((item) => !item.read).length;
      if (userId) {
        removedNotifications.forEach((notification) => {
          void deleteOrQueueNotification(userId, notification);
        });
      }
      return {
        ...state,
        notifications,
        unreadCount,
      };
    });
  },

  restoreLastDeletedNotification: () => {
    const userId = getNotificationUserId();
    set((state) => {
      if (!state.lastDeletedNotification) {
        return state;
      }

      const notification = state.lastDeletedNotification;
      const notifications = sortNotifications([
        notification,
        ...state.notifications.filter((item) => item.id !== notification.id),
      ]);
      const unreadCount = notifications.filter((item) => !item.read).length;
      if (userId) {
        void saveOrQueueNotification(userId, notification);
      }
      return {
        ...state,
        notifications,
        unreadCount,
        lastDeletedNotification: null,
      };
    });
  },

  clearNotifications: () => {
    const userId = getNotificationUserId();
    set((state) => {
      const notificationsToDelete = state.notifications;
      if (userId) {
        notificationsToDelete.forEach((notification) => {
          void deleteOrQueueNotification(userId, notification);
        });
      }
      return {
        ...state,
        notifications: [],
        unreadCount: 0,
        lastDeletedNotification: null,
      };
    });
  },
}));
