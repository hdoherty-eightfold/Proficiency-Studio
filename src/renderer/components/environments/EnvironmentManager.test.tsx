/**
 * Tests for EnvironmentManager Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen, waitFor } from '../../test/utils/render';
import React from 'react';

// Mock api service
vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock electron-api
vi.mock('../../services/electron-api', () => ({
  electronAPI: {},
}));

// Mock toast store
vi.mock('../../stores/toast-store', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
  useToastStore: vi.fn(() => ({
    addToast: vi.fn(),
  })),
}));

// Dynamic import to apply mocks first
let EnvironmentManager: React.FC;

beforeAll(async () => {
  const mod = await import('./EnvironmentManager');
  EnvironmentManager = mod.default;
});

describe('EnvironmentManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the heading and description', async () => {
    renderWithUser(<EnvironmentManager />);
    await waitFor(() => {
      expect(screen.getByText('Environment Manager')).toBeInTheDocument();
    });
    expect(screen.getByText('Manage your Eightfold environments and connections')).toBeInTheDocument();
  });

  it('should render Refresh and Add Environment buttons', async () => {
    renderWithUser(<EnvironmentManager />);
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
    // Two "Add Environment" buttons: one in header, one in empty state
    const addButtons = screen.getAllByText('Add Environment');
    expect(addButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('should show empty state when no environments exist', async () => {
    renderWithUser(<EnvironmentManager />);
    await waitFor(() => {
      expect(screen.getByText('No Environments Yet')).toBeInTheDocument();
    });
    expect(screen.getByText('Add your first Eightfold environment to get started')).toBeInTheDocument();
  });

  it('should show Add Environment modal when button is clicked', async () => {
    const { user } = renderWithUser(<EnvironmentManager />);
    await waitFor(() => {
      expect(screen.getByText('Add Environment')).toBeInTheDocument();
    });
    // Click the header Add Environment button
    const buttons = screen.getAllByText('Add Environment');
    await user.click(buttons[0]);

    await waitFor(() => {
      expect(screen.getByText('Enter details for the Eightfold instance')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('e.g. Production')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://api.eightfold.ai')).toBeInTheDocument();
  });

  it('should show Cancel and Add buttons in the modal', async () => {
    const { user } = renderWithUser(<EnvironmentManager />);
    await waitFor(() => {
      expect(screen.getByText('Add Environment')).toBeInTheDocument();
    });
    const buttons = screen.getAllByText('Add Environment');
    await user.click(buttons[0]);

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
    expect(screen.getByText('Add')).toBeInTheDocument();
  });
});
