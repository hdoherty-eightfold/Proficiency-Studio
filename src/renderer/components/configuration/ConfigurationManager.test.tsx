/**
 * Tests for ConfigurationManager Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen, waitFor } from '../../test/utils/render';
import React from 'react';

// Mock stores
vi.mock('../../stores/toast-store', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({ id: 'new-config' }),
  },
}));

vi.mock('../../config/proficiency', () => ({
  DEFAULT_PROFICIENCY_LEVELS: [
    { level: 1, name: 'Novice', description: 'Beginner', color: '#ef4444' },
    { level: 2, name: 'Advanced Beginner', description: 'Some experience', color: '#f97316' },
    { level: 3, name: 'Competent', description: 'Competent', color: '#eab308' },
    { level: 4, name: 'Proficient', description: 'Proficient', color: '#3b82f6' },
    { level: 5, name: 'Expert', description: 'Expert', color: '#22c55e' },
  ],
  ensureLevelsHaveColors: vi.fn((levels: unknown[]) => levels),
}));

const defaultProps = {
  currentConfig: {
    proficiencyLevels: [
      { level: 1, name: 'Novice', description: 'Beginner', color: '#ef4444' },
    ],
    llmConfig: {
      provider: 'google',
      model: 'gemini-3.1-flash-lite-preview',
      temperature: 0.7,
      max_tokens: 2000,
      api_key: 'test-key',
    },
    promptTemplate: 'Test prompt template',
  },
  onLoad: vi.fn(),
  onClose: vi.fn(),
};

let ConfigurationManager: React.ComponentType<typeof defaultProps>;

beforeAll(async () => {
  const mod = await import('./ConfigurationManager');
  ConfigurationManager = mod.ConfigurationManager;
});

describe('ConfigurationManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the Configuration Manager title', () => {
    renderWithUser(<ConfigurationManager {...defaultProps} />);
    expect(screen.getByText('Configuration Manager')).toBeInTheDocument();
  });

  it('should render Load and Save tab buttons', () => {
    renderWithUser(<ConfigurationManager {...defaultProps} />);
    expect(screen.getByText('Load')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('should render the close button', () => {
    renderWithUser(<ConfigurationManager {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /close configuration manager/i })
    ).toBeInTheDocument();
  });

  it('should show Save tab with name and description fields when clicked', async () => {
    const { user } = renderWithUser(<ConfigurationManager {...defaultProps} />);
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
    });
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save configuration/i })).toBeInTheDocument();
  });

  it('should show fallback config when API fails', async () => {
    const { api } = await import('../../services/api');
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

    renderWithUser(<ConfigurationManager {...defaultProps} />);
    // After API call fails, fallback configs should render
    await waitFor(() => {
      expect(screen.getByText('Standard 5-Level Assessment')).toBeInTheDocument();
    });
  });
});
