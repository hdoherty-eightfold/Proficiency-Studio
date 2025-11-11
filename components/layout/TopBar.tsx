/**
 * TopBar Component
 * Application header with theme toggle and user info
 */
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useApp, steps } from '../../contexts/AppContext';
import { SunIcon, MoonIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

const TopBar: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const { currentStep } = useApp();
  const currentStepData = steps[currentStep];

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
      <div className="px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Current Step Info */}
          <div className="flex items-center">
            <AcademicCapIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {currentStepData.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Step {currentStep + 1} of {steps.length} • AI-Powered Skills Assessment
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
            >
              {isDark ? (
                <SunIcon className="h-4 w-4 mr-2" />
              ) : (
                <MoonIcon className="h-4 w-4 mr-2" />
              )}
              <span>{isDark ? 'Light' : 'Dark'} Mode</span>
            </button>

            {/* Status Indicator */}
            <div className="flex items-center text-sm">
              <div className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              <span className="text-gray-600 dark:text-gray-400">System Ready</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;