/**
 * Assessment Execution Component
 * Run skills assessment with real-time progress
 */
import React, { useState } from 'react';
import { PlayIcon, PauseIcon, StopIcon } from '@heroicons/react/24/outline';

const AssessmentExecution: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center mb-8">
        <PlayIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Skills Assessment Execution
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Run multi-method proficiency assessments with real-time progress tracking
          </p>
        </div>
      </div>

      {/* Assessment Summary */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Assessment Summary
        </h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">0</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Skills Selected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">0</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Resumes Uploaded</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">2</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">LLM Providers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">3</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Assessment Methods</div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Assessment Control
          </h4>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                isRunning
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isRunning ? (
                <>
                  <PauseIcon className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Start Assessment
                </>
              )}
            </button>
            <button className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">
              <StopIcon className="h-4 w-4 mr-2" />
              Stop
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>Overall Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
            <div
              className="bg-primary-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Status: {isRunning ? 'Running assessment...' : 'Ready to start'}
        </div>
      </div>

      {/* Real-time Results */}
      <div className="grid lg:grid-cols-3 gap-6">
        {['Direct LLM', 'RAG-Enhanced', 'Python-Based'].map((method, index) => (
          <div key={method} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white">{method}</h4>
            </div>
            <div className="p-4">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <div className="h-3 w-3 bg-gray-300 rounded-full mx-auto mb-2" />
                <p className="text-sm">Waiting to start...</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          Pre-Assessment Checklist
        </h4>
        <div className="grid md:grid-cols-2 gap-2 text-sm text-blue-700 dark:text-blue-300">
          <div>✓ Environment authenticated</div>
          <div>✓ LLM providers configured</div>
          <div>⚠ Skills list required</div>
          <div>⚠ Resume upload required</div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentExecution;