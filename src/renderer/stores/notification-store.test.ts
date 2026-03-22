/**
 * Tests for Notification Store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from './notification-store';

describe('useNotificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      isOpen: false,
      unreadCount: 0,
    });
  });

  describe('addNotification', () => {
    it('should add a notification', () => {
      useNotificationStore.getState().addNotification({
        type: 'info',
        title: 'Test notification',
      });

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].title).toBe('Test notification');
      expect(state.notifications[0].type).toBe('info');
      expect(state.notifications[0].read).toBe(false);
    });

    it('should increment unread count', () => {
      useNotificationStore.getState().addNotification({
        type: 'success',
        title: 'Success!',
      });
      expect(useNotificationStore.getState().unreadCount).toBe(1);

      useNotificationStore.getState().addNotification({
        type: 'error',
        title: 'Error!',
      });
      expect(useNotificationStore.getState().unreadCount).toBe(2);
    });

    it('should prepend new notifications (newest first)', () => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'First' });
      useNotificationStore.getState().addNotification({ type: 'info', title: 'Second' });

      const { notifications } = useNotificationStore.getState();
      expect(notifications[0].title).toBe('Second');
      expect(notifications[1].title).toBe('First');
    });

    it('should cap at MAX_NOTIFICATIONS (50)', () => {
      for (let i = 0; i < 55; i++) {
        useNotificationStore.getState().addNotification({
          type: 'info',
          title: `Notification ${i}`,
        });
      }
      expect(useNotificationStore.getState().notifications).toHaveLength(50);
    });

    it('should include optional message', () => {
      useNotificationStore.getState().addNotification({
        type: 'warning',
        title: 'Warning',
        message: 'Details here',
      });
      expect(useNotificationStore.getState().notifications[0].message).toBe('Details here');
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', () => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'Test' });
      const id = useNotificationStore.getState().notifications[0].id;

      useNotificationStore.getState().markAsRead(id);

      expect(useNotificationStore.getState().notifications[0].read).toBe(true);
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', () => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'A' });
      useNotificationStore.getState().addNotification({ type: 'info', title: 'B' });
      expect(useNotificationStore.getState().unreadCount).toBe(2);

      useNotificationStore.getState().markAllAsRead();
      expect(useNotificationStore.getState().unreadCount).toBe(0);
      expect(useNotificationStore.getState().notifications.every(n => n.read)).toBe(true);
    });
  });

  describe('removeNotification', () => {
    it('should remove a notification by id', () => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'Keep' });
      useNotificationStore.getState().addNotification({ type: 'info', title: 'Remove' });

      const id = useNotificationStore.getState().notifications[0].id; // 'Remove' is first (newest)
      useNotificationStore.getState().removeNotification(id);

      expect(useNotificationStore.getState().notifications).toHaveLength(1);
      expect(useNotificationStore.getState().notifications[0].title).toBe('Keep');
    });

    it('should update unread count on remove', () => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'Unread' });
      expect(useNotificationStore.getState().unreadCount).toBe(1);

      const id = useNotificationStore.getState().notifications[0].id;
      useNotificationStore.getState().removeNotification(id);
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });

  describe('clearAll', () => {
    it('should clear all notifications', () => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'A' });
      useNotificationStore.getState().addNotification({ type: 'info', title: 'B' });

      useNotificationStore.getState().clearAll();
      expect(useNotificationStore.getState().notifications).toHaveLength(0);
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });

  describe('panel state', () => {
    it('should open notifications panel', () => {
      useNotificationStore.getState().openNotifications();
      expect(useNotificationStore.getState().isOpen).toBe(true);
    });

    it('should close notifications panel', () => {
      useNotificationStore.getState().openNotifications();
      useNotificationStore.getState().closeNotifications();
      expect(useNotificationStore.getState().isOpen).toBe(false);
    });

    it('should toggle notifications panel', () => {
      useNotificationStore.getState().toggleNotifications();
      expect(useNotificationStore.getState().isOpen).toBe(true);

      useNotificationStore.getState().toggleNotifications();
      expect(useNotificationStore.getState().isOpen).toBe(false);
    });
  });
});
