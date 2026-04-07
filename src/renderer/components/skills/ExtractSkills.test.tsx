/**
 * Tests for ExtractSkills Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';
import React from 'react';
import { createSkill } from '../../test/factories';

// ─── Store mocks ────────────────────────────────────────────────────────────

const mockSetSkillsState = vi.fn();
const mockUpdateSkillsState = vi.fn();
const mockSetLoading = vi.fn();
const mockSetError = vi.fn();
const mockMarkStepCompleted = vi.fn();
const mockNextStep = vi.fn();
const mockPreviousStep = vi.fn();

let mockSkillsState = {
  skills: [] as ReturnType<typeof createSkill>[],
  totalCount: 0,
  extractionStatus: 'idle' as 'idle' | 'extracting' | 'success' | 'error',
  extractionSource: null as 'csv' | 'api' | 'sftp' | null,
  extractionError: null as string | null,
  extractedAt: null as string | null,
};
let mockIsLoading = false;

vi.mock('../../stores/app-store', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      skillsState: mockSkillsState,
      isLoading: mockIsLoading,
      autoAdvanceEnabled: false,
      setSkillsState: mockSetSkillsState,
      updateSkillsState: mockUpdateSkillsState,
      setLoading: mockSetLoading,
      setError: mockSetError,
      markStepCompleted: mockMarkStepCompleted,
      nextStep: mockNextStep,
      previousStep: mockPreviousStep,
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
  // Re-export Skill type
  Skill: {},
}));

vi.mock('../../stores/toast-store', () => ({
  useToast: () => ({ toast: vi.fn() }),
  useToastStore: vi.fn(() => ({ addToast: vi.fn() })),
}));

// Mock child components that don't need real rendering
vi.mock('./SkillsTableEditor', () => ({
  default: ({ skills }: { skills: { name: string }[] }) => (
    <div data-testid="skills-table-editor">{skills.length} skills</div>
  ),
}));

vi.mock('../quality/DataQualityDashboard', () => ({
  default: () => <div data-testid="quality-dashboard">Quality Dashboard</div>,
}));

vi.mock('../../services/api', () => ({
  api: {
    extractSkills: vi.fn(),
    extractSkillsFromSFTP: vi.fn(),
    extractSkillsFromAPI: vi.fn(),
  },
}));

// ─── localStorage mock ───────────────────────────────────────────────────────

const localStorageMock: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      localStorageMock[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete localStorageMock[key];
    }),
    clear: vi.fn(() => {
      Object.keys(localStorageMock).forEach((k) => delete localStorageMock[k]);
    }),
  },
  writable: true,
});

let ExtractSkills: React.ComponentType;

beforeAll(async () => {
  const mod = await import('./ExtractSkills');
  ExtractSkills = mod.default;
});

describe('ExtractSkills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(localStorageMock).forEach((k) => delete localStorageMock[k]);
    mockSkillsState = {
      skills: [],
      totalCount: 0,
      extractionStatus: 'idle',
      extractionSource: null,
      extractionError: null,
      extractedAt: null,
    };
    mockIsLoading = false;
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  it('renders the page heading', () => {
    renderWithUser(<ExtractSkills />);
    expect(screen.getByRole('heading', { name: /extract skills/i })).toBeInTheDocument();
  });

  // ─── Source type display ───────────────────────────────────────────────────

  it('shows CSV source type when integration type is csv', () => {
    localStorageMock['profstudio_integration_type'] = 'csv';
    localStorageMock['profstudio_csv_filename'] = 'skills.csv';
    renderWithUser(<ExtractSkills />);
    const csvElements = screen.getAllByText(/csv/i);
    expect(csvElements.length).toBeGreaterThan(0);
  });

  it('shows SFTP source type when integration type is sftp', () => {
    localStorageMock['profstudio_integration_type'] = 'sftp';
    localStorageMock['profstudio_sftp_file_path'] = '/home/user/data.csv';
    renderWithUser(<ExtractSkills />);
    const sftpElements = screen.getAllByText(/sftp/i);
    expect(sftpElements.length).toBeGreaterThan(0);
  });

  // ─── Extract button ────────────────────────────────────────────────────────

  it('shows extract button when no extraction has occurred', () => {
    renderWithUser(<ExtractSkills />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('shows extract button when extraction status is idle', () => {
    localStorageMock['profstudio_integration_type'] = 'csv';
    renderWithUser(<ExtractSkills />);
    expect(screen.getByRole('button', { name: /extract skills/i })).toBeInTheDocument();
  });

  // ─── Success state ─────────────────────────────────────────────────────────

  it('shows "View Skills List" button when extraction succeeds with skills', async () => {
    const skills = [createSkill({ name: 'Python' }), createSkill({ name: 'TypeScript' })];
    mockSkillsState = {
      ...mockSkillsState,
      skills,
      totalCount: 2,
      extractionStatus: 'success',
      extractionSource: 'csv',
      extractedAt: new Date().toISOString(),
    };
    renderWithUser(<ExtractSkills />);
    expect(screen.getByRole('button', { name: /view skills list/i })).toBeInTheDocument();
  });

  it('shows skills table editor after clicking View Skills List', async () => {
    const skills = [createSkill({ name: 'Python' }), createSkill({ name: 'TypeScript' })];
    mockSkillsState = {
      ...mockSkillsState,
      skills,
      totalCount: 2,
      extractionStatus: 'success',
      extractionSource: 'csv',
      extractedAt: new Date().toISOString(),
    };
    const { user } = renderWithUser(<ExtractSkills />);
    await user.click(screen.getByRole('button', { name: /view skills list/i }));
    expect(screen.getByTestId('skills-table-editor')).toBeInTheDocument();
    expect(screen.getByText('2 skills')).toBeInTheDocument();
  });

  it('shows empty state when extraction succeeds with zero skills', () => {
    mockSkillsState = {
      ...mockSkillsState,
      skills: [],
      totalCount: 0,
      extractionStatus: 'success',
      extractionSource: 'csv',
      extractedAt: new Date().toISOString(),
    };
    renderWithUser(<ExtractSkills />);
    expect(screen.getByText(/no skills extracted/i)).toBeInTheDocument();
  });

  // ─── Error state ───────────────────────────────────────────────────────────

  it('shows extraction error when status is error', () => {
    mockSkillsState = {
      ...mockSkillsState,
      extractionStatus: 'error',
      extractionError: 'File parse error',
    };
    renderWithUser(<ExtractSkills />);
    expect(screen.getByText(/file parse error/i)).toBeInTheDocument();
  });

  // ─── Navigation ────────────────────────────────────────────────────────────

  it('calls previousStep when Back button is clicked', async () => {
    const { user } = renderWithUser(<ExtractSkills />);
    const backButton = screen.getByRole('button', { name: /back/i });
    await user.click(backButton);
    expect(mockPreviousStep).toHaveBeenCalled();
  });

  it('calls nextStep when Continue button is clicked with skills loaded', async () => {
    const skills = [createSkill({ name: 'Python' })];
    mockSkillsState = {
      ...mockSkillsState,
      skills,
      totalCount: 1,
      extractionStatus: 'success',
      extractionSource: 'csv',
      extractedAt: new Date().toISOString(),
    };
    const { user } = renderWithUser(<ExtractSkills />);
    const continueButton = screen.getByRole('button', { name: /continue/i });
    await user.click(continueButton);
    expect(mockNextStep).toHaveBeenCalled();
  });

  // ─── Loading state ─────────────────────────────────────────────────────────

  it('shows Extracting... button when isLoading is true', () => {
    mockIsLoading = true;
    localStorageMock['profstudio_integration_type'] = 'csv';
    renderWithUser(<ExtractSkills />);
    expect(screen.getByRole('button', { name: /extracting\.\.\./i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /extracting\.\.\./i })).toBeDisabled();
  });

  // ─── Summary stats ─────────────────────────────────────────────────────────

  it('shows extracted skill count in success state', () => {
    const skills = Array.from({ length: 5 }, (_, i) => createSkill({ name: `Skill ${i + 1}` }));
    mockSkillsState = {
      ...mockSkillsState,
      skills,
      totalCount: 5,
      extractionStatus: 'success',
      extractionSource: 'csv',
      extractedAt: new Date().toISOString(),
    };
    renderWithUser(<ExtractSkills />);
    // The data source area shows 'Extracted 5 skills'
    expect(screen.getByText(/extracted 5 skills/i)).toBeInTheDocument();
  });
});
