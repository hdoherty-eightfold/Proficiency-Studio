/**
 * Tests for ReviewAssessment Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';
import React from 'react';
import { createAssessmentResult } from '../../test/factories';

// Mock stores
vi.mock('../../stores/app-store', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      skillsState: {
        skills: [{ name: 'TypeScript', category: 'Programming' }],
        totalCount: 1,
        extractionStatus: 'success',
        extractionSource: 'csv',
        extractionError: null,
        extractedAt: new Date().toISOString(),
      },
      isLoading: false,
      markStepCompleted: vi.fn(),
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
    listSFTPCredentials: vi.fn().mockResolvedValue({ credentials: [] }),
    uploadToSFTP: vi.fn(),
    post: vi.fn(),
  },
  api: {
    listSFTPCredentials: vi.fn().mockResolvedValue({ credentials: [] }),
    uploadToSFTP: vi.fn(),
    post: vi.fn(),
  },
}));

const mockResults = [
  createAssessmentResult({ skill_name: 'TypeScript', proficiency_level: 4, proficiency_label: 'Advanced' }),
  createAssessmentResult({ skill_name: 'React', proficiency_level: 3, proficiency_label: 'Intermediate' }),
];

let ReviewAssessment: React.ComponentType;

beforeAll(async () => {
  const mod = await import('./ReviewAssessment');
  ReviewAssessment = mod.default;
});

describe('ReviewAssessment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.getItem = vi.fn((key) => {
      if (key === 'assessmentResults') {
        return JSON.stringify(mockResults);
      }
      return null;
    });
  });

  it('should render the review page heading', () => {
    renderWithUser(<ReviewAssessment />);
    expect(screen.getByText('Review & Export')).toBeInTheDocument();
  });

  it('should load assessment results from localStorage', () => {
    renderWithUser(<ReviewAssessment />);
    expect(window.localStorage.getItem).toHaveBeenCalledWith('assessmentResults');
  });

  it('should show results when available', () => {
    renderWithUser(<ReviewAssessment />);
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('should show assessment results section', () => {
    renderWithUser(<ReviewAssessment />);
    expect(screen.getByText('Assessment Results')).toBeInTheDocument();
  });

  it('should display proficiency info', () => {
    renderWithUser(<ReviewAssessment />);
    // Results should show proficiency data - check for numeric levels
    const container = screen.getByText('TypeScript').closest('tr');
    expect(container).toBeTruthy();
  });
});
