/**
 * Tests for RoleManager Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen, waitFor } from '../../test/utils/render';
import React from 'react';

// Mock api service
vi.mock('../../services/api', () => ({
  api: {
    getRoles: vi.fn().mockResolvedValue({ roles: [] }),
    createRole: vi.fn(),
    updateRoleProficiencies: vi.fn(),
    deleteRole: vi.fn(),
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
let RoleManager: React.FC<{
  environmentId?: string;
  onRoleSelect?: (role: unknown) => void;
  mode?: 'manage' | 'select';
}>;

beforeAll(async () => {
  const mod = await import('./RoleManager');
  RoleManager = mod.default;
});

describe('RoleManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the heading and description', async () => {
    renderWithUser(<RoleManager />);
    await waitFor(() => {
      expect(screen.getByText('Role Management')).toBeInTheDocument();
    });
    expect(screen.getByText('Create, edit, and manage roles with skill requirements')).toBeInTheDocument();
  });

  it('should render Refresh and New Role buttons in manage mode', async () => {
    renderWithUser(<RoleManager mode="manage" />);
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
    expect(screen.getByText('New Role')).toBeInTheDocument();
  });

  it('should render search input', async () => {
    renderWithUser(<RoleManager />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search roles...')).toBeInTheDocument();
    });
  });

  it('should render department filter dropdown', async () => {
    renderWithUser(<RoleManager />);
    await waitFor(() => {
      expect(screen.getByText('All Departments')).toBeInTheDocument();
    });
  });

  it('should show empty state when no roles exist', async () => {
    renderWithUser(<RoleManager />);
    await waitFor(() => {
      expect(screen.getByText('No roles found')).toBeInTheDocument();
    });
    expect(screen.getByText('Create your first role')).toBeInTheDocument();
  });

  it('should not show New Role button in select mode', async () => {
    renderWithUser(<RoleManager mode="select" />);
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
    expect(screen.queryByText('New Role')).not.toBeInTheDocument();
  });
});
