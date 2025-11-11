/**
 * Navigation Arrows Component
 * Floating navigation controls for step-by-step workflow
 */
import React from 'react';
import { useApp, steps } from '../../contexts/AppContext';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const NavigationArrows: React.FC = () => {
  const { currentStep, previousStep, nextStep, canProceed } = useApp();

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed bottom-8 right-8 flex space-x-3">
      {/* Previous Button */}
      {!isFirstStep && (
        <button
          onClick={previousStep}
          className="flex items-center px-4 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
        >
          <ChevronLeftIcon className="h-5 w-5 mr-2" />
          <span className="font-medium">Previous</span>
        </button>
      )}

      {/* Next Button */}
      {!isLastStep && (
        <button
          onClick={nextStep}
          disabled={!canProceed}
          className={`flex items-center px-4 py-3 rounded-lg shadow-lg font-medium transition-colors duration-200 ${
            canProceed
              ? 'bg-primary-600 hover:bg-primary-700 text-white'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          <span className="mr-2">Next</span>
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default NavigationArrows;