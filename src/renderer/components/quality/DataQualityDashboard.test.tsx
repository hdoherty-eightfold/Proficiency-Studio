/**
 * Tests for DataQualityDashboard Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';
import React from 'react';

// Mock stores
vi.mock('../../stores/toast-store', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('../../services/api', () => ({
  api: {
    analyzeData: vi.fn().mockResolvedValue({ success: true, analysis: {} }),
    analyzeDataContent: vi.fn().mockResolvedValue({ success: true, analysis: {} }),
  },
}));

let DataQualityDashboard: React.ComponentType<{
  fileId?: string;
  csvContent?: string;
  filename?: string;
  onAnalysisComplete?: (result: unknown) => void;
}>;

beforeAll(async () => {
  const mod = await import('./DataQualityDashboard');
  DataQualityDashboard = mod.default;
});

describe('DataQualityDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the dashboard title', () => {
    renderWithUser(<DataQualityDashboard />);
    expect(screen.getByText('Data Quality Dashboard')).toBeInTheDocument();
  });

  it('should render the description', () => {
    renderWithUser(<DataQualityDashboard />);
    expect(
      screen.getByText('Comprehensive data quality analysis with A-F grading')
    ).toBeInTheDocument();
  });

  it('should render the Analyze Quality button', () => {
    renderWithUser(<DataQualityDashboard />);
    expect(screen.getByRole('button', { name: /analyze quality/i })).toBeInTheDocument();
  });

  it('should show empty state prompt before analysis', () => {
    renderWithUser(<DataQualityDashboard />);
    expect(
      screen.getByText(/click "analyze quality" to get a comprehensive data quality report/i)
    ).toBeInTheDocument();
  });

  it('should render with a fileId prop without crashing', () => {
    renderWithUser(<DataQualityDashboard fileId="test-file-123" />);
    expect(screen.getByText('Data Quality Dashboard')).toBeInTheDocument();
  });
});
