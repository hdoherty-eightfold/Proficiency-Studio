/**
 * Tests for App Store (Zustand)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './app-store';

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAppStore.setState({
      currentStep: 0,
      isSidebarCollapsed: false,
      isLoading: false,
      loadingMessage: '',
      error: null,
      skillsState: {
        skills: [],
        totalCount: 0,
        extractionStatus: 'idle',
        extractionSource: null,
        extractionError: null,
        extractedAt: null,
      },
      uploadedFile: null,
      autoAdvanceEnabled: true,
    });
  });

  describe('navigation', () => {
    it('should initialize with step 0', () => {
      const state = useAppStore.getState();
      expect(state.currentStep).toBe(0);
    });

    it('should set current step', () => {
      useAppStore.getState().setCurrentStep(5);
      expect(useAppStore.getState().currentStep).toBe(5);
    });

    it('should navigate to next step', () => {
      useAppStore.getState().nextStep();
      expect(useAppStore.getState().currentStep).toBe(1);

      useAppStore.getState().nextStep();
      expect(useAppStore.getState().currentStep).toBe(2);
    });

    it('should not exceed max steps', () => {
      useAppStore.getState().setCurrentStep(11);
      useAppStore.getState().nextStep();
      expect(useAppStore.getState().currentStep).toBe(11);
    });

    it('should navigate to previous step', () => {
      useAppStore.getState().setCurrentStep(5);
      useAppStore.getState().previousStep();
      expect(useAppStore.getState().currentStep).toBe(4);
    });

    it('should not go below step 0', () => {
      useAppStore.getState().setCurrentStep(0);
      useAppStore.getState().previousStep();
      expect(useAppStore.getState().currentStep).toBe(0);
    });

    it('should return correct step name', () => {
      const state = useAppStore.getState();
      expect(state.getStepName(0)).toBe('Welcome');
      expect(state.getStepName(1)).toBe('Integration Path');
      expect(state.getStepName(10)).toBe('Settings');
      expect(state.getStepName(11)).toBe('Documentation');
    });
  });

  describe('sidebar', () => {
    it('should initialize with sidebar expanded', () => {
      const state = useAppStore.getState();
      expect(state.isSidebarCollapsed).toBe(false);
    });

    it('should toggle sidebar', () => {
      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().isSidebarCollapsed).toBe(true);

      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().isSidebarCollapsed).toBe(false);
    });

    it('should set sidebar collapsed state', () => {
      useAppStore.getState().setSidebarCollapsed(true);
      expect(useAppStore.getState().isSidebarCollapsed).toBe(true);

      useAppStore.getState().setSidebarCollapsed(false);
      expect(useAppStore.getState().isSidebarCollapsed).toBe(false);
    });
  });

  describe('loading state', () => {
    it('should initialize with loading false', () => {
      const state = useAppStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.loadingMessage).toBe('');
    });

    it('should set loading state', () => {
      useAppStore.getState().setLoading(true, 'Loading data...');
      const state = useAppStore.getState();

      expect(state.isLoading).toBe(true);
      expect(state.loadingMessage).toBe('Loading data...');
    });

    it('should clear loading state', () => {
      useAppStore.getState().setLoading(true, 'Loading...');
      useAppStore.getState().setLoading(false);

      const state = useAppStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.loadingMessage).toBe('');
    });
  });

  describe('error state', () => {
    it('should initialize with no error', () => {
      const state = useAppStore.getState();
      expect(state.error).toBeNull();
    });

    it('should set error', () => {
      useAppStore.getState().setError('Something went wrong');
      expect(useAppStore.getState().error).toBe('Something went wrong');
    });

    it('should clear error', () => {
      useAppStore.getState().setError('Error');
      useAppStore.getState().setError(null);
      expect(useAppStore.getState().error).toBeNull();
    });
  });

  describe('skills state', () => {
    it('should initialize with empty skills', () => {
      const state = useAppStore.getState();
      expect(state.skillsState.skills).toEqual([]);
      expect(state.skillsState.totalCount).toBe(0);
      expect(state.skillsState.extractionStatus).toBe('idle');
    });

    it('should update skills state', () => {
      const mockSkills = [
        { name: 'JavaScript', category: 'Programming' },
        { name: 'Python', category: 'Programming' },
      ];

      useAppStore.getState().setSkillsState({
        skills: mockSkills,
        totalCount: 2,
        extractionStatus: 'success',
        extractionSource: 'csv',
        extractionError: null,
        extractedAt: new Date().toISOString(),
      });

      const state = useAppStore.getState();
      expect(state.skillsState.skills).toEqual(mockSkills);
      expect(state.skillsState.totalCount).toBe(2);
      expect(state.skillsState.extractionStatus).toBe('success');
      expect(state.skillsState.extractionSource).toBe('csv');
    });

    it('should partially update skills state', () => {
      useAppStore.getState().updateSkillsState({
        extractionStatus: 'extracting',
      });

      expect(useAppStore.getState().skillsState.extractionStatus).toBe('extracting');
      expect(useAppStore.getState().skillsState.skills).toEqual([]);
    });

    it('should reset skills state', () => {
      useAppStore.getState().setSkillsState({
        skills: [{ name: 'Test' }],
        totalCount: 1,
        extractionStatus: 'success',
        extractionSource: 'csv',
        extractionError: null,
        extractedAt: new Date().toISOString(),
      });

      useAppStore.getState().resetSkillsState();

      const state = useAppStore.getState();
      expect(state.skillsState.skills).toEqual([]);
      expect(state.skillsState.totalCount).toBe(0);
      expect(state.skillsState.extractionStatus).toBe('idle');
    });
  });

  describe('upload state', () => {
    it('should set uploaded file', () => {
      const mockFile = {
        filename: 'test.csv',
        content: 'col1,col2\nval1,val2',
        size: 100,
        type: 'text/csv',
        lastModified: Date.now(),
      };

      useAppStore.getState().setUploadedFile(mockFile);
      expect(useAppStore.getState().uploadedFile).toEqual(mockFile);
    });

    it('should clear uploaded file', () => {
      useAppStore.getState().setUploadedFile({
        filename: 'test.csv',
        content: 'data',
        size: 100,
        type: 'text/csv',
        lastModified: Date.now(),
      });

      useAppStore.getState().setUploadedFile(null);
      expect(useAppStore.getState().uploadedFile).toBeNull();
    });
  });

  describe('settings', () => {
    it('should toggle auto advance', () => {
      expect(useAppStore.getState().autoAdvanceEnabled).toBe(true);

      useAppStore.getState().setAutoAdvanceEnabled(false);
      expect(useAppStore.getState().autoAdvanceEnabled).toBe(false);

      useAppStore.getState().setAutoAdvanceEnabled(true);
      expect(useAppStore.getState().autoAdvanceEnabled).toBe(true);
    });
  });
});
