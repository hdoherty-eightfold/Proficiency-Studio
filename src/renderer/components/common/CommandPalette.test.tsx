/**
 * Tests for CommandPalette Component
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';
import { CommandPalette } from './CommandPalette';

// Mock the stores
vi.mock('../../stores/app-store', () => ({
  useAppStore: vi.fn(() => ({
    setCurrentStep: vi.fn(),
    resetWorkflowProgress: vi.fn(),
    currentStep: 0,
  })),
}));

vi.mock('../../stores/theme-store', () => ({
  useThemeStore: vi.fn(() => ({
    toggleTheme: vi.fn(),
    theme: 'dark',
  })),
}));

vi.mock('../../stores/command-store', () => ({
  useCommandStore: vi.fn(() => ({
    isOpen: false,
    setIsOpen: vi.fn(),
    recentCommands: [],
    addRecentCommand: vi.fn(),
  })),
}));

describe('CommandPalette', () => {
  it('should render without crashing', () => {
    // Component returns null when closed — verify it mounts without throwing
    expect(() => renderWithUser(<CommandPalette />)).not.toThrow();
  });

  it('should not be visible when closed', () => {
    renderWithUser(<CommandPalette />);
    // Command palette should not show search input when closed
    expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
  });
});
