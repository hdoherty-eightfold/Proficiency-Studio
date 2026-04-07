/**
 * Tests for AssessmentResults component
 *
 * Verifies that confidence scores and reasoning are correctly displayed
 * in the results table and quality analysis section.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';
import { AssessmentResults } from './AssessmentResults';
import type { AssessmentResponse } from './assessment-types';

vi.mock('../review/ExportActions', () => ({
  ExportActions: () => null,
}));

vi.mock('../../stores/toast-store', () => ({
  useToast: () => ({ toast: vi.fn() }),
  useToastStore: vi.fn(() => ({ addToast: vi.fn() })),
}));

const makeResults = (
  overrides?: Partial<AssessmentResponse['assessments'][number]>[]
): AssessmentResponse => ({
  success: true,
  total_skills: 3,
  avg_proficiency: 3,
  processing_time: 1.5,
  model_used: 'gemini/gemini-3.1-flash-lite-preview',
  timestamp: new Date().toISOString(),
  assessments: [
    {
      skill_name: 'Python',
      proficiency: 4,
      proficiency_numeric: 4,
      confidence_score: 0.92,
      reasoning: 'Strong evidence of expert usage in data pipelines.',
      evidence: ['Built ML pipeline', 'Contributed to open source'],
      category: 'Programming',
    },
    {
      skill_name: 'SQL',
      proficiency: 3,
      proficiency_numeric: 3,
      confidence_score: 0.65,
      reasoning: 'Moderate usage evident from job description.',
      evidence: ['Used in reporting'],
      category: 'Data',
    },
    {
      skill_name: 'Docker',
      proficiency: 2,
      proficiency_numeric: 2,
      confidence_score: 0.45,
      reasoning: '',
      evidence: [],
      category: undefined,
      ...((overrides ?? [])[2] ?? {}),
    },
  ],
});

describe('AssessmentResults — confidence display', () => {
  it('renders the confidence column header', () => {
    renderWithUser(<AssessmentResults results={makeResults()} onRestart={vi.fn()} />);
    expect(screen.getByRole('columnheader', { name: /Confidence/i })).toBeInTheDocument();
  });

  it('shows confidence percentage for each skill', () => {
    renderWithUser(<AssessmentResults results={makeResults()} onRestart={vi.fn()} />);
    // 92%, 65%, 45% appear at least once each (table + possibly quality section)
    expect(screen.getAllByText('92%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('65%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('45%').length).toBeGreaterThan(0);
  });

  it('shows reasoning text in the Reasoning column', () => {
    renderWithUser(<AssessmentResults results={makeResults()} onRestart={vi.fn()} />);
    expect(screen.getByText(/Strong evidence of expert usage/i)).toBeInTheDocument();
    expect(screen.getByText(/Moderate usage evident/i)).toBeInTheDocument();
  });

  it('shows dash for empty reasoning', () => {
    renderWithUser(<AssessmentResults results={makeResults()} onRestart={vi.fn()} />);
    // Docker has no reasoning; the cell renders an italic em-dash
    const emDashes = document.querySelectorAll('td span.italic');
    expect(emDashes.length).toBeGreaterThan(0);
  });

  it('shows quality analysis AI Confidence section', () => {
    renderWithUser(<AssessmentResults results={makeResults()} onRestart={vi.fn()} />);
    expect(screen.getByText(/AI Confidence/i)).toBeInTheDocument();
    expect(screen.getByText(/High/i)).toBeInTheDocument();
    expect(screen.getByText(/Medium/i)).toBeInTheDocument();
    expect(screen.getByText(/Low/i)).toBeInTheDocument();
  });

  it('correctly categorises high/medium/low confidence counts', () => {
    renderWithUser(<AssessmentResults results={makeResults()} onRestart={vi.fn()} />);
    // Python=0.92 → High, SQL=0.65 → Medium, Docker=0.45 → Low
    // Text pattern: "1 (33%)" next to each label
    const highRow = screen.getByText(/High \(≥80%\)/).closest('div')!;
    expect(highRow.textContent).toMatch(/1/);
    const medRow = screen.getByText(/Medium \(60/).closest('div')!;
    expect(medRow.textContent).toMatch(/1/);
    const lowRow = screen.getByText(/Low \(<60%\)/).closest('div')!;
    expect(lowRow.textContent).toMatch(/1/);
  });

  it('shows evidence count badge per skill row', () => {
    renderWithUser(<AssessmentResults results={makeResults()} onRestart={vi.fn()} />);
    // Python has 2 evidence items, SQL has 1, Docker has 0
    const evidenceBadges = document.querySelectorAll('td span[class*="rounded"]');
    const values = Array.from(evidenceBadges).map((b) => b.textContent?.trim());
    expect(values).toContain('2');
    expect(values).toContain('1');
    expect(values).toContain('0');
  });

  it('handles zero confidence_score gracefully (Basic mode results)', () => {
    const basicResults: AssessmentResponse = {
      ...makeResults(),
      assessments: makeResults().assessments.map((a) => ({
        ...a,
        confidence_score: 0,
        reasoning: '',
      })),
    };
    renderWithUser(<AssessmentResults results={basicResults} onRestart={vi.fn()} />);
    // Should show 0% without crashing
    const zeroPct = screen.getAllByText('0%');
    expect(zeroPct.length).toBeGreaterThan(0);
  });

  it('shows coverage stats for skills with reasoning', () => {
    renderWithUser(<AssessmentResults results={makeResults()} onRestart={vi.fn()} />);
    expect(screen.getByText(/Skills with reasoning/i)).toBeInTheDocument();
    expect(screen.getByText(/Skills with evidence/i)).toBeInTheDocument();
  });
});
