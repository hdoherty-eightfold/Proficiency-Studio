/**
 * Results Management Component
 * View, analyze, and manage assessment results
 */
import React, { useState } from 'react';
import { ChartBarIcon, DocumentArrowDownIcon, EyeIcon } from '@heroicons/react/24/outline';

const ResultsManagement: React.FC = () => {
  const [activeView, setActiveView] = useState<'summary' | 'detailed' | 'comparison'>('summary');

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <ChartBarIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Assessment Results & Analysis
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Review detailed assessment results and comparative analysis
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export Report
          </button>
          <button className="flex items-center px-4 py-2 btn-secondary">
            <EyeIcon className="h-4 w-4 mr-2" />
            View History
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'summary', name: 'Summary' },
            { id: 'detailed', name: 'Detailed Results' },
            { id: 'comparison', name: 'Method Comparison' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeView === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Summary View */}
      {activeView === 'summary' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { label: 'Total Skills Assessed', value: '0', color: 'blue' },
              { label: 'Average Proficiency', value: '-', color: 'green' },
              { label: 'High-Level Skills', value: '0', color: 'purple' },
              { label: 'Assessment Time', value: '-', color: 'yellow' },
            ].map((metric, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
                <div className={`text-3xl font-bold text-${metric.color}-600 dark:text-${metric.color}-400 mb-2`}>
                  {metric.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>

          {/* Skills Distribution */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Skills Proficiency Distribution
            </h3>
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
              <ChartBarIcon className="h-12 w-12 mx-auto mb-4" />
              <p>No assessment data available. Complete an assessment to view results.</p>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Results View */}
      {activeView === 'detailed' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Detailed Skills Assessment
            </h3>
          </div>
          <div className="p-6">
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
              <DocumentArrowDownIcon className="h-12 w-12 mx-auto mb-4" />
              <p>Detailed results will appear here after running an assessment.</p>
            </div>
          </div>
        </div>
      )}

      {/* Method Comparison View */}
      {activeView === 'comparison' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {['Direct LLM', 'RAG-Enhanced', 'Python-Based'].map((method, index) => (
            <div key={method} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white">{method}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Assessment Results</p>
              </div>
              <div className="p-6">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <div className="text-2xl font-bold mb-2">-</div>
                  <p className="text-sm">No results available</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assessment History */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Assessment History
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              No previous assessments found. Your assessment results will be saved here.
            </p>
          </div>
          <button className="btn-primary">
            View All History
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsManagement;