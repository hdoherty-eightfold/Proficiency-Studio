/**
 * Tests for ReviewAssessment Component
 * Tests the full review page: loading, empty, error, and success states.
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { renderWithUser, screen, waitFor } from '../../test/utils/render';
import React from 'react';
import { createAssessmentResult } from '../../test/factories';

const mockSetCurrentStep = vi.fn();

vi.mock('../../stores/app-store', () => ({
  useAppStore: vi.fn((selector) => {
    const state = { setCurrentStep: mockSetCurrentStep };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

vi.mock('../../config/proficiency', () => ({
  getProficiencyBadgeClasses: vi.fn(() => 'badge-class'),
  getProficiencyNames: vi.fn(() => ['Novice', 'Developing', 'Intermediate', 'Advanced', 'Expert']),
}));

// Mock ExportActions
vi.mock('./ExportActions', () => ({
  ExportActions: () => <div data-testid="export-actions">Export Actions</div>,
}));

// Mock ErrorDisplay
vi.mock('../common/ErrorDisplay', () => ({
  ErrorDisplay: ({ error, onRetry }: { error: string; onRetry?: () => void }) => (
    <div role="alert" data-testid="error-display">
      <span>{error}</span>
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

const mockListSaved = vi.fn();
const mockLoadSaved = vi.fn();

function setElectronMock() {
  // Use Object.assign to mutate the existing object (avoids 'Cannot redefine property')
  Object.assign(window.electron as Record<string, unknown>, {
    assessmentStorage: {
      listSaved: mockListSaved,
      loadSaved: mockLoadSaved,
    },
  });
}

let ReviewAssessment: React.ComponentType;

beforeAll(async () => {
  const mod = await import('./ReviewAssessment');
  ReviewAssessment = mod.default;
});

describe('ReviewAssessment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setElectronMock();
  });

  it('shows loading spinner while fetching', () => {
    // listSaved never resolves — stays in loading state
    mockListSaved.mockReturnValue(new Promise(() => {}));
    renderWithUser(<ReviewAssessment />);
    expect(screen.getByText(/loading latest assessment/i)).toBeInTheDocument();
  });

  it('shows empty state when no assessments exist', async () => {
    mockListSaved.mockResolvedValue({ success: true, assessments: [] });
    renderWithUser(<ReviewAssessment />);

    await waitFor(() => {
      expect(screen.getByText(/no assessments yet/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /run assessment/i })).toBeInTheDocument();
  });

  it('navigates to step 4 from empty state CTA', async () => {
    mockListSaved.mockResolvedValue({ success: true, assessments: [] });
    const { user } = renderWithUser(<ReviewAssessment />);

    await waitFor(() => screen.getByRole('button', { name: /run assessment/i }));
    await user.click(screen.getByRole('button', { name: /run assessment/i }));
    expect(mockSetCurrentStep).toHaveBeenCalledWith(4);
  });

  it('shows error state when listSaved fails', async () => {
    mockListSaved.mockResolvedValue({ success: false, error: 'Storage unavailable' });
    renderWithUser(<ReviewAssessment />);

    await waitFor(() => {
      expect(screen.getByTestId('error-display')).toBeInTheDocument();
    });
    expect(screen.getByText(/failed to load assessment/i)).toBeInTheDocument();
  });

  it('shows error state when listSaved throws', async () => {
    mockListSaved.mockRejectedValue(new Error('Network error'));
    renderWithUser(<ReviewAssessment />);

    await waitFor(() => {
      expect(screen.getByTestId('error-display')).toBeInTheDocument();
    });
  });

  it('retries when retry button is clicked', async () => {
    mockListSaved
      .mockResolvedValueOnce({ success: false, error: 'First attempt failed' })
      .mockResolvedValueOnce({ success: true, assessments: [] });

    const { user } = renderWithUser(<ReviewAssessment />);

    await waitFor(() => screen.getByRole('button', { name: /retry/i }));
    await user.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(mockListSaved).toHaveBeenCalledTimes(2);
    });
  });

  describe('with loaded assessment data', () => {
    const mockAssessments = [
      createAssessmentResult({
        skill_name: 'TypeScript',
        proficiency_numeric: 4,
        confidence_score: 0.9,
      }),
      createAssessmentResult({
        skill_name: 'Python',
        proficiency_numeric: 3,
        confidence_score: 0.75,
        reasoning: 'A beginner-friendly language with versatile applications.',
      }),
      createAssessmentResult({
        skill_name: 'React',
        proficiency_numeric: 5,
        confidence_score: 0.85,
      }),
    ];

    const mockMeta = {
      filename: 'assessment_2026.json',
      saved_at: '2026-04-07T10:00:00Z',
      total_skills: 3,
      avg_proficiency: 4.0,
      avg_confidence: 0.83,
      model_used: 'gemini-3.1-flash',
      provider: 'google',
      processing_time: 12.5,
      content_hash: 'abc123',
      extraction_source: 'csv',
      source_filename: 'skills.csv',
      environment_name: 'Production',
      total_tokens: 1500,
      estimated_cost: 0.002,
      success_rate: 1.0,
    };

    beforeEach(() => {
      mockListSaved.mockResolvedValue({
        success: true,
        assessments: [mockMeta],
      });
      mockLoadSaved.mockResolvedValue({
        success: true,
        data: {
          results: {
            assessments: mockAssessments,
            total_skills: 3,
            avg_proficiency: 4.0,
            processing_time: 12.5,
            model_used: 'gemini-3.1-flash',
            timestamp: '2026-04-07T10:00:00Z',
            total_tokens: 1500,
            estimated_cost: 0.002,
          },
        },
      });
    });

    it('renders assessment review heading', async () => {
      renderWithUser(<ReviewAssessment />);
      await waitFor(() => {
        expect(screen.getByText(/assessment review/i)).toBeInTheDocument();
      });
    });

    it('shows summary stat cards', async () => {
      renderWithUser(<ReviewAssessment />);
      await waitFor(() => {
        // Check for the stat label, not just the number (which also appears in row numbers)
        expect(screen.getByText(/total skills/i)).toBeInTheDocument();
        expect(screen.getByText(/avg proficiency/i)).toBeInTheDocument();
      });
    });

    it('renders all skills in the results table', async () => {
      renderWithUser(<ReviewAssessment />);
      await waitFor(() => {
        expect(screen.getByText('TypeScript')).toBeInTheDocument();
        expect(screen.getByText('Python')).toBeInTheDocument();
        expect(screen.getByText('React')).toBeInTheDocument();
      });
    });

    it('filters skills by search term', async () => {
      const { user } = renderWithUser(<ReviewAssessment />);

      await waitFor(() => screen.getByLabelText(/search skills/i));
      await user.type(screen.getByLabelText(/search skills/i), 'Typ');

      await waitFor(() => {
        expect(screen.getByText('TypeScript')).toBeInTheDocument();
        expect(screen.queryByText('Python')).not.toBeInTheDocument();
      });
    });

    it('renders ExportActions panel', async () => {
      renderWithUser(<ReviewAssessment />);
      await waitFor(() => {
        expect(screen.getByTestId('export-actions')).toBeInTheDocument();
      });
    });

    it('navigates to step 4 when Run New Assessment is clicked', async () => {
      const { user } = renderWithUser(<ReviewAssessment />);

      await waitFor(() => screen.getByRole('button', { name: /run new assessment/i }));
      await user.click(screen.getByRole('button', { name: /run new assessment/i }));
      expect(mockSetCurrentStep).toHaveBeenCalledWith(4);
    });

    it('refreshes data when Refresh button is clicked', async () => {
      const { user } = renderWithUser(<ReviewAssessment />);

      await waitFor(() => screen.getByRole('button', { name: /refresh/i }));
      await user.click(screen.getByRole('button', { name: /refresh/i }));

      await waitFor(() => {
        expect(mockListSaved).toHaveBeenCalledTimes(2);
      });
    });
  });
});
