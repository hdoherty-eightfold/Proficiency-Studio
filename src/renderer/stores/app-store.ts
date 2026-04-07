import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Skills types
// NOTE: This is a CLIENT-SIDE SUPERSET of the API's Skill type (src/renderer/types/api.ts).
// The `proficiency` and `proficiency_name` fields are added client-side after assessment
// and are never present in the raw API response. Components reading these fields must
// only do so after the assessment flow has run (step 4 → store enrichment).
export interface Skill {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  source?: 'csv' | 'api' | 'sftp';
  sourceId?: string;
  proficiency?: number; // 1-5 proficiency level (client-side, post-assessment)
  proficiency_name?: string; // e.g., "Novice", "Expert" (client-side, post-assessment)
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

  // Connected API environment (e.g. Eightfold)
  connectedEnvironment: { name: string; url: string } | null;

  // Connected SFTP server
  connectedSFTPServer: { id: string; name: string; host: string } | null;

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
  setConnectedEnvironment: (env: { name: string; url: string } | null) => void;
  setConnectedSFTPServer: (server: { id: string; name: string; host: string } | null) => void;
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
      connectedEnvironment: null,
      connectedSFTPServer: null,

      setCurrentStep: (step) => {
        if (step >= 0 && step < STEP_NAMES.length) {
          set({ currentStep: step });
        }
      },

      nextStep: () => {
        const { currentStep, completedSteps } = get();
        if (currentStep < STEP_NAMES.length - 1) {
          // Auto-mark the current step as completed when advancing
          const newCompleted = new Set(completedSteps);
          newCompleted.add(currentStep);
          set({ currentStep: currentStep + 1, completedSteps: newCompleted });
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
          skillsState: { ...state.skillsState, ...updates },
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

      setConnectedEnvironment: (env) => {
        set({ connectedEnvironment: env });
      },

      setConnectedSFTPServer: (server) => {
        set({ connectedSFTPServer: server });
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
        // Clear all workflow-related localStorage keys
        Object.keys(localStorage)
          .filter((k) => k.startsWith('profstudio_'))
          .forEach((k) => localStorage.removeItem(k));
        set({
          currentStep: 0,
          completedSteps: new Set<number>(),
          skillsState: INITIAL_SKILLS_STATE,
          uploadedFile: null,
          connectedEnvironment: null,
          connectedSFTPServer: null,
        });
      },

      getStepName: (step) => {
        return STEP_NAMES[step] || 'Unknown';
      },

      getWorkflowProgress: () => {
        const { completedSteps } = get();
        // Only count workflow steps (0-5)
        const workflowCompleted = Array.from(completedSteps).filter(
          (s) => s < WORKFLOW_STEP_COUNT
        ).length;
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
        connectedEnvironment: state.connectedEnvironment,
        skillsState: state.skillsState,
      }),
      merge: (persistedState: unknown, currentState: AppState) => {
        const state = persistedState as
          | (Partial<AppState> & { completedSteps?: number[] })
          | undefined;
        return {
          ...currentState,
          ...state,
          completedSteps: new Set(state?.completedSteps || []), // Convert Array back to Set
        };
      },
    }
  )
);
