/**
 * Main Application Component
 * SkillsProfGen - AI-powered Skills Proficiency Assessment System
 * Modern UI with Sidebar Navigation and Dark Mode
 */
import React from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Welcome from './components/Welcome';
import Authentication from './components/auth/Authentication';
import SkillsExtraction from './components/skills/SkillsExtraction';
import ResumeUpload from './components/upload/ResumeUpload';
import LLMConfiguration from './components/assessment/LLMConfiguration';
import AssessmentExecution from './components/assessment/AssessmentExecution';
import ResultsManagement from './components/results/ResultsManagement';
import NavigationArrows from './components/common/NavigationArrows';
import ToastContainer from './components/common/ToastContainer';
import './index.css';

const AppContent: React.FC = () => {
  const { currentStep, isSidebarCollapsed } = useApp();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'} bg-gray-100 dark:bg-gray-900`}>
        {/* Top Bar */}
        <TopBar />

        {/* Content */}
        <main className="p-8">
          <div className="max-w-7xl mx-auto">
            {/* Step Content */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
              {currentStep === 0 && <Welcome />}
              {currentStep === 1 && <Authentication />}
              {currentStep === 2 && <SkillsExtraction />}
              {currentStep === 3 && <ResumeUpload />}
              {currentStep === 4 && <LLMConfiguration />}
              {currentStep === 5 && <AssessmentExecution />}
              {currentStep === 6 && <ResultsManagement />}
            </div>

            {/* Helpful Tips */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-blue-600 dark:text-blue-400 text-lg">💡</span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    {currentStep === 0 && 'Welcome'}
                    {currentStep === 1 && 'Authentication & Environment Setup'}
                    {currentStep === 2 && 'Skills Extraction'}
                    {currentStep === 3 && 'Resume Upload'}
                    {currentStep === 4 && 'LLM Configuration'}
                    {currentStep === 5 && 'Assessment Execution'}
                    {currentStep === 6 && 'Results & Analysis'}
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {currentStep === 0 && 'Learn about SkillsProfGen and how it uses AI-powered assessment with RAG pipeline to evaluate skills proficiency from resumes and job descriptions.'}
                    {currentStep === 1 && 'Select your Eightfold environment and configure API credentials for secure access to role and skills data.'}
                    {currentStep === 2 && 'Extract skills from JIE roles, upload custom skill lists, or choose from pre-defined skill sets for comprehensive assessment.'}
                    {currentStep === 3 && 'Upload candidate resumes in various formats. The system will extract and analyze relevant experience and qualifications.'}
                    {currentStep === 4 && 'Configure your preferred LLM providers (OpenAI, Anthropic, Google Gemini) and set assessment parameters for optimal results.'}
                    {currentStep === 5 && 'Run multi-method proficiency assessments with real-time progress tracking. Compare Direct LLM, RAG-Enhanced, and Python-based assessments.'}
                    {currentStep === 6 && 'Review detailed assessment results, export reports, and manage assessment history with comparative analysis tools.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Navigation Arrows */}
      <NavigationArrows />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;