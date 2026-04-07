/**
 * Tests for AssessmentHistory Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen, waitFor } from '../../test/utils/render';
import { createSavedAssessment, createSavedAssessments } from '../../test/factories';
import React from 'react';

// Mock stores
vi.mock('../../stores/app-store', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      isLoading: false,
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

vi.mock('../../stores/toast-store', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
  useToastStore: vi.fn(() => ({
    addToast: vi.fn(),
  })),
}));

vi.mock('../../services/electron-api', () => ({
  electronAPI: {
    listSavedAssessments: vi.fn().mockResolvedValue({
      success: true,
      assessments: [],
    }),
    loadSavedAssessment: vi.fn().mockResolvedValue({
      success: true,
      data: null,
    }),
    deleteSavedAssessment: vi.fn().mockResolvedValue({
      success: true,
    }),
  },
}));

let AssessmentHistory: React.ComponentType;

beforeAll(async () => {
  const mod = await import('./AssessmentHistory');
  AssessmentHistory = mod.default;
});

describe('AssessmentHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the assessment history heading', async () => {
    renderWithUser(<AssessmentHistory />);
    await waitFor(() => {
      expect(screen.getByText('Assessment History')).toBeInTheDocument();
    });
  });

  it('should show empty state when no assessments exist', async () => {
    renderWithUser(<AssessmentHistory />);
    await waitFor(() => {
      expect(screen.getByText('No Assessments Found')).toBeInTheDocument();
    });
    expect(screen.getByText(/Run a proficiency assessment/)).toBeInTheDocument();
  });

  it('should render the Refresh button', async () => {
    renderWithUser(<AssessmentHistory />);
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  it('should show assessments when data exists', async () => {
    const { electronAPI } = await import('../../services/electron-api');
    const saved = createSavedAssessment({
      model_used: 'gemini-3.1-flash-lite-preview',
      total_skills: 10,
      avg_confidence: 0.85,
    });
    vi.mocked(electronAPI.listSavedAssessments).mockResolvedValueOnce({
      success: true,
      assessments: [saved],
    });

    renderWithUser(<AssessmentHistory />);
    await waitFor(() => {
      expect(screen.getByText('gemini-3.1-flash-lite-preview')).toBeInTheDocument();
    });
    // Verify skill count and confidence are rendered correctly
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('should show multiple assessments from factory', async () => {
    const { electronAPI } = await import('../../services/electron-api');
    const saved = createSavedAssessments(3);
    vi.mocked(electronAPI.listSavedAssessments).mockResolvedValueOnce({
      success: true,
      assessments: saved,
    });

    renderWithUser(<AssessmentHistory />);
    await waitFor(() => {
      // All 3 assessments should have model names visible
      const modelCells = screen.getAllByText('gemini-3.1-flash-lite-preview');
      expect(modelCells.length).toBeGreaterThanOrEqual(3);
    });
  });
});
