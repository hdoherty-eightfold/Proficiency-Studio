/**
 * Tests for SFTPManager Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen, waitFor } from '../../test/utils/render';
import React from 'react';

// Mock api service
vi.mock('../../services/api', () => ({
  api: {
    listSFTPCredentials: vi.fn().mockResolvedValue({ credentials: [] }),
    testSFTPConnection: vi.fn(),
    browseSFTP: vi.fn(),
    downloadFromSFTP: vi.fn(),
    extractSkillsFromSFTP: vi.fn(),
    createSFTPCredential: vi.fn(),
    updateSFTPCredential: vi.fn(),
    deleteSFTPCredential: vi.fn(),
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

// Mock app store
vi.mock('../../stores/app-store', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      setSkillsState: vi.fn(),
      nextStep: vi.fn(),
      autoAdvanceEnabled: false,
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

// Dynamic import to apply mocks first
let SFTPManager: React.FC<{
  onFileSelected?: (content: string, filename: string) => void;
  mode?: 'browse' | 'select';
}>;

beforeAll(async () => {
  const mod = await import('./SFTPManager');
  SFTPManager = mod.default;
});

describe('SFTPManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the heading and description', async () => {
    renderWithUser(<SFTPManager />);
    await waitFor(() => {
      expect(screen.getByText('SFTP Server Connection')).toBeInTheDocument();
    });
    expect(screen.getByText('Connect to SFTP servers to download files')).toBeInTheDocument();
  });

  it('should render Add Server button', async () => {
    renderWithUser(<SFTPManager />);
    await waitFor(() => {
      expect(screen.getByText('Add Server')).toBeInTheDocument();
    });
  });

  it('should show empty state when no credentials exist', async () => {
    renderWithUser(<SFTPManager />);
    await waitFor(() => {
      expect(screen.getByText('No SFTP Servers')).toBeInTheDocument();
    });
    expect(screen.getByText('Add an SFTP server to download files')).toBeInTheDocument();
    expect(screen.getByText('Add Your First Server')).toBeInTheDocument();
  });

  it('should show credential form when Add Server is clicked', async () => {
    const { user } = renderWithUser(<SFTPManager />);
    await waitFor(() => {
      expect(screen.getByText('Add Server')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Add Server'));

    expect(screen.getByText('New SFTP Server')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByText('Port')).toBeInTheDocument();
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('should show Cancel and Save buttons in the form', async () => {
    const { user } = renderWithUser(<SFTPManager />);
    await waitFor(() => {
      expect(screen.getByText('Add Server')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Add Server'));

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });
});
