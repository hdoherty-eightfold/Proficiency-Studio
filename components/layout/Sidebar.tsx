/**
 * Sidebar Component
 * Navigation sidebar with step-based workflow
 */
import React from 'react';
import { useApp, steps } from '../../contexts/AppContext';
import {
  HomeIcon,
  ShieldCheckIcon,
  ListBulletIcon,
  ArrowUpTrayIcon,
  Cog6ToothIcon,
  PlayIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const iconMap = {
  'home': HomeIcon,
  'shield-check': ShieldCheckIcon,
  'list': ListBulletIcon,
  'upload': ArrowUpTrayIcon,
  'settings': Cog6ToothIcon,
  'play': PlayIcon,
  'chart-bar': ChartBarIcon,
};

const Sidebar: React.FC = () => {
  const { currentStep, goToStep, isSidebarCollapsed, setIsSidebarCollapsed } = useApp();

  return (
    <div className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
      isSidebarCollapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {!isSidebarCollapsed && (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              SkillsProfGen
            </h2>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            {isSidebarCollapsed ? (
              <ChevronRightIcon className="h-5 w-5" />
            ) : (
              <ChevronLeftIcon className="h-5 w-5" />
            )}
          </button>
        </div>
        {!isSidebarCollapsed && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            AI-Powered Skills Assessment
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {steps.map((step) => {
          const Icon = iconMap[step.icon as keyof typeof iconMap];
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <button
              key={step.id}
              onClick={() => goToStep(step.id)}
              className={`w-full sidebar-link ${
                isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
              }`}
              title={isSidebarCollapsed ? step.name : undefined}
            >
              <div className="flex items-center">
                <div className="relative flex-shrink-0">
                  <Icon className="h-5 w-5" />
                  {isCompleted && (
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full flex items-center justify-center">
                      <div className="h-1.5 w-1.5 bg-white rounded-full" />
                    </div>
                  )}
                </div>
                {!isSidebarCollapsed && (
                  <div className="ml-3 flex-1 text-left">
                    <div className="text-sm font-medium">{step.name}</div>
                    <div className="text-xs opacity-75 mt-0.5">
                      Step {step.id + 1}
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Progress Indicator */}
      {!isSidebarCollapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
              <span>Progress</span>
              <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;