/**
 * Tests for CSVReviewPanel Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen, waitFor } from '../../test/utils/render';
import React from 'react';

// Mock toast store
vi.mock('../../stores/toast-store', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock API service
const mockReviewFile = vi.fn();
const mockApplyFixes = vi.fn();

vi.mock('../../services/api', () => ({
  api: {
    reviewFile: (...args: unknown[]) => mockReviewFile(...args),
    applyFixes: (...args: unknown[]) => mockApplyFixes(...args),
  },
}));

let CSVReviewPanel: React.FC<any>;

beforeAll(async () => {
  const mod = await import('./CSVReviewPanel');
  CSVReviewPanel = mod.default;
});

const defaultProps = {
  fileId: 'test-file-1',
  entityName: 'employee',
  onReviewComplete: vi.fn(),
  onApplyFixes: vi.fn(),
};

const sampleReviewResult = {
  file_id: 'test-file-1',
  total_rows: 100,
  issues: [
    {
      row: 5,
      column: 'email',
      issue_type: 'error' as const,
      message: 'Invalid email format',
      suggestion: 'Check email contains @ symbol',
      auto_fixable: false,
    },
    {
      row: 12,
      column: 'name',
      issue_type: 'warning' as const,
      message: 'Name appears to be truncated',
      suggestion: 'Verify the full name',
      auto_fixable: true,
    },
  ],
  summary: {
    errors: 1,
    warnings: 1,
    info: 0,
    auto_fixable: 1,
  },
  quality_score: 85,
};

describe('CSVReviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render initial state with scan button', () => {
    renderWithUser(<CSVReviewPanel {...defaultProps} />);

    expect(screen.getByText('AI File Review')).toBeInTheDocument();
    expect(screen.getByText('Scan File')).toBeInTheDocument();
    expect(screen.getByText(/Click "Scan File" to analyze/)).toBeInTheDocument();
  });

  it('should show loading state while reviewing', async () => {
    mockReviewFile.mockReturnValue(new Promise(() => {}));

    const { user } = renderWithUser(<CSVReviewPanel {...defaultProps} />);
    await user.click(screen.getByText('Scan File'));

    expect(screen.getByText('Analyzing file with AI...')).toBeInTheDocument();
  });

  it('should display review results after scan', async () => {
    mockReviewFile.mockResolvedValue({
      status: 'success',
      result: sampleReviewResult,
    });

    const { user } = renderWithUser(<CSVReviewPanel {...defaultProps} />);
    await user.click(screen.getByText('Scan File'));

    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument(); // Total Rows
    });

    // Issue messages should be present
    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    expect(screen.getByText('Name appears to be truncated')).toBeInTheDocument();
  });

  it('should show quality indicators in summary', async () => {
    mockReviewFile.mockResolvedValue({
      status: 'success',
      result: sampleReviewResult,
    });

    const { user } = renderWithUser(<CSVReviewPanel {...defaultProps} />);
    await user.click(screen.getByText('Scan File'));

    await waitFor(() => {
      expect(screen.getByText('Total Rows')).toBeInTheDocument();
      expect(screen.getByText('Errors')).toBeInTheDocument();
      expect(screen.getByText('Warnings')).toBeInTheDocument();
      expect(screen.getByText('Auto-Fixable')).toBeInTheDocument();
    });
  });

  it('should show auto-fix button when fixable issues exist', async () => {
    mockReviewFile.mockResolvedValue({
      status: 'success',
      result: sampleReviewResult,
    });

    const { user } = renderWithUser(<CSVReviewPanel {...defaultProps} />);
    await user.click(screen.getByText('Scan File'));

    await waitFor(() => {
      expect(screen.getByText('Auto-Fix (1)')).toBeInTheDocument();
    });
  });
});
