import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message?: string;
    timestamp: number;
    read: boolean;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface NotificationState {
    notifications: Notification[];
    isOpen: boolean;
    unreadCount: number;

    // Actions
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
    openNotifications: () => void;
    closeNotifications: () => void;
    toggleNotifications: () => void;
}

const MAX_NOTIFICATIONS = 50;

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, _get) => ({
            notifications: [],
            isOpen: false,
            unreadCount: 0,

            addNotification: (notification) => {
                const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const newNotification: Notification = {
                    ...notification,
                    id,
                    timestamp: Date.now(),
                    read: false,
                };

                set((state) => {
                    const updated = [newNotification, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
                    return {
                        notifications: updated,
                        unreadCount: updated.filter(n => !n.read).length,
                    };
                });
            },

            markAsRead: (id) => {
                set((state) => {
                    const updated = state.notifications.map(n =>
                        n.id === id ? { ...n, read: true } : n
                    );
                    return {
                        notifications: updated,
                        unreadCount: updated.filter(n => !n.read).length,
                    };
                });
            },

            markAllAsRead: () => {
                set((state) => ({
                    notifications: state.notifications.map(n => ({ ...n, read: true })),
                    unreadCount: 0,
                }));
            },

            removeNotification: (id) => {
                set((state) => {
                    const updated = state.notifications.filter(n => n.id !== id);
                    return {
                        notifications: updated,
                        unreadCount: updated.filter(n => !n.read).length,
                    };
                });
            },

            clearAll: () => {
                set({ notifications: [], unreadCount: 0 });
            },

            openNotifications: () => set({ isOpen: true }),
            closeNotifications: () => set({ isOpen: false }),
            toggleNotifications: () => set((state) => ({ isOpen: !state.isOpen })),
        }),
        {
            name: 'notifications-storage',
            partialize: (state) => ({
                notifications: state.notifications.slice(0, 20), // Only persist recent 20
            }),
        }
    )
);

// Helper hook to add common notification types
export function useNotify() {
    const addNotification = useNotificationStore((state) => state.addNotification);

    return {
        info: (title: string, message?: string) =>
            addNotification({ type: 'info', title, message }),
        success: (title: string, message?: string) =>
            addNotification({ type: 'success', title, message }),
        warning: (title: string, message?: string) =>
            addNotification({ type: 'warning', title, message }),
        error: (title: string, message?: string) =>
            addNotification({ type: 'error', title, message }),
        custom: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) =>
            addNotification(notification),
    };
}
