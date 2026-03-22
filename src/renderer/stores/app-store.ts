import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Skills types
export interface Skill {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  source?: 'csv' | 'api' | 'sftp';
  sourceId?: string;
  proficiency?: number;        // 1-5 proficiency level
  proficiency_name?: string;   // e.g., "Novice", "Expert"
}

export interface SkillsState {
  skills: Skill[];
  totalCount: number;
  extractionStatus: 'idle' | 'extracting' | 'success' | 'error';
  extractionSource: 'csv' | 'api' | 'sftp' | null;
  extractionError: string | null;
  extractedAt: string | null;
}

export interface UploadResponse {
  filename: string;
  content: string;
  size: number;
  type: string;
  lastModified: number;
}

interface AppState {
  // Current step in the workflow (0-11)
  currentStep: number;

  // Workflow completion tracking (steps 0-5 are the main workflow)
  completedSteps: Set<number>;

  // Sidebar state
  isSidebarCollapsed: boolean;

  // Loading state
  isLoading: boolean;
  loadingMessage: string;

  // Global Error state
  error: string | null;

  // Skills State
  skillsState: SkillsState;

  // Upload State
  uploadedFile: UploadResponse | null;

  // Settings
  autoAdvanceEnabled: boolean;

  // Actions
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setLoading: (loading: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  setSkillsState: (state: SkillsState) => void;
  updateSkillsState: (updates: Partial<SkillsState>) => void;
  resetSkillsState: () => void;
  setUploadedFile: (file: UploadResponse | null) => void;
  setAutoAdvanceEnabled: (enabled: boolean) => void;
  markStepCompleted: (step: number) => void;
  markStepIncomplete: (step: number) => void;
  resetWorkflowProgress: () => void;

  // Utilities
  getStepName: (step: number) => string;
  getWorkflowProgress: () => { completed: number; total: number; percentage: number };
}

const STEP_NAMES = [
  'Welcome',
  'Integration Path',
  'Extract Skills',
  'Configure Proficiency',
  'Run Assessment',
  'Review',
  'Assessment History',
  'Analytics',
  'Prompt Editor',
  'Environment Manager',
  'Settings',
  'Documentation',
];

const INITIAL_SKILLS_STATE: SkillsState = {
  skills: [],
  totalCount: 0,
  extractionStatus: 'idle',
  extractionSource: null,
  extractionError: null,
  extractedAt: null,
};

// Number of workflow steps (Welcome through Review, steps 0-5)
const WORKFLOW_STEP_COUNT = 6;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentStep: 0,
      completedSteps: new Set<number>(),
      isSidebarCollapsed: false,
      isLoading: false,
      loadingMessage: '',
      error: null,
      skillsState: INITIAL_SKILLS_STATE,
      uploadedFile: null,
      autoAdvanceEnabled: true,

      setCurrentStep: (step) => {
        if (step >= 0 && step < STEP_NAMES.length) {
          set({ currentStep: step });
        }
      },

      nextStep: () => {
        const { currentStep } = get();
        if (currentStep < STEP_NAMES.length - 1) {
          set({ currentStep: currentStep + 1 });
        }
      },

      previousStep: () => {
        const { currentStep } = get();
        if (currentStep > 0) {
          set({ currentStep: currentStep - 1 });
        }
      },

      toggleSidebar: () => {
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }));
      },

      setSidebarCollapsed: (collapsed) => {
        set({ isSidebarCollapsed: collapsed });
      },

      setLoading: (loading, message = '') => {
        set({ isLoading: loading, loadingMessage: message });
      },
      
      setError: (error) => {
        set({ error });
      },

      setSkillsState: (state) => {
        set({ skillsState: state });
      },

      updateSkillsState: (updates) => {
        set((state) => ({
          skillsState: { ...state.skillsState, ...updates }
        }));
      },

      resetSkillsState: () => {
        set({ skillsState: INITIAL_SKILLS_STATE });
      },

      setUploadedFile: (file) => {
        set({ uploadedFile: file });
      },

      setAutoAdvanceEnabled: (enabled) => {
        set({ autoAdvanceEnabled: enabled });
      },

      markStepCompleted: (step) => {
        set((state) => {
          const newCompleted = new Set(state.completedSteps);
          newCompleted.add(step);
          return { completedSteps: newCompleted };
        });
      },

      markStepIncomplete: (step) => {
        set((state) => {
          const newCompleted = new Set(state.completedSteps);
          newCompleted.delete(step);
          return { completedSteps: newCompleted };
        });
      },

      resetWorkflowProgress: () => {
        set({ completedSteps: new Set<number>() });
      },

      getStepName: (step) => {
        return STEP_NAMES[step] || 'Unknown';
      },

      getWorkflowProgress: () => {
        const { completedSteps } = get();
        // Only count workflow steps (0-5)
        const workflowCompleted = Array.from(completedSteps).filter(s => s < WORKFLOW_STEP_COUNT).length;
        return {
          completed: workflowCompleted,
          total: WORKFLOW_STEP_COUNT,
          percentage: Math.round((workflowCompleted / WORKFLOW_STEP_COUNT) * 100),
        };
      },
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        currentStep: state.currentStep,
        isSidebarCollapsed: state.isSidebarCollapsed,
        autoAdvanceEnabled: state.autoAdvanceEnabled,
        completedSteps: Array.from(state.completedSteps), // Convert Set to Array for JSON serialization
      }),
      merge: (persistedState: unknown, currentState: AppState) => {
        const state = persistedState as Partial<AppState> & { completedSteps?: number[] } | undefined;
        return {
          ...currentState,
          ...state,
          completedSteps: new Set(state?.completedSteps || []), // Convert Array back to Set
        };
      },
    }
  )
);
