/**
 * Tests for NotificationCenter Component
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';
import React from 'react';

// Mock notification store
const mockToggleNotifications = vi.fn();
const mockCloseNotifications = vi.fn();
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockRemoveNotification = vi.fn();
const mockClearAll = vi.fn();

vi.mock('@/stores/notification-store', () => ({
  useNotificationStore: vi.fn(() => ({
    notifications: [],
    isOpen: false,
    unreadCount: 0,
    toggleNotifications: mockToggleNotifications,
    closeNotifications: mockCloseNotifications,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    removeNotification: mockRemoveNotification,
    clearAll: mockClearAll,
  })),
}));

// Mock date-utils
vi.mock('@/lib/date-utils', () => ({
  formatDistanceToNow: () => 'just now',
}));

// Mock Radix Popover to simplify rendering
vi.mock('@radix-ui/react-popover', () => ({
  Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Trigger: React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  )),
  Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Content: React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  )),
}));

// Mock Tooltip components
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  )),
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SimpleTooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

let NotificationCenter: typeof import('./NotificationCenter').NotificationCenter;

beforeAll(async () => {
  const mod = await import('./NotificationCenter');
  NotificationCenter = mod.NotificationCenter;
});

describe('NotificationCenter', () => {
  it('should render the notifications header', () => {
    renderWithUser(<NotificationCenter />);
    // "Notifications" appears in both tooltip content and the popover heading
    const elements = screen.getAllByText(/Notifications/);
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('should show empty state when there are no notifications', () => {
    renderWithUser(<NotificationCenter />);
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('should render without crashing', () => {
    const { container } = renderWithUser(<NotificationCenter />);
    expect(container).toBeDefined();
  });
});
