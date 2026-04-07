/**
 * Tests for EnvironmentManager Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen, waitFor } from '../../test/utils/render';
import { createSFTPCredential } from '../../test/factories';
import React from 'react';

const mockSFTPCredentials = [
  createSFTPCredential({
    id: 'sftp-1',
    name: 'Production SFTP',
    host: 'sftp.prod.example.com',
    port: 22,
    username: 'deploy',
    remote_path: '/data/uploads',
  }),
];

// Mock api service
vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    listSFTPCredentials: vi.fn().mockResolvedValue({ status: 'success', credentials: [] }),
    createSFTPCredential: vi
      .fn()
      .mockResolvedValue({
        id: 'new-id',
        name: 'Test',
        host: 'sftp.test.com',
        port: 22,
        username: 'user',
        remote_path: '/',
      }),
    updateSFTPCredential: vi
      .fn()
      .mockResolvedValue({
        id: 'sftp-1',
        name: 'Updated',
        host: 'sftp.prod.example.com',
        port: 22,
        username: 'deploy',
        remote_path: '/data',
      }),
    deleteSFTPCredential: vi.fn().mockResolvedValue({ status: 'success' }),
    // Uses success: true (not connected: true) to match backend's ConnectionTestResult
    testSFTPConnection: vi
      .fn()
      .mockResolvedValue({ success: true, message: 'Connected', file_count: 5 }),
  },
}));

// Mock electron-api
vi.mock('../../services/electron-api', () => ({
  electronAPI: {},
}));

// Mock toast store
const mockToast = vi.fn();
vi.mock('../../stores/toast-store', () => ({
  useToast: () => ({
    toast: mockToast,
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
    expect(
      screen.getByText('Manage your Eightfold environments and connections')
    ).toBeInTheDocument();
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
    expect(
      screen.getByText('Add your first Eightfold environment to get started')
    ).toBeInTheDocument();
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

  it('should show SFTP Connections section', async () => {
    renderWithUser(<EnvironmentManager />);
    await waitFor(() => {
      expect(screen.getByText('SFTP Connections')).toBeInTheDocument();
    });
    expect(
      screen.getByText('Manage remote server connections for file uploads')
    ).toBeInTheDocument();
  });

  it('should show SFTP empty state with Add Connection button', async () => {
    renderWithUser(<EnvironmentManager />);
    await waitFor(() => {
      expect(screen.getByText('No SFTP Connections')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Add Connection').length).toBeGreaterThanOrEqual(1);
  });

  it('should display loaded SFTP credentials with remote_path', async () => {
    const { api } = await import('../../services/api');
    vi.mocked(api.listSFTPCredentials).mockResolvedValue({
      status: 'success',
      credentials: mockSFTPCredentials,
    });

    renderWithUser(<EnvironmentManager />);
    await waitFor(() => {
      expect(screen.getByText('Production SFTP')).toBeInTheDocument();
    });
    expect(screen.getByText('deploy@sftp.prod.example.com:22')).toBeInTheDocument();
    expect(screen.getByText('Path: /data/uploads')).toBeInTheDocument();
  });

  it('should call testSFTPConnection with credential_id and show success', async () => {
    const { api } = await import('../../services/api');
    vi.mocked(api.listSFTPCredentials).mockResolvedValue({
      status: 'success',
      credentials: mockSFTPCredentials,
    });

    const { user } = renderWithUser(<EnvironmentManager />);
    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Test'));

    await waitFor(() => {
      expect(api.testSFTPConnection).toHaveBeenCalledWith({ credential_id: 'sftp-1' });
    });
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('Connected') })
      );
    });
  });

  it('should show failure toast when testSFTPConnection returns success: false', async () => {
    const { api } = await import('../../services/api');
    vi.mocked(api.listSFTPCredentials).mockResolvedValue({
      status: 'success',
      credentials: mockSFTPCredentials,
    });
    vi.mocked(api.testSFTPConnection).mockResolvedValue({
      success: false,
      error: 'Authentication failed',
    });

    const { user } = renderWithUser(<EnvironmentManager />);
    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Test'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive', title: 'Connection failed' })
      );
    });
  });

  it('should show SFTP form with remote_path field when Add Connection is clicked', async () => {
    const { user } = renderWithUser(<EnvironmentManager />);
    await waitFor(() => {
      expect(screen.getByText('Add Connection')).toBeInTheDocument();
    });
    const addButtons = screen.getAllByText('Add Connection');
    await user.click(addButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Remote Path')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('/uploads')).toBeInTheDocument();
  });

  it('should save SFTP credential with remote_path field', async () => {
    const { api } = await import('../../services/api');

    const { user } = renderWithUser(<EnvironmentManager />);
    await waitFor(() => expect(screen.getAllByText('Add Connection')[0]).toBeInTheDocument());
    await user.click(screen.getAllByText('Add Connection')[0]);

    // Placeholder is "Production Server" (no "e.g." prefix)
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Production Server')).toBeInTheDocument()
    );

    await user.type(screen.getByPlaceholderText('Production Server'), 'My Server');
    await user.type(screen.getByPlaceholderText('ftp.example.com'), 'sftp.test.com');
    await user.type(screen.getByPlaceholderText('username'), 'user1');
    await user.type(screen.getByPlaceholderText('password'), 'pass123');

    // Save button text is "Add Connection" when creating (not "Save Connection")
    const addButtons = screen.getAllByText('Add Connection');
    // The submit button inside the form (last one)
    await user.click(addButtons[addButtons.length - 1]);

    await waitFor(() => {
      expect(api.createSFTPCredential).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Server',
          host: 'sftp.test.com',
          username: 'user1',
          password: 'pass123',
          remote_path: '/',
        })
      );
    });
  });
});
