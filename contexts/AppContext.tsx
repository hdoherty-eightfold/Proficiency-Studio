/**
 * App Context - Main application state management
 * Manages workflow steps and global application state
 */
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AppContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  goToStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  canProceed: boolean;
  setCanProceed: (canProceed: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const steps = [
  { id: 0, name: 'Welcome', icon: 'home', title: 'Welcome to SkillsProfGen' },
  { id: 1, name: 'Authentication', icon: 'shield-check', title: 'Environment & Authentication' },
  { id: 2, name: 'Skills Extraction', icon: 'list', title: 'Skills Extraction & Management' },
  { id: 3, name: 'Resume Upload', icon: 'upload', title: 'Resume Upload & Analysis' },
  { id: 4, name: 'LLM Configuration', icon: 'settings', title: 'LLM Provider Configuration' },
  { id: 5, name: 'Assessment Execution', icon: 'play', title: 'Skills Assessment Execution' },
  { id: 6, name: 'Results Management', icon: 'chart-bar', title: 'Assessment Results & Analysis' },
];

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [canProceed, setCanProceed] = useState(true);

  const goToStep = (step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1 && canProceed) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const value: AppContextType = {
    currentStep,
    setCurrentStep,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    goToStep,
    nextStep,
    previousStep,
    canProceed,
    setCanProceed,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};