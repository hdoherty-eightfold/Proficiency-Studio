/**
 * Tests for PromptEditor Component
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
    listConfigurations: vi.fn().mockResolvedValue({ configurations: [] }),
    createConfiguration: vi.fn().mockResolvedValue({ id: 'new-1' }),
    updateConfiguration: vi.fn().mockResolvedValue({ success: true }),
    deleteConfiguration: vi.fn().mockResolvedValue({ success: true }),
    post: vi.fn().mockResolvedValue({ results: [] }),
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
}));

let PromptEditor: React.ComponentType;

beforeAll(async () => {
  const mod = await import('./PromptEditor');
  PromptEditor = mod.default;
});

describe('PromptEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the Prompt Editor heading', async () => {
    renderWithUser(<PromptEditor />);
    await waitFor(() => {
      expect(screen.getByText('Prompt Editor')).toBeInTheDocument();
    });
  });

  it('should render the description text', async () => {
    renderWithUser(<PromptEditor />);
    await waitFor(() => {
      expect(screen.getByText('Manage, test, and optimize AI prompts')).toBeInTheDocument();
    });
  });

  it('should render the Refresh and New Template buttons', async () => {
    renderWithUser(<PromptEditor />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /new template/i })).toBeInTheDocument();
  });

  it('should show Templates section heading', async () => {
    renderWithUser(<PromptEditor />);
    await waitFor(() => {
      expect(screen.getByText('Templates')).toBeInTheDocument();
    });
  });

  it('should show default templates when API returns empty', async () => {
    renderWithUser(<PromptEditor />);
    await waitFor(() => {
      expect(screen.getByText('Proficiency Assessment')).toBeInTheDocument();
    });
    expect(screen.getByText('Skill Extraction')).toBeInTheDocument();
  });
});
