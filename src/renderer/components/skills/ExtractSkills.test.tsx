/**
 * Tests for ExtractSkills Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';
import React from 'react';

// Mock stores
const mockSetSkillsState = vi.fn();
const mockUpdateSkillsState = vi.fn();
const mockSetLoading = vi.fn();
const mockMarkStepCompleted = vi.fn();
const mockNextStep = vi.fn();

vi.mock('../../stores/app-store', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      skillsState: {
        skills: [],
        totalCount: 0,
        extractionStatus: 'idle',
        extractionSource: null,
        extractionError: null,
        extractedAt: null,
      },
      isLoading: false,
      autoAdvanceEnabled: false,
      setSkillsState: mockSetSkillsState,
      updateSkillsState: mockUpdateSkillsState,
      setLoading: mockSetLoading,
      markStepCompleted: mockMarkStepCompleted,
      nextStep: mockNextStep,
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

// Mock localStorage
const localStorageMock: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => localStorageMock[key] || null),
    setItem: vi.fn((key: string, value: string) => { localStorageMock[key] = value; }),
    removeItem: vi.fn(),
    clear: vi.fn(),
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
    Object.keys(localStorageMock).forEach(key => delete localStorageMock[key]);
  });

  it('should render the extraction component', () => {
    renderWithUser(<ExtractSkills />);
    expect(screen.getByRole('heading', { name: /extract skills/i })).toBeInTheDocument();
  });

  it('should show data source info when integration type is set', () => {
    localStorageMock['profstudio_integration_type'] = 'csv';
    localStorageMock['profstudio_csv_filename'] = 'skills.csv';
    renderWithUser(<ExtractSkills />);
    // Should display CSV source type somewhere
    const csvElements = screen.getAllByText(/csv/i);
    expect(csvElements.length).toBeGreaterThan(0);
  });

  it('should show extract button when no extraction has occurred', () => {
    renderWithUser(<ExtractSkills />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
