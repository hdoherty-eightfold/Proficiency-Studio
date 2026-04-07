/**
 * Tests for AnalyticsDashboard Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen, waitFor } from '../../test/utils/render';
import { createTopSkill, createModelPerformance } from '../../test/factories';
import React from 'react';

const mockTopSkills = [
  createTopSkill({
    name: 'TypeScript',
    skill: 'TypeScript',
    assessment_count: 120,
    assessments: 120,
    avg_proficiency: 3.8,
    avg_confidence: 0.91,
  }),
  createTopSkill({
    name: 'Python',
    skill: 'Python',
    assessment_count: 85,
    assessments: 85,
    avg_proficiency: 4.1,
    avg_confidence: 0.88,
  }),
  createTopSkill({
    name: 'React',
    skill: 'React',
    assessment_count: 60,
    assessments: 60,
    avg_proficiency: 3.5,
    avg_confidence: 0.82,
  }),
];

const mockModelPerformance = [
  createModelPerformance({
    provider: 'google',
    model: 'gemini-3.1-flash-lite-preview',
    total_assessments: 300,
    assessments: 300,
    avg_confidence: 0.89,
    avg_latency_ms: 1100,
  }),
  createModelPerformance({
    provider: 'kimi',
    model: 'kimi-k2.5',
    total_assessments: 150,
    assessments: 150,
    avg_confidence: 0.85,
    avg_latency_ms: 1800,
  }),
];

// Mock stores
vi.mock('../../stores/app-store', () => ({
  useAppStore: vi.fn((selector) => {
    const state = { isLoading: false };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

vi.mock('../../stores/toast-store', () => ({
  useToast: () => ({ toast: vi.fn() }),
  useToastStore: vi.fn(() => ({ addToast: vi.fn() })),
}));

vi.mock('../../services/api', () => ({
  default: {
    getAnalyticsOverview: vi
      .fn()
      .mockResolvedValue({
        total_assessments: 450,
        total_skills: 265,
        avg_confidence: 87,
        avg_processing_time: 2.3,
        assessments_change: 12,
        confidence_change: 3,
      }),
    getModelPerformance: vi.fn().mockResolvedValue({ models: mockModelPerformance }),
    getVolumeData: vi.fn().mockResolvedValue({
      daily: [
        { date: '2026-04-01', count: 10 },
        { date: '2026-04-02', count: 15 },
      ],
    }),
    getTopSkills: vi.fn().mockResolvedValue({ skills: mockTopSkills }),
    getAssessmentHistory: vi.fn().mockResolvedValue({ assessments: [] }),
    get: vi.fn().mockResolvedValue({ status: 'success' }),
    post: vi.fn().mockResolvedValue({ status: 'success' }),
  },
  api: {
    getAnalyticsOverview: vi
      .fn()
      .mockResolvedValue({
        total_assessments: 450,
        total_skills: 265,
        avg_confidence: 87,
        avg_processing_time: 2.3,
        assessments_change: 12,
        confidence_change: 3,
      }),
    getModelPerformance: vi.fn().mockResolvedValue({ models: mockModelPerformance }),
    getVolumeData: vi.fn().mockResolvedValue({
      daily: [
        { date: '2026-04-01', count: 10 },
        { date: '2026-04-02', count: 15 },
      ],
    }),
    getTopSkills: vi.fn().mockResolvedValue({ skills: mockTopSkills }),
    getAssessmentHistory: vi.fn().mockResolvedValue({ assessments: [] }),
    get: vi.fn().mockResolvedValue({ status: 'success' }),
    post: vi.fn().mockResolvedValue({ status: 'success' }),
  },
}));

vi.mock('../../config/proficiency', () => ({
  PROFICIENCY_CHART_COLORS: [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-blue-500',
    'bg-green-500',
  ],
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

  // ─── Heading ────────────────────────────────────────────────────────────────

  it('renders the dashboard heading', async () => {
    renderWithUser(<AnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });
  });

  // ─── Summary stats ──────────────────────────────────────────────────────────

  it('shows all four summary stat cards', async () => {
    renderWithUser(<AnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Total Assessments')).toBeInTheDocument();
    });
    expect(screen.getByText('Skills Assessed')).toBeInTheDocument();
    expect(screen.getAllByText('Avg Confidence').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Avg Processing Time')).toBeInTheDocument();
  });

  it('displays the correct total assessment count from API', async () => {
    renderWithUser(<AnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('450')).toBeInTheDocument();
    });
  });

  it('displays the correct skills assessed count from API', async () => {
    renderWithUser(<AnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('265')).toBeInTheDocument();
    });
  });

  // ─── Chart sections ──────────────────────────────────────────────────────────

  it('renders Assessment Volume chart section', async () => {
    renderWithUser(<AnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Assessment Volume')).toBeInTheDocument();
    });
  });

  it('renders Confidence and Model Performance chart sections', async () => {
    renderWithUser(<AnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Confidence')).toBeInTheDocument();
    });
    expect(screen.getByText('Model Performance')).toBeInTheDocument();
  });

  it('renders Proficiency Level Distribution section', async () => {
    renderWithUser(<AnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Proficiency Level Distribution')).toBeInTheDocument();
    });
  });

  // ─── Period selector ────────────────────────────────────────────────────────

  it('shows period selector with 7/30/90 day options', async () => {
    renderWithUser(<AnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('7 Days')).toBeInTheDocument();
    });
    expect(screen.getByText('30 Days')).toBeInTheDocument();
    expect(screen.getByText('90 Days')).toBeInTheDocument();
  });

  // ─── Top skills ─────────────────────────────────────────────────────────────

  it('renders top skills from factory data', async () => {
    renderWithUser(<AnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  // ─── Model performance ──────────────────────────────────────────────────────

  it('renders model names from factory data', async () => {
    renderWithUser(<AnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('gemini-3.1-flash-lite-preview')).toBeInTheDocument();
    });
    expect(screen.getByText('kimi-k2.5')).toBeInTheDocument();
  });
});
