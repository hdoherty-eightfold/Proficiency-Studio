/**
 * Tests for RAGSettings Component
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
    addRAGContext: vi.fn().mockResolvedValue({ success: true }),
    searchSkillsSemantic: vi.fn().mockResolvedValue({ results: [] }),
    enhancePromptWithRAG: vi.fn().mockResolvedValue({ enhanced_prompt: 'enhanced' }),
    indexSkillsForRAG: vi.fn().mockResolvedValue({ success: true }),
  },
}));

let RAGSettings: React.ComponentType<{ onSettingsChange?: (enabled: boolean) => void }>;

beforeAll(async () => {
  const mod = await import('./RAGSettings');
  RAGSettings = mod.default;
});

describe('RAGSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render the RAG Enhancement heading', () => {
    renderWithUser(<RAGSettings />);
    expect(screen.getByText('RAG Enhancement')).toBeInTheDocument();
  });

  it('should render the description text', () => {
    renderWithUser(<RAGSettings />);
    expect(
      screen.getByText('Use semantic search to enhance skill assessments with context')
    ).toBeInTheDocument();
  });

  it('should render the toggle button as Disabled initially', () => {
    renderWithUser(<RAGSettings />);
    expect(screen.getByRole('button', { name: /disabled/i })).toBeInTheDocument();
  });

  it('should show additional sections after enabling RAG', async () => {
    const { user } = renderWithUser(<RAGSettings />);
    const toggleBtn = screen.getByRole('button', { name: /disabled/i });
    await user.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByText('Context Documents')).toBeInTheDocument();
    });
    expect(screen.getByText('Semantic Skill Search')).toBeInTheDocument();
    expect(screen.getByText('Prompt Enhancement')).toBeInTheDocument();
  });

  it('should show empty state for context documents when RAG is enabled', async () => {
    const { user } = renderWithUser(<RAGSettings />);
    await user.click(screen.getByRole('button', { name: /disabled/i }));

    await waitFor(() => {
      expect(screen.getByText('No context documents added yet')).toBeInTheDocument();
    });
  });
});
