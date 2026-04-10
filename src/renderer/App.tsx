import React, { useEffect, useState, Suspense, lazy } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useAppStore } from '@/stores/app-store';
import { Toaster } from '@/components/ui/toaster';
import Sidebar from '@/components/layout/Sidebar';
import { ErrorBoundary, GlobalErrorHandler } from '@/components/common/ErrorBoundary';
import { BackendStatusBanner } from '@/components/common/BackendStatus';
import { CommandPalette } from '@/components/common/CommandPalette';
import { Loader2 } from 'lucide-react';
import { Skeleton, SkeletonStats } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useWindowSize } from '@/hooks/useWindowSize';

/**
 * Lazy-loaded step components for code splitting
 * Each component is loaded on-demand to reduce initial bundle size
 */
const Welcome = lazy(() => import('@/components/welcome/Welcome'));
const IntegrationPath = lazy(() => import('@/components/integration/IntegrationPath'));
const ExtractSkills = lazy(() => import('@/components/skills/ExtractSkills'));
const ConfigureProficiency = lazy(() => import('@/components/proficiency/ConfigureProficiency'));
const RunAssessment = lazy(() => import('@/components/proficiency/RunAssessment'));
const ReviewAssessment = lazy(() => import('@/components/review/ReviewAssessment'));
const AssessmentHistory = lazy(() => import('@/components/history/AssessmentHistory'));
const AnalyticsDashboard = lazy(() => import('@/components/analytics/AnalyticsDashboard'));
const PromptEditor = lazy(() => import('@/components/prompts/PromptEditor'));
const EnvironmentManager = lazy(() => import('@/components/environments/EnvironmentManager'));
const Settings = lazy(() => import('@/components/settings/Settings'));
const Documentation = lazy(() => import('@/components/documentation/Documentation'));

/**
 * Loading fallback component for Suspense
 */
const StepLoadingFallback = () => (
  <div className="max-w-7xl mx-auto p-8 space-y-6">
    {/* Header skeleton */}
    <div className="text-center space-y-3">
      <Skeleton variant="circular" width={64} height={64} className="mx-auto" />
      <Skeleton variant="text" className="w-1/3 h-8 mx-auto" />
      <Skeleton variant="text" className="w-1/2 h-4 mx-auto" />
    </div>
    {/* Stats cards skeleton */}
    <SkeletonStats />
    {/* Content skeleton */}
    <div className="space-y-3">
      <Skeleton variant="rounded" className="w-full h-12" />
      <Skeleton variant="rounded" className="w-full h-48" />
    </div>
    {/* Subtle loading indicator */}
    <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>Loading step...</span>
    </div>
  </div>
);

/**
 * Page transition wrapper component — respects prefers-reduced-motion
 */
function PageTransition({ children, pageKey }: { children: React.ReactNode; pageKey: number }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      key={pageKey}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? {} : { opacity: 0, y: -8 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
}

/**
 * Step component mapping for cleaner rendering
 */
const STEP_COMPONENTS = [
  Welcome, // 0
  IntegrationPath, // 1
  ExtractSkills, // 2
  ConfigureProficiency, // 3
  RunAssessment, // 4
  ReviewAssessment, // 5
  AssessmentHistory, // 6
  AnalyticsDashboard, // 7
  PromptEditor, // 8
  EnvironmentManager, // 9
  Settings, // 10
  Documentation, // 11
];

/**
 * Main Application Component
 * Proficiency Studio Desktop - AI-Powered Proficiency Assessment
 */
function App() {
  const currentStep = useAppStore((state) => state.currentStep);
  const isSidebarCollapsed = useAppStore((state) => state.isSidebarCollapsed);
  const setSidebarCollapsed = useAppStore((state) => state.setSidebarCollapsed);
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  const nextStep = useAppStore((state) => state.nextStep);
  const previousStep = useAppStore((state) => state.previousStep);

  const { width: windowWidth } = useWindowSize();
  const [backendError, setBackendError] = useState<string | null>(null);

  // Auto-collapse sidebar when window is narrow
  useEffect(() => {
    if (windowWidth < 768 && !isSidebarCollapsed) {
      setSidebarCollapsed(true);
    }
  }, [windowWidth, isSidebarCollapsed, setSidebarCollapsed]);

  // Listen for backend crash/failure notifications
  useEffect(() => {
    if (!window.electron?.onBackendStatus) return;
    const cleanup = window.electron.onBackendStatus(
      (status: { status: string; error?: string }) => {
        if (status.status === 'crashed' || status.status === 'failed') {
          setBackendError(status.error || 'Backend is unavailable');
        }
      }
    );
    return cleanup;
  }, []);

  // Listen for menu actions from Electron
  useEffect(() => {
    if (!window.electron) return;

    const removeListener = window.electron.onMenuAction((channel: string, ...args: unknown[]) => {
      switch (channel) {
        case 'menu:new-project':
          setCurrentStep(0);
          break;
        case 'menu:settings':
          setCurrentStep(10);
          break;
        case 'menu:next-step':
          nextStep();
          break;
        case 'menu:previous-step':
          previousStep();
          break;
        case 'menu:goto-step':
          setCurrentStep(args[0] as number);
          break;
      }
    });

    return removeListener;
  }, [setCurrentStep, nextStep, previousStep]);

  // Scroll to top when navigating between steps
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
  }, [currentStep]);

  // Get the current step component
  const StepComponent = STEP_COMPONENTS[currentStep] || Welcome;

  return (
    <ErrorBoundary>
      <GlobalErrorHandler>
        <TooltipProvider>
          <div className="min-h-screen bg-background flex flex-col transition-colors">
            {/* Skip to content link for keyboard navigation */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-background focus:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:rounded-md"
            >
              Skip to content
            </a>

            {/* Backend Status Banner - shows when backend is unavailable */}
            <BackendStatusBanner />

            {/* Backend crash/failure banner */}
            <div aria-live="assertive" aria-atomic="true">
              {backendError && (
                <div
                  role="alert"
                  className="bg-destructive text-destructive-foreground px-4 py-2 text-sm text-center font-medium"
                >
                  Backend Error: {backendError}. Please restart the application.
                </div>
              )}
            </div>

            <div className="flex flex-1">
              {/* Sidebar Navigation */}
              <ErrorBoundary
                fallback={
                  <div className="w-20 bg-card border-r border-border flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Menu Error</p>
                  </div>
                }
              >
                <Sidebar />
              </ErrorBoundary>

              {/* Main Content Area */}
              <div
                className={`flex-1 transition-all duration-300 ${
                  isSidebarCollapsed ? 'ml-20' : 'ml-64'
                } bg-muted/30`}
              >
                <main id="main-content" className="p-0" role="main">
                  <div className="w-full">
                    {/* Step Content with Suspense, Error Boundary, and Page Transitions */}
                    <Suspense fallback={<StepLoadingFallback />}>
                      <ErrorBoundary resetKeys={[currentStep]}>
                        <AnimatePresence mode="wait">
                          <PageTransition pageKey={currentStep}>
                            <StepComponent />
                          </PageTransition>
                        </AnimatePresence>
                      </ErrorBoundary>
                    </Suspense>
                  </div>
                </main>
              </div>
            </div>

            {/* Toast Notifications */}
            <Toaster />

            {/* Command Palette (Cmd+K / Ctrl+K) */}
            <CommandPalette />
          </div>
        </TooltipProvider>
      </GlobalErrorHandler>
    </ErrorBoundary>
  );
}

export default App;
