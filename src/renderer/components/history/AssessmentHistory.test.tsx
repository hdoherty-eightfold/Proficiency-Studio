/**
 * Tests for AssessmentHistory Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen, waitFor } from '../../test/utils/render';
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

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ status: 'success', assessments: [] }),
    post: vi.fn().mockResolvedValue({ status: 'success' }),
    delete: vi.fn().mockResolvedValue({ status: 'success' }),
  },
  api: {
    get: vi.fn().mockResolvedValue({ status: 'success', assessments: [] }),
    post: vi.fn().mockResolvedValue({ status: 'success' }),
    delete: vi.fn().mockResolvedValue({ status: 'success' }),
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
    expect(screen.getByText('Run an assessment to see it appear here.')).toBeInTheDocument();
  });

  it('should render filter controls', async () => {
    renderWithUser(<AssessmentHistory />);
    await waitFor(() => {
      expect(screen.getByText('Environment')).toBeInTheDocument();
    });
    expect(screen.getByText('Model Provider')).toBeInTheDocument();
    expect(screen.getByText('Limit')).toBeInTheDocument();
  });

  it('should render the Refresh button', async () => {
    renderWithUser(<AssessmentHistory />);
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  it('should render the Compare Mode button', async () => {
    renderWithUser(<AssessmentHistory />);
    await waitFor(() => {
      expect(screen.getByText('Compare Mode')).toBeInTheDocument();
    });
  });
});
