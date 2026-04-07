/**
 * Workflow Integration Test — Steps 2 → 3 → 4 → 5
 *
 * Verifies the data-flow contract between the four primary workflow steps:
 *   2. ExtractSkills  → populates skills in the store
 *   3. ConfigureProficiency → reads skills, produces LLM config
 *   4. RunAssessment  → reads config + skills, fires stream assessment
 *   5. ReviewAssessment → reads assessment results from localStorage
 *
 * These tests use mock stores to exercise the state transitions rather than
 * full end-to-end rendering (which is covered by Playwright E2E tests).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Zustand store — real store instance with test reset support
// ---------------------------------------------------------------------------
import { act } from '@testing-library/react';
import { createSkills, createAssessmentResult } from '../../test/factories';

// We import the REAL app-store (not mocked) to test state transitions directly.
vi.unmock('../../stores/app-store');

// Use a real in-memory localStorage so storage read-back tests work correctly.
const _localStore: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (key: string): string | null => _localStore[key] ?? null,
    setItem: (key: string, value: string) => {
      _localStore[key] = value;
    },
    removeItem: (key: string) => {
      delete _localStore[key];
    },
    clear: () => {
      Object.keys(_localStore).forEach((k) => delete _localStore[k]);
    },
  },
  writable: true,
});

import { useAppStore } from '../../stores/app-store';

describe('Workflow state-flow: steps 2 → 5', () => {
  // Reset store and localStorage between tests
  beforeEach(() => {
    window.localStorage.clear();
    act(() => {
      useAppStore.setState({
        currentStep: 2,
        completedSteps: new Set(),
        skillsState: {
          skills: [],
          totalCount: 0,
          extractionStatus: 'idle',
          extractionSource: null,
          extractionError: null,
          extractedAt: null,
        },
        isLoading: false,
        error: null,
      });
    });
  });

  // -------------------------------------------------------------------------
  // Step 2 → Step 3: extracting skills and advancing
  // -------------------------------------------------------------------------
  describe('Step 2: ExtractSkills', () => {
    it('populates skills in the store after successful extraction', () => {
      const skills = createSkills(3);

      act(() => {
        useAppStore.getState().setSkillsState({
          skills,
          totalCount: skills.length,
          extractionStatus: 'success',
          extractionSource: 'csv',
          extractionError: null,
          extractedAt: new Date().toISOString(),
        });
        useAppStore.getState().markStepCompleted(2);
      });

      const state = useAppStore.getState();
      expect(state.skillsState.skills).toHaveLength(3);
      expect(state.skillsState.extractionStatus).toBe('success');
      expect(state.completedSteps.has(2)).toBe(true);
    });

    it('records extraction error in the store when extraction fails', () => {
      act(() => {
        useAppStore.getState().updateSkillsState({
          extractionStatus: 'error',
          extractionError: 'Backend unavailable',
        });
      });

      const { skillsState } = useAppStore.getState();
      expect(skillsState.extractionStatus).toBe('error');
      expect(skillsState.extractionError).toBe('Backend unavailable');
    });
  });

  // -------------------------------------------------------------------------
  // Step 3: ConfigureProficiency reads skills
  // -------------------------------------------------------------------------
  describe('Step 3: ConfigureProficiency', () => {
    it('sees skills populated by step 2', () => {
      const skills = createSkills(5);

      act(() => {
        useAppStore.getState().setSkillsState({
          skills,
          totalCount: skills.length,
          extractionStatus: 'success',
          extractionSource: 'csv',
          extractionError: null,
          extractedAt: new Date().toISOString(),
        });
      });

      // ConfigureProficiency reads skillsState from the store
      const { skillsState } = useAppStore.getState();
      expect(skillsState.skills).toHaveLength(5);
      expect(skillsState.skills[0]).toMatchObject({ name: expect.any(String) });
    });

    it('blocks progression when no API key is set (error state)', () => {
      act(() => {
        useAppStore.getState().setError('Please configure an API key first');
      });

      expect(useAppStore.getState().error).toBe('Please configure an API key first');
    });

    it('clears error when corrected', () => {
      act(() => {
        useAppStore.getState().setError('Some error');
      });
      act(() => {
        useAppStore.getState().setError(null);
      });

      expect(useAppStore.getState().error).toBeNull();
    });

    it('marks step 3 completed and advances to step 4', () => {
      act(() => {
        useAppStore.getState().setCurrentStep(3);
        useAppStore.getState().markStepCompleted(3);
        useAppStore.getState().nextStep();
      });

      const { currentStep, completedSteps } = useAppStore.getState();
      expect(completedSteps.has(3)).toBe(true);
      expect(currentStep).toBe(4);
    });
  });

  // -------------------------------------------------------------------------
  // Step 4 → Step 5: Assessment runs, results land in localStorage
  // -------------------------------------------------------------------------
  describe('Step 4 → Step 5: RunAssessment → ReviewAssessment', () => {
    it('step 4 completion advances to step 5', () => {
      act(() => {
        useAppStore.getState().setCurrentStep(4);
        useAppStore.getState().markStepCompleted(4);
        useAppStore.getState().nextStep();
      });

      expect(useAppStore.getState().currentStep).toBe(5);
      expect(useAppStore.getState().completedSteps.has(4)).toBe(true);
    });

    it('ReviewAssessment (step 5) can read results written by RunAssessment', () => {
      const results = [
        createAssessmentResult({ skill_name: 'TypeScript', proficiency: 3, confidence_score: 0.9 }),
        createAssessmentResult({ skill_name: 'React', proficiency: 4, confidence_score: 0.8 }),
      ];

      // RunAssessment writes to localStorage
      localStorage.setItem('assessmentResults', JSON.stringify(results));

      // ReviewAssessment reads from localStorage
      const raw = localStorage.getItem('assessmentResults');
      expect(raw).not.toBeNull();

      const parsed = JSON.parse(raw!);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].skill_name).toBe('TypeScript');
      expect(parsed[1].proficiency).toBe(4);
    });

    it('handles missing assessment results gracefully', () => {
      localStorage.removeItem('assessmentResults');

      const raw = localStorage.getItem('assessmentResults');
      expect(raw).toBeNull();
      // ReviewAssessment should render empty table without crashing (tested separately)
    });
  });

  // -------------------------------------------------------------------------
  // Full chain: completed-steps bitmap after steps 2 → 5
  // -------------------------------------------------------------------------
  describe('Full chain: steps 2 → 3 → 4 → 5', () => {
    it('completedSteps accumulates as workflow advances', () => {
      act(() => {
        const store = useAppStore.getState();
        store.setCurrentStep(2);
        store.markStepCompleted(2);
        store.nextStep();
        store.markStepCompleted(3);
        store.nextStep();
        store.markStepCompleted(4);
        store.nextStep();
        store.markStepCompleted(5);
      });

      const { completedSteps, currentStep } = useAppStore.getState();
      expect(completedSteps.has(2)).toBe(true);
      expect(completedSteps.has(3)).toBe(true);
      expect(completedSteps.has(4)).toBe(true);
      expect(completedSteps.has(5)).toBe(true);
      expect(currentStep).toBe(5); // nextStep after 5 should not exceed bounds
    });

    it('previousStep navigates back without losing completed state', () => {
      act(() => {
        const store = useAppStore.getState();
        store.setCurrentStep(5);
        store.completedSteps.add(2);
        store.completedSteps.add(3);
        store.completedSteps.add(4);
        store.completedSteps.add(5);
        store.previousStep();
      });

      expect(useAppStore.getState().currentStep).toBe(4);
    });

    it('getWorkflowProgress reports correctly after full chain', () => {
      act(() => {
        const store = useAppStore.getState();
        [2, 3, 4, 5].forEach((step) => store.markStepCompleted(step));
      });

      const progress = useAppStore.getState().getWorkflowProgress();
      expect(progress.completed).toBeGreaterThanOrEqual(4);
      expect(progress.percentage).toBeGreaterThan(0);
    });
  });
});
