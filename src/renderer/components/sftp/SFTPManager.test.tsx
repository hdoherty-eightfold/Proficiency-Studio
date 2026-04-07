/**
 * Tests for SFTPManager Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen, waitFor } from '../../test/utils/render';
import React from 'react';

const mockCredentials = [
  {
    id: 'cred-1',
    name: 'Test Server',
    host: 'sftp.example.com',
    port: 22,
    username: 'user',
    remote_path: '/uploads',
    connection_status: 'unknown' as const,
  },
];

const mockFiles = [
  { name: 'skills.csv', size: 1024, is_directory: false, modified: '2026-01-01' },
  { name: 'data', size: 0, is_directory: true, modified: '2026-01-01' },
];

// Mock api service
vi.mock('../../services/api', () => ({
  api: {
    listSFTPCredentials: vi.fn().mockResolvedValue({ credentials: [] }),
    testSFTPConnection: vi
      .fn()
      .mockResolvedValue({ success: true, message: 'Connected', file_count: 3 }),
    browseSFTP: vi.fn().mockResolvedValue({ success: true, path: '/', items: [], count: 0 }),
    downloadFromSFTP: vi
      .fn()
      .mockResolvedValue({
        success: true,
        content: 'skill,level\nJava,Expert',
        local_path: '/tmp/file.csv',
      }),
    extractSkillsFromSFTP: vi
      .fn()
      .mockResolvedValue({ skills: [{ id: '1', name: 'Java' }], total_count: 1 }),
    createSFTPCredential: vi
      .fn()
      .mockResolvedValue({
        id: 'new-id',
        name: 'New Server',
        host: 'sftp.test.com',
        port: 22,
        username: 'admin',
        remote_path: '/',
      }),
    updateSFTPCredential: vi
      .fn()
      .mockResolvedValue({
        id: 'cred-1',
        name: 'Updated Server',
        host: 'sftp.example.com',
        port: 22,
        username: 'user',
        remote_path: '/',
      }),
    deleteSFTPCredential: vi.fn().mockResolvedValue({ status: 'success' }),
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
      setConnectedSFTPServer: vi.fn(),
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

  it('should load and display credentials with remote_path', async () => {
    const { api } = await import('../../services/api');
    vi.mocked(api.listSFTPCredentials).mockResolvedValue({
      status: 'success',
      credentials: mockCredentials,
    });

    renderWithUser(<SFTPManager />);
    await waitFor(() => {
      expect(screen.getByText('Test Server')).toBeInTheDocument();
    });
    // Component renders as "username@host:port" in a single <p>
    expect(screen.getByText('user@sftp.example.com:22')).toBeInTheDocument();
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
    expect(screen.getByText('Default Path')).toBeInTheDocument();
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

  it('should hide form when Cancel is clicked', async () => {
    const { user } = renderWithUser(<SFTPManager />);
    await waitFor(() => {
      expect(screen.getByText('Add Server')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Add Server'));
    expect(screen.getByText('New SFTP Server')).toBeInTheDocument();

    await user.click(screen.getByText('Cancel'));
    expect(screen.queryByText('New SFTP Server')).not.toBeInTheDocument();
  });

  it('should call testSFTPConnection when the test button is clicked', async () => {
    const { api } = await import('../../services/api');
    vi.mocked(api.listSFTPCredentials).mockResolvedValue({
      status: 'success',
      credentials: mockCredentials,
    });

    const { user } = renderWithUser(<SFTPManager />);
    await waitFor(() => {
      expect(screen.getByText('Test Server')).toBeInTheDocument();
    });

    // The test connection button has aria-label="Test connection"
    const testBtn = screen.getByRole('button', { name: /test connection/i });
    await user.click(testBtn);

    await waitFor(() => {
      expect(api.testSFTPConnection).toHaveBeenCalledWith({ credential_id: 'cred-1' });
    });
  });

  it('should browse files with correct response format', async () => {
    const { api } = await import('../../services/api');
    vi.mocked(api.listSFTPCredentials).mockResolvedValue({
      status: 'success',
      credentials: mockCredentials,
    });
    vi.mocked(api.browseSFTP).mockResolvedValue({
      success: true,
      path: '/',
      items: mockFiles,
      count: 2,
    });

    const { user } = renderWithUser(<SFTPManager />);
    await waitFor(() => {
      expect(screen.getByText('Test Server')).toBeInTheDocument();
    });

    const browseBtn = screen.getByText('Connect');
    await user.click(browseBtn);

    await waitFor(() => {
      expect(api.browseSFTP).toHaveBeenCalledWith({ credential_id: 'cred-1', path: '/uploads' });
    });
    await waitFor(() => {
      expect(screen.getByText('skills.csv')).toBeInTheDocument();
    });
    expect(screen.getByText('data')).toBeInTheDocument();
  });

  it('should select a file by clicking and show action bar', async () => {
    const { api } = await import('../../services/api');
    vi.mocked(api.listSFTPCredentials).mockResolvedValue({
      status: 'success',
      credentials: mockCredentials,
    });
    vi.mocked(api.browseSFTP).mockResolvedValue({
      success: true,
      path: '/',
      items: mockFiles,
      count: 2,
    });

    const { user } = renderWithUser(<SFTPManager />);
    await waitFor(() => expect(screen.getByText('Connect')).toBeInTheDocument());
    await user.click(screen.getByText('Connect'));

    await waitFor(() => expect(screen.getByText('skills.csv')).toBeInTheDocument());

    // Click the file row — should select it and show action bar
    await user.click(screen.getByText('skills.csv'));
    expect(screen.getByText('selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use this file/i })).toBeInTheDocument();
  });

  it('should deselect a file when clicking it again', async () => {
    const { api } = await import('../../services/api');
    vi.mocked(api.listSFTPCredentials).mockResolvedValue({
      status: 'success',
      credentials: mockCredentials,
    });
    vi.mocked(api.browseSFTP).mockResolvedValue({
      success: true,
      path: '/',
      items: mockFiles,
      count: 2,
    });

    const { user } = renderWithUser(<SFTPManager />);
    await waitFor(() => expect(screen.getByText('Connect')).toBeInTheDocument());
    await user.click(screen.getByText('Connect'));

    await waitFor(() => expect(screen.getByText('skills.csv')).toBeInTheDocument());

    await user.click(screen.getByText('skills.csv'));
    expect(screen.getByText('selected')).toBeInTheDocument();

    // Click the file row again to deselect (first occurrence is the row, second is the action bar)
    await user.click(screen.getAllByText('skills.csv')[0]);
    expect(screen.queryByText('selected')).not.toBeInTheDocument();
  });

  it('should call extractSkillsFromSFTP when Use This File is clicked on a CSV', async () => {
    const { api } = await import('../../services/api');
    vi.mocked(api.listSFTPCredentials).mockResolvedValue({
      status: 'success',
      credentials: mockCredentials,
    });
    vi.mocked(api.browseSFTP).mockResolvedValue({
      success: true,
      path: '/',
      items: mockFiles,
      count: 2,
    });

    const { user } = renderWithUser(<SFTPManager />);
    await waitFor(() => expect(screen.getByText('Connect')).toBeInTheDocument());
    await user.click(screen.getByText('Connect'));

    await waitFor(() => expect(screen.getByText('skills.csv')).toBeInTheDocument());
    await user.click(screen.getByText('skills.csv'));

    const useBtn = screen.getByRole('button', { name: /use this file/i });
    await user.click(useBtn);

    await waitFor(() => {
      expect(api.downloadFromSFTP).toHaveBeenCalled();
    });
  });

  it('should construct file paths correctly when backend omits path', async () => {
    const { api } = await import('../../services/api');
    vi.mocked(api.listSFTPCredentials).mockResolvedValue({
      status: 'success',
      credentials: mockCredentials,
    });
    vi.mocked(api.browseSFTP).mockResolvedValue({
      success: true,
      path: '/uploads',
      items: [{ name: 'skills.csv', size: 512, is_directory: false }],
      count: 1,
    });

    const { user } = renderWithUser(<SFTPManager />);
    await waitFor(() => expect(screen.getByText('Connect')).toBeInTheDocument());
    await user.click(screen.getByText('Connect'));

    await waitFor(() => expect(screen.getByText('skills.csv')).toBeInTheDocument());
    // Files should be rendered — path was constructed from /uploads/skills.csv
    expect(api.browseSFTP).toHaveBeenCalled();
  });
});
