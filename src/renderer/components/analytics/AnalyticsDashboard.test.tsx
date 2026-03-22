/**
 * Tests for AnalyticsDashboard Component
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
    getAnalyticsOverview: vi.fn().mockResolvedValue({ total_assessments: 10, total_skills: 50, avg_confidence: 85, avg_processing_time: 2.1, assessments_change: 5, confidence_change: 2 }),
    getModelPerformance: vi.fn().mockResolvedValue({ models: [{ provider: 'OpenAI', model: 'GPT-4o', assessments: 5, avg_confidence: 88, avg_latency_ms: 1200, accuracy_score: 4.2 }] }),
    getVolumeData: vi.fn().mockResolvedValue({ daily: [{ date: '2026-03-01', count: 3 }] }),
    getTopSkills: vi.fn().mockResolvedValue({ skills: [{ skill: 'TypeScript', assessments: 8, avg_proficiency: 3.5 }] }),
    getAssessmentHistory: vi.fn().mockResolvedValue({ assessments: [] }),
    get: vi.fn().mockResolvedValue({ status: 'success' }),
    post: vi.fn().mockResolvedValue({ status: 'success' }),
  },
  api: {
    getAnalyticsOverview: vi.fn().mockResolvedValue({ total_assessments: 10, total_skills: 50, avg_confidence: 85, avg_processing_time: 2.1, assessments_change: 5, confidence_change: 2 }),
    getModelPerformance: vi.fn().mockResolvedValue({ models: [{ provider: 'OpenAI', model: 'GPT-4o', assessments: 5, avg_confidence: 88, avg_latency_ms: 1200, accuracy_score: 4.2 }] }),
    getVolumeData: vi.fn().mockResolvedValue({ daily: [{ date: '2026-03-01', count: 3 }] }),
    getTopSkills: vi.fn().mockResolvedValue({ skills: [{ skill: 'TypeScript', assessments: 8, avg_proficiency: 3.5 }] }),
    getAssessmentHistory: vi.fn().mockResolvedValue({ assessments: [] }),
    get: vi.fn().mockResolvedValue({ status: 'success' }),
    post: vi.fn().mockResolvedValue({ status: 'success' }),
  },
}));

// Mock proficiency config
vi.mock('../../config/proficiency', () => ({
  PROFICIENCY_CHART_COLORS: ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'],
  getProficiencyChartLabels: () => ['Novice', 'Developing', 'Intermediate', 'Advanced', 'Expert'],
}));

let AnalyticsDashboard: React.ComponentType;

beforeAll(async () => {
  const mod = await import('./AnalyticsDashboard');
  AnalyticsDashboard = mod.default;
});

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the dashboard heading', async () => {
    renderWithUser(<AnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });
  });

  it('should show summary stat cards', async () => {
    renderWithUser(<AnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Total Assessments')).toBeInTheDocument();
    });
    expect(screen.getByText('Skills Assessed')).toBeInTheDocument();
    expect(screen.getAllByText('Avg Confidence').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Avg Processing Time')).toBeInTheDocument();
  });

  it('should show chart sections', async () => {
    renderWithUser(<AnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Assessment Volume')).toBeInTheDocument();
    });
    expect(screen.getByText('Confidence Distribution')).toBeInTheDocument();
    expect(screen.getByText('Model Performance Comparison')).toBeInTheDocument();
  });

  it('should show period selector buttons', async () => {
    renderWithUser(<AnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('7 Days')).toBeInTheDocument();
    });
    expect(screen.getByText('30 Days')).toBeInTheDocument();
    expect(screen.getByText('90 Days')).toBeInTheDocument();
  });

  it('should show proficiency distribution section', async () => {
    renderWithUser(<AnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Proficiency Level Distribution')).toBeInTheDocument();
    });
  });
});
