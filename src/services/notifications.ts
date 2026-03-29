import { AppNotification } from '../types';

type NotificationListener = (notifications: AppNotification[]) => void;

const store: AppNotification[] = [];
const listeners = new Set<NotificationListener>();
const MAX_NOTIFICATIONS = 50;

function notify() {
  const snapshot = [...store];
  listeners.forEach(fn => fn(snapshot));
}

export const NotificationService = {
  push(notification: Omit<AppNotification, 'id' | 'read' | 'created_at'>) {
    const full: AppNotification = {
      ...notification,
      id: crypto.randomUUID(),
      read: false,
      created_at: new Date().toISOString(),
    };
    store.unshift(full);
    if (store.length > MAX_NOTIFICATIONS) store.pop();
    notify();
    return full;
  },

  markRead(id: string) {
    const item = store.find(n => n.id === id);
    if (item) {
      item.read = true;
      notify();
    }
  },

  markAllRead() {
    store.forEach(n => { n.read = true; });
    notify();
  },

  dismiss(id: string) {
    const idx = store.findIndex(n => n.id === id);
    if (idx !== -1) {
      store.splice(idx, 1);
      notify();
    }
  },

  getAll(): AppNotification[] {
    return [...store];
  },

  getUnreadCount(): number {
    return store.filter(n => !n.read).length;
  },

  subscribe(listener: NotificationListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
