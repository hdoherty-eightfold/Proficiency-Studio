import React from 'react';
import { useNotificationStore, Notification, NotificationType } from '@/stores/notification-store';
import { cn } from '@/lib/utils';
import {
  Bell,
  X,
  Check,
  AlertCircle,
  Info,
  AlertTriangle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import * as Popover from '@radix-ui/react-popover';
import { formatDistanceToNow } from '@/lib/date-utils';

const typeIcons: Record<NotificationType, React.ElementType> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

const typeColors: Record<NotificationType, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
};

const typeBgColors: Record<NotificationType, string> = {
  info: 'bg-info/10',
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  error: 'bg-destructive/10',
};

function NotificationItem({
  notification,
  onMarkRead,
  onRemove,
}: {
  notification: Notification;
  onMarkRead: () => void;
  onRemove: () => void;
}) {
  const Icon = typeIcons[notification.type];

  return (
    <div
      className={cn(
        'relative p-3 border-b last:border-b-0 transition-colors',
        !notification.read && 'bg-accent/30'
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            'shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
            typeBgColors[notification.type]
          )}
        >
          <Icon className={cn('h-4 w-4', typeColors[notification.type])} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn('text-sm font-medium', !notification.read && 'text-foreground')}>
              {notification.title}
            </p>
            <button
              onClick={onRemove}
              aria-label={`Dismiss notification: ${notification.title}`}
              className="shrink-0 p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
          {notification.message && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {notification.message}
            </p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(notification.timestamp)}
            </span>
            {!notification.read && (
              <button
                onClick={onMarkRead}
                aria-label={`Mark as read: ${notification.title}`}
                className="text-xs text-primary hover:underline"
              >
                Mark as read
              </button>
            )}
          </div>
          {notification.action && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={notification.action.onClick}
            >
              {notification.action.label}
            </Button>
          )}
        </div>
      </div>
      {!notification.read && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
      )}
    </div>
  );
}

export function NotificationCenter() {
  const {
    notifications,
    isOpen,
    unreadCount,
    toggleNotifications,
    closeNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotificationStore();

  return (
    <Popover.Root open={isOpen} onOpenChange={(open) => !open && closeNotifications()}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Popover.Trigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={toggleNotifications}
              aria-label={
                unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'
              }
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </Popover.Trigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
        </TooltipContent>
      </Tooltip>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 rounded-xl border bg-card shadow-xl animate-slide-down-fade"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" onClick={markAllAsRead}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark all as read</TooltipContent>
                </Tooltip>
              )}
              {notifications.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" onClick={clearAll}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear all</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={() => markAsRead(notification.id)}
                  onRemove={() => removeNotification(notification.id)}
                />
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
