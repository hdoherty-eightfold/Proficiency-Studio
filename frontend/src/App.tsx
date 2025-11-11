/**
 * SkillsProfGen - Exact SnapMap UI Implementation
 * AI-Powered Skills Proficiency Assessment System
 * Using Eightfold Brand Design System
 */

import React, { useState } from 'react';
import EightfoldAuth from './components/EightfoldAuth';
import SkillsExtractionAdvanced from './components/SkillsExtractionAdvanced';
import LLMConfiguration from './components/LLMConfiguration';
import AssessmentAdvanced from './components/AssessmentAdvanced';
import ResultsAdvanced from './components/ResultsAdvanced';

function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navItems = [
    { id: 0, name: 'Welcome', icon: '👋', description: 'Introduction to SkillsProfGen' },
    { id: 1, name: 'Authentication', icon: '🛡️', description: 'Environment & API setup' },
    { id: 2, name: 'Skills Extraction', icon: '📋', description: 'Extract skills from JIE roles' },
    { id: 3, name: 'Resume Upload', icon: '📄', description: 'Upload candidate resumes' },
    { id: 4, name: 'LLM Configuration', icon: '⚙️', description: 'Configure AI providers' },
    { id: 5, name: 'Assessment', icon: '🚀', description: 'Run skills assessment' },
    { id: 6, name: 'Results', icon: '📊', description: 'View assessment results' },
  ];

  const isStepAccessible = (stepId: number): boolean => {
    if (stepId === 0) return true; // Welcome - always accessible
    if (stepId === 1) return true; // Authentication - always accessible
    if (stepId === 2) return true; // Skills Extraction - always accessible
    if (stepId === 3) return true; // Resume Upload - always accessible
    if (stepId === 4) return true; // LLM Configuration - always accessible
    if (stepId === 5) return true; // Assessment - always accessible
    if (stepId === 6) return true; // Results - always accessible
    return false;
  };

  const handleNavClick = (stepId: number) => {
    setCurrentStep(stepId);
  };

  return (
    <div className="min-h-screen bg-white flex transition-colors">
      {/* Sidebar Navigation - Exact SnapMap Style */}
      <aside className={`fixed left-0 top-0 bottom-0 bg-gradient-navy border-r border-eightfold-teal-300/20 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        {/* Collapse Toggle Button - Eightfold Styled */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-6 z-10 w-6 h-6 bg-eightfold-teal-300 border border-eightfold-teal-400 rounded-full flex items-center justify-center hover:bg-eightfold-teal-400 transition-all hover:scale-110 shadow-eightfold-teal text-eightfold-navy-600"
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="text-xs font-bold">{isSidebarCollapsed ? '→' : '←'}</span>
        </button>

        {/* Logo/Brand - SkillsProfGen with "S" logo like SnapMap */}
        <div className="p-6 border-b border-eightfold-teal-300/20">
          {!isSidebarCollapsed ? (
            <>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 flex items-center justify-center shadow-lg">
                  <span className="text-xl font-bold text-white">S</span>
                </div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-cyan-300 via-teal-300 to-emerald-400 bg-clip-text text-transparent tracking-tight">
                  SkillsProfGen
                </h1>
              </div>
              <p className="text-xs text-cyan-200/90 mt-2 font-semibold tracking-wide" style={{ marginLeft: '52px' }}>
                AI-Powered Skills Assessment
              </p>
            </>
          ) : (
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 flex items-center justify-center shadow-lg">
                <span className="text-xl font-bold text-white">S</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation - Eightfold Styled */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {!isSidebarCollapsed && (
            <div className="text-caption text-eightfold-teal-300 uppercase tracking-wider px-3 mb-3 font-bold">
              Workflow
            </div>
          )}

          {/* Navigation Items */}
          {navItems.map((item) => {
            const isActive = currentStep === item.id;
            const isAccessible = isStepAccessible(item.id);
            const isCompleted = currentStep > item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                disabled={!isAccessible}
                title={isSidebarCollapsed ? item.name : ''}
                className={`
                  w-full text-left rounded-lg transition-all duration-200
                  flex items-start group relative
                  ${isSidebarCollapsed ? 'px-3 py-3 justify-center' : 'px-3 py-2.5 gap-3'}
                  ${isActive
                    ? 'bg-eightfold-teal-300/20 text-eightfold-teal-300 font-semibold border-l-3 border-eightfold-teal-300'
                    : isAccessible
                    ? 'hover:bg-white/5 text-white/90 hover:text-eightfold-teal-200'
                    : 'text-white/30 cursor-not-allowed'
                  }
                `}
              >
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-eightfold-teal-300 rounded-r" />
                )}

                {/* Icon */}
                <span className={`text-xl flex-shrink-0 ${isSidebarCollapsed ? '' : 'mt-0.5'}`}>
                  {isCompleted ? '✓' : item.icon}
                </span>

                {/* Content - Only show when expanded */}
                {!isSidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{item.name}</span>
                      {isCompleted && (
                        <span className="text-xs bg-eightfold-teal-300/20 text-eightfold-teal-300 px-2 py-0.5 rounded-pill font-bold">
                          Done
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/60 mt-0.5 line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Actions - Eightfold Styled */}
        <div className="p-4 border-t border-eightfold-teal-300/20 space-y-2">
          <button
            className={`w-full px-4 py-2.5 text-sm font-semibold text-eightfold-navy-600 bg-eightfold-teal-300 hover:bg-eightfold-teal-400 rounded-pill transition-all hover:-translate-y-0.5 shadow-eightfold-teal flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-center gap-2'}`}
            title={isSidebarCollapsed ? 'Dark Mode' : ''}
          >
            🌙 {!isSidebarCollapsed && <span>Dark Mode</span>}
          </button>

          <button
            onClick={() => setCurrentStep(0)}
            className={`w-full px-4 py-2.5 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 rounded-pill transition-all ${isSidebarCollapsed ? 'flex justify-center' : ''}`}
            title={isSidebarCollapsed ? 'Start Over' : ''}
          >
            {isSidebarCollapsed ? '🔄' : '🔄 Start Over'}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'} bg-gray-100`}>
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Welcome to SkillsProfGen</h2>
              <p className="text-gray-600">AI-Powered Skills Proficiency Assessment System</p>
            </div>
            <div className="flex items-center gap-4">
              <img
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40'%3E%3Ctext x='10' y='25' font-family='Arial, sans-serif' font-size='20' font-weight='bold' fill='%23008FBF'%3EEightfold%3C/text%3E%3C/svg%3E"
                alt="Eightfold"
                className="h-8"
              />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-8">
          <div className="max-w-7xl mx-auto">
            {/* Main Content Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Dynamic Content Based on Current Step */}
              <div className="p-8">
                {currentStep === 0 && (
                  <div>
                    {/* Hero Section */}
                    <div className="text-center mb-8">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 mb-4">
                        <span className="text-3xl">🎯</span>
                      </div>
                      <h1 className="text-xl font-bold text-gray-900 mb-4">
                        Welcome to SkillsProfGen
                      </h1>
                      <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Transform skills assessment with AI-powered proficiency evaluation and RAG pipeline technology
                      </p>
                    </div>

                    {/* What is SkillsProfGen */}
                    <div className="mb-8 p-6 bg-gray-50 rounded-lg">
                      <h2 className="text-2xl font-bold mb-4">What is SkillsProfGen?</h2>
                      <p className="text-gray-700 leading-relaxed">
                        SkillsProfGen is an intelligent skills proficiency assessment tool that combines advanced AI with RAG pipeline technology.
                        Using Claude agents and multiple LLM providers, it automatically evaluates candidate skills from resumes and job descriptions,
                        providing detailed proficiency levels with confidence scoring and evidence-based reasoning.
                        The entire process integrates seamlessly with Eightfold systems for comprehensive talent assessment.
                      </p>
                    </div>

                    {/* Get Started Button */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="px-8 py-4 text-lg bg-eightfold-teal-300 hover:bg-eightfold-teal-400 text-eightfold-navy-600 font-semibold rounded-pill transition-all hover:-translate-y-0.5 shadow-eightfold-teal flex items-center gap-2"
                      >
                        Get Started →
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 1: Authentication */}
                {currentStep === 1 && (
                  <EightfoldAuth />
                )}

                {/* Step 2: Skills Extraction */}
                {currentStep === 2 && (
                  <SkillsExtractionAdvanced />
                )}

                {/* Step 3: Resume Upload */}
                {currentStep === 3 && (
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 mb-4">
                      <span className="text-3xl">📄</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Resume Upload</h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                      Upload candidate resumes for analysis and skills extraction
                    </p>
                    <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
                      <p className="text-gray-600 mb-4">Resume upload feature coming soon!</p>
                      <p className="text-sm text-gray-500">
                        This feature will allow you to upload PDF/Word documents for automated skills extraction
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 4: LLM Configuration */}
                {currentStep === 4 && (
                  <LLMConfiguration />
                )}

                {/* Step 5: Assessment */}
                {currentStep === 5 && (
                  <AssessmentAdvanced />
                )}

                {/* Step 6: Results */}
                {currentStep === 6 && (
                  <ResultsAdvanced />
                )}
              </div>
            </div>

            {/* Helpful Tips - Exact SnapMap Style */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-blue-600 text-lg">💡</span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">
                    Welcome
                  </h3>
                  <p className="text-sm text-blue-700">
                    Learn about SkillsProfGen and how it uses AI-powered assessment with RAG pipeline to evaluate skills proficiency from resumes and job descriptions using advanced Claude agents and multiple LLM providers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;