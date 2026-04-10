/**
 * Tests for ConfigurationManager Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen, waitFor } from '../../test/utils/render';
import React from 'react';

vi.mock('../../stores/toast-store', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({ id: 'new-config' }),
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../../config/proficiency', () => ({
  DEFAULT_PROFICIENCY_LEVELS: [
    { level: 1, name: 'Novice', description: 'Beginner', color: '#ef4444' },
  ],
  ensureLevelsHaveColors: vi.fn((levels: unknown[]) => levels),
}));

const defaultProps = {
  currentConfig: {
    proficiencyLevels: [{ level: 1, name: 'Novice', description: 'Beginner', color: '#ef4444' }],
    llmConfig: {
      provider: 'google',
      model: 'gemini-3.1-flash-lite-preview',
      temperature: 0.3,
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
    localStorage.clear();
  });

  it('should render the Template Library title', () => {
    renderWithUser(<ConfigurationManager {...defaultProps} />);
    expect(screen.getByText('Template Library')).toBeInTheDocument();
  });

  it('should render the close button', () => {
    renderWithUser(<ConfigurationManager {...defaultProps} />);
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('should render the New Template button', () => {
    renderWithUser(<ConfigurationManager {...defaultProps} />);
    expect(screen.getByRole('button', { name: /new template/i })).toBeInTheDocument();
  });

  it('should show the create form when New Template is clicked', async () => {
    const { user } = renderWithUser(<ConfigurationManager {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /new template/i }));

    // The right panel transitions to the create form
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save template/i })).toBeInTheDocument();
    });
  });

  it('should call onClose when the close button is clicked', async () => {
    const { user } = renderWithUser(<ConfigurationManager {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should show empty state when no configs are loaded', async () => {
    renderWithUser(<ConfigurationManager {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/no saved templates yet/i)).toBeInTheDocument();
    });
  });

  it('should show loaded configs in the sidebar', async () => {
    const { api } = await import('../../services/api');
    vi.mocked(api.get).mockResolvedValueOnce([
      {
        id: 'config-1',
        name: 'My Assessment',
        description: 'Test config',
        proficiency_levels: [],
        llm_config: { provider: 'google', model: 'gemini', temperature: 0.3, max_tokens: 2000 },
        prompt_template: 'test',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_default: false,
      },
    ]);

    renderWithUser(<ConfigurationManager {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('My Assessment')).toBeInTheDocument();
    });
  });
});
