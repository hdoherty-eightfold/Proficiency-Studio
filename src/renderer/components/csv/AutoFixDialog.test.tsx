/**
 * Tests for AutoFixDialog Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';
import React from 'react';

let AutoFixDialog: React.FC<any>;

beforeAll(async () => {
  const mod = await import('./AutoFixDialog');
  AutoFixDialog = mod.default;
});

const sampleFixes = [
  {
    id: 'fix-1',
    row: 3,
    column: 'email',
    original_value: 'alice@examplecom',
    suggested_value: 'alice@example.com',
    fix_type: 'format' as const,
    confidence: 95,
    reasoning: 'Missing dot in domain name',
  },
  {
    id: 'fix-2',
    row: 7,
    column: 'name',
    original_value: 'Jon Smith',
    suggested_value: 'John Smith',
    fix_type: 'spelling' as const,
    confidence: 80,
    reasoning: 'Common misspelling of John',
  },
  {
    id: 'fix-3',
    row: 10,
    column: 'department',
    original_value: '',
    suggested_value: 'Engineering',
    fix_type: 'missing' as const,
    confidence: 60,
    reasoning: 'Inferred from job title',
  },
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  fixes: sampleFixes,
  onApplyFixes: vi.fn(),
  applying: false,
};

describe('AutoFixDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render nothing when closed', () => {
    const { container } = renderWithUser(
      <AutoFixDialog {...defaultProps} isOpen={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render dialog content when open', () => {
    renderWithUser(<AutoFixDialog {...defaultProps} />);

    expect(screen.getByText('AI Auto-Fix Suggestions')).toBeInTheDocument();
    expect(screen.getByText(/Review and apply AI-suggested fixes/)).toBeInTheDocument();
  });

  it('should display fix suggestions with details', () => {
    renderWithUser(<AutoFixDialog {...defaultProps} />);

    expect(screen.getByText('Row 3, Column: email')).toBeInTheDocument();
    expect(screen.getByText('Row 7, Column: name')).toBeInTheDocument();
    expect(screen.getByText('Row 10, Column: department')).toBeInTheDocument();

    // Fix type badges
    expect(screen.getByText('format')).toBeInTheDocument();
    expect(screen.getByText('spelling')).toBeInTheDocument();
    expect(screen.getByText('missing')).toBeInTheDocument();

    // Confidence levels
    expect(screen.getByText('95% confident')).toBeInTheDocument();
    expect(screen.getByText('80% confident')).toBeInTheDocument();
    expect(screen.getByText('60% confident')).toBeInTheDocument();
  });

  it('should show original and suggested values', () => {
    renderWithUser(<AutoFixDialog {...defaultProps} />);

    expect(screen.getByText('alice@examplecom')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jon Smith')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('should show selection count and controls', () => {
    renderWithUser(<AutoFixDialog {...defaultProps} />);

    expect(screen.getByText('3 of 3 selected')).toBeInTheDocument();
    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(screen.getByText('Deselect All')).toBeInTheDocument();
    expect(screen.getByText('Apply 3 Fixes')).toBeInTheDocument();
  });

  it('should show empty state when no fixes provided', () => {
    renderWithUser(<AutoFixDialog {...defaultProps} fixes={[]} />);

    expect(screen.getByText('No fixes needed! Your data looks good.')).toBeInTheDocument();
  });
});
