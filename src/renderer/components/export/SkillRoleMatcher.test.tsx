/**
 * Tests for SkillRoleMatcher component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SkillRoleMatcher } from './SkillRoleMatcher';
import type { AssessmentResult } from '../proficiency/assessment-types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPreviewSkillMapping = vi.fn();
const mockExportToEightfoldWithMappings = vi.fn();
const mockGetRoles = vi.fn();
const mockToast = vi.fn();

vi.mock('../../services/api', () => ({
  api: {
    previewSkillMapping: (...args: unknown[]) => mockPreviewSkillMapping(...args),
    exportToEightfoldWithMappings: (...args: unknown[]) =>
      mockExportToEightfoldWithMappings(...args),
    getRoles: (...args: unknown[]) => mockGetRoles(...args),
  },
}));

vi.mock('../../stores/toast-store', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeAssessment = (name: string, proficiency = 3): AssessmentResult => ({
  skill_name: name,
  proficiency_numeric: proficiency,
  proficiency: proficiency,
  confidence_score: 0.9,
  reasoning: 'test',
  evidence: [],
});

const makeRole = (id: string, title: string, skills: string[] = []) => ({
  id,
  title,
  skillProficiencies: skills.map((name) => ({ name, proficiency: null })),
});

const defaultPreview = {
  role_id: 'role-1',
  role_title: 'Risk Director',
  matches: [
    {
      assessed_skill: 'Data Analysis',
      proficiency_numeric: 3,
      role_skill: 'Data Analysis',
      confidence: 1.0,
      method: 'exact' as const,
    },
  ],
  unmatched_assessed: [{ assessed_skill: 'Python', proficiency_numeric: 3 }],
  unmatched_role: ['Risk Management', 'Leadership'],
  total_role_skills: 3,
  total_assessed: 2,
  match_count: 1,
};

const defaultProps = {
  assessments: [makeAssessment('Data Analysis'), makeAssessment('Python')],
  availableRoles: [
    makeRole('role-1', 'Risk Director', ['Data Analysis', 'Risk Management', 'Leadership']),
  ],
  eightfoldEnvId: 'env-abc',
  eightfoldAuthToken: 'token-xyz',
  environmentName: 'Test Env',
  onClose: vi.fn(),
  onExportComplete: vi.fn(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SkillRoleMatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPreviewSkillMapping.mockResolvedValue(defaultPreview);
    mockExportToEightfoldWithMappings.mockResolvedValue({
      success: true,
      exported_count: 1,
      assessed_skills: 1,
      total_skills: 3,
      skipped_skills: 2,
      environment: 'env-abc',
      role_id: 'role-1',
      role_title: 'Risk Director',
      message: 'Updated 1 skills',
      reason: 'Updated 1 assessed skills',
      endpoint_used: 'https://apiv2.eightfold.ai/api/v2/JIE/roles/role-1',
      method_used: 'PUT',
      timestamp: new Date().toISOString(),
    });
  });

  it('renders the modal with title', () => {
    render(<SkillRoleMatcher {...defaultProps} />);
    expect(screen.getByText(/Skill Matcher/i)).toBeInTheDocument();
  });

  it('shows the role list in the left panel', () => {
    render(<SkillRoleMatcher {...defaultProps} />);
    expect(screen.getByText('Risk Director')).toBeInTheDocument();
  });

  it('shows environment name in header', () => {
    render(<SkillRoleMatcher {...defaultProps} />);
    expect(screen.getByText('Test Env')).toBeInTheDocument();
  });

  it('shows "select a role" placeholder before role is selected', () => {
    render(<SkillRoleMatcher {...defaultProps} />);
    expect(screen.getByText('Select a role')).toBeInTheDocument();
  });

  it('calls previewSkillMapping when a role is clicked', async () => {
    const user = userEvent.setup();
    render(<SkillRoleMatcher {...defaultProps} />);
    await user.click(screen.getByText('Risk Director'));
    expect(mockPreviewSkillMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        role_id: 'role-1',
        environment_id: 'env-abc',
        auth_token: 'token-xyz',
      })
    );
  });

  it('shows matched and unmatched skills after preview loads', async () => {
    const user = userEvent.setup();
    render(<SkillRoleMatcher {...defaultProps} />);
    await user.click(screen.getByText('Risk Director'));

    await waitFor(() => {
      // Data Analysis appears twice (assessed + role skill)
      expect(screen.getAllByText('Data Analysis').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('no match')).toBeInTheDocument();
  });

  it('shows confidence badge for exact match', async () => {
    const user = userEvent.setup();
    render(<SkillRoleMatcher {...defaultProps} />);
    await user.click(screen.getByText('Risk Director'));

    await waitFor(() => {
      // "EXACT" appears in the mapping row badge AND the legend
      expect(screen.getAllByText(/EXACT/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('export button shows correct count', async () => {
    const user = userEvent.setup();
    render(<SkillRoleMatcher {...defaultProps} />);
    await user.click(screen.getByText('Risk Director'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Export 1 skill/i })).toBeInTheDocument();
    });
  });

  it('export button is disabled when no matches', async () => {
    const user = userEvent.setup();
    mockPreviewSkillMapping.mockResolvedValue({
      ...defaultPreview,
      matches: [],
      unmatched_assessed: [
        { assessed_skill: 'Data Analysis', proficiency_numeric: 3 },
        { assessed_skill: 'Python', proficiency_numeric: 3 },
      ],
      match_count: 0,
    });

    render(<SkillRoleMatcher {...defaultProps} />);
    await user.click(screen.getByText('Risk Director'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Export 0 skills/i })).toBeDisabled();
    });
  });

  it('calls exportToEightfoldWithMappings with explicit_mappings on export', async () => {
    const user = userEvent.setup();
    render(<SkillRoleMatcher {...defaultProps} />);
    await user.click(screen.getByText('Risk Director'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Export 1 skill/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Export 1 skill/i }));

    await waitFor(() => {
      expect(mockExportToEightfoldWithMappings).toHaveBeenCalledWith(
        expect.objectContaining({
          environment_id: 'env-abc',
          role_id: 'role-1',
          explicit_mappings: [{ assessed_skill: 'Data Analysis', role_skill: 'Data Analysis' }],
        })
      );
    });
  });

  it('shows Eightfold API window with request/response after successful export', async () => {
    const user = userEvent.setup();
    render(<SkillRoleMatcher {...defaultProps} />);
    await user.click(screen.getByText('Risk Director'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Export 1 skill/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /Export 1 skill/i }));

    await waitFor(() => {
      expect(screen.getByText(/Eightfold API/i)).toBeInTheDocument();
    });
  });

  it('closes the modal when X is clicked', async () => {
    const user = userEvent.setup();
    render(<SkillRoleMatcher {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /Close skill matcher/i }));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows role search input', () => {
    render(<SkillRoleMatcher {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search roles...')).toBeInTheDocument();
  });

  it('filters roles by search query', async () => {
    const user = userEvent.setup();
    const props = {
      ...defaultProps,
      availableRoles: [
        makeRole('r1', 'Risk Director'),
        makeRole('r2', 'Data Scientist'),
        makeRole('r3', 'Software Engineer'),
      ],
    };
    render(<SkillRoleMatcher {...props} />);
    await user.type(screen.getByPlaceholderText('Search roles...'), 'Data');
    expect(screen.getByText('Data Scientist')).toBeInTheDocument();
    expect(screen.queryByText('Risk Director')).not.toBeInTheDocument();
  });

  it('fetches roles when availableRoles is empty', async () => {
    mockGetRoles.mockResolvedValue({ roles: [makeRole('r1', 'Fetched Role')] });
    render(<SkillRoleMatcher {...defaultProps} availableRoles={[]} />);

    await waitFor(() => {
      expect(mockGetRoles).toHaveBeenCalledWith('Test Env', 'token-xyz');
    });
  });

  it('shows error state when previewSkillMapping fails', async () => {
    const user = userEvent.setup();
    mockPreviewSkillMapping.mockRejectedValue(new Error('Network error'));
    render(<SkillRoleMatcher {...defaultProps} />);
    await user.click(screen.getByText('Risk Director'));

    await waitFor(() => {
      expect(screen.getByText('Failed to load mapping')).toBeInTheDocument();
    });
  });

  it('shows unmatched role skills section', async () => {
    const user = userEvent.setup();
    render(<SkillRoleMatcher {...defaultProps} />);
    await user.click(screen.getByText('Risk Director'));

    await waitFor(() => {
      expect(screen.getByText('Risk Management')).toBeInTheDocument();
      expect(screen.getByText('Leadership')).toBeInTheDocument();
    });
  });
});
