/**
 * Tests for Sidebar Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';
import React from 'react';

// Mock app store
const mockSetCurrentStep = vi.fn();
const mockToggleSidebar = vi.fn();
const mockGetWorkflowProgress = vi.fn(() => ({
  completed: 2,
  total: 6,
  percentage: 33,
}));

vi.mock('../../stores/app-store', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      currentStep: 0,
      isSidebarCollapsed: false,
      completedSteps: new Set([0, 1]),
      setCurrentStep: mockSetCurrentStep,
      toggleSidebar: mockToggleSidebar,
      getWorkflowProgress: mockGetWorkflowProgress,
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

vi.mock('../../stores/theme-store', () => ({
  useThemeStore: vi.fn((selector) => {
    const state = {
      theme: 'dark',
      toggleTheme: vi.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

// Dynamic import to apply mocks first
let Sidebar: React.ComponentType;

beforeAll(async () => {
  const mod = await import('./Sidebar');
  Sidebar = mod.default;
});

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render workflow navigation items', () => {
    renderWithUser(<Sidebar />);
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(screen.getByText('Extract Skills')).toBeInTheDocument();
  });

  it('should render tool navigation items', () => {
    renderWithUser(<Sidebar />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });

  it('should call setCurrentStep when nav item clicked', async () => {
    const { user } = renderWithUser(<Sidebar />);
    const settingsButton = screen.getByText('Settings');
    await user.click(settingsButton);
    expect(mockSetCurrentStep).toHaveBeenCalled();
  });

  it('should show progress section', () => {
    renderWithUser(<Sidebar />);
    expect(screen.getByText(/progress/i)).toBeInTheDocument();
  });
});
