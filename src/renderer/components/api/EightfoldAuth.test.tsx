/**
 * Tests for EightfoldAuth Component
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { renderWithUser, screen, waitFor } from '../../test/utils/render';
import React from 'react';

// Mock app store
const mockSetSkillsState = vi.fn();
const mockNextStep = vi.fn();

vi.mock('../../stores/app-store', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      setSkillsState: mockSetSkillsState,
      nextStep: mockNextStep,
      autoAdvanceEnabled: false,
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

// Mock toast store
const mockToast = vi.fn();
vi.mock('../../stores/toast-store', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock api service
const mockGetEnvironments = vi.fn();
vi.mock('../../services/api', () => ({
  api: {
    getEnvironments: (...args: unknown[]) => mockGetEnvironments(...args),
    eightfoldLogin: vi.fn(),
    getRoles: vi.fn(),
    extractSkillsFromAPI: vi.fn(),
    createEnvironment: vi.fn(),
    updateEnvironment: vi.fn(),
    deleteEnvironment: vi.fn(),
  },
}));

let EightfoldAuth: React.ComponentType<{ onSkillsExtracted?: () => void }>;

beforeAll(async () => {
  const mod = await import('./EightfoldAuth');
  EightfoldAuth = mod.default;
});

describe('EightfoldAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEnvironments.mockResolvedValue({ environments: [] });
  });

  it('should render the heading', async () => {
    renderWithUser(<EightfoldAuth />);
    expect(screen.getByText('Eightfold API Connection')).toBeInTheDocument();
    expect(
      screen.getByText('Connect to Eightfold to fetch roles and skills')
    ).toBeInTheDocument();
  });

  it('should show Add Environment button', async () => {
    renderWithUser(<EightfoldAuth />);
    expect(screen.getByText('Add Environment')).toBeInTheDocument();
  });

  it('should show environment form when Add Environment is clicked', async () => {
    const { user } = renderWithUser(<EightfoldAuth />);
    await user.click(screen.getByText('Add Environment'));
    expect(screen.getByText('New Eightfold Environment')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Production Environment')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://app.eightfold.ai')).toBeInTheDocument();
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('should show empty state when no environments exist', async () => {
    mockGetEnvironments.mockResolvedValue({ environments: [] });
    renderWithUser(<EightfoldAuth />);
    await waitFor(() => {
      expect(screen.getByText('No Environments')).toBeInTheDocument();
    });
    expect(
      screen.getByText('Add an Eightfold environment to get started')
    ).toBeInTheDocument();
  });
});
