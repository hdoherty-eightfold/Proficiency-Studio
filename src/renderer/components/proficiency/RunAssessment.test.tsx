/**
 * Tests for RunAssessment Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';
import React from 'react';

// Mock stores
vi.mock('../../stores/app-store', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      skillsState: {
        skills: [
          { name: 'TypeScript', category: 'Programming' },
          { name: 'React', category: 'Frontend' },
        ],
        totalCount: 2,
        extractionStatus: 'success',
        extractionSource: 'csv',
        extractionError: null,
        extractedAt: new Date().toISOString(),
      },
      uploadedFile: null,
      isLoading: false,
      error: null,
      nextStep: vi.fn(),
      markStepCompleted: vi.fn(),
      setError: vi.fn(),
      setLoading: vi.fn(),
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
    streamAssessment: vi.fn().mockResolvedValue({ streamId: 'test-stream' }),
    onAssessmentEvent: vi.fn().mockReturnValue(() => {}),
    cancelAssessment: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
  api: {
    post: vi.fn(),
  },
}));

let RunAssessment: React.ComponentType;

beforeAll(async () => {
  const mod = await import('./RunAssessment');
  RunAssessment = mod.default;
});

describe('RunAssessment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.getItem = vi.fn((key) => {
      if (key === 'profstudio_proficiency_config') {
        return JSON.stringify({
          provider: 'google',
          model: 'gemini-3.1-flash-lite-preview',
          api_key: 'test-key',
          proficiency_levels: [
            { level: 1, name: 'Novice', description: 'Beginner', color: '#gray' },
            { level: 2, name: 'Expert', description: 'Advanced', color: '#purple' },
          ],
          prompt_template: 'Test prompt',
        });
      }
      return null;
    });
  });

  it('should render the assessment page heading', () => {
    renderWithUser(<RunAssessment />);
    expect(screen.getByText('Run Proficiency Assessment')).toBeInTheDocument();
  });

  it('should show skill information in the UI', () => {
    renderWithUser(<RunAssessment />);
    // Component should render ready state with skill data
    expect(screen.getByText(/Ready to assess/i)).toBeInTheDocument();
  });

  it('should have a start assessment button', () => {
    renderWithUser(<RunAssessment />);
    expect(screen.getByText(/Start Assessment/i)).toBeInTheDocument();
  });

  it('should show batching controls', () => {
    renderWithUser(<RunAssessment />);
    expect(screen.getByText(/Batching/i)).toBeInTheDocument();
  });
});
