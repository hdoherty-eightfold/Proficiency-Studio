/**
 * Skills Extraction Component
 * Extract skills from JIE roles or upload custom skill lists
 */
import React, { useState } from 'react';
import { ListBulletIcon, DocumentArrowUpIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const SkillsExtraction: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'jie' | 'upload' | 'search'>('jie');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadedSkills, setUploadedSkills] = useState<string>('');

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center mb-8">
        <ListBulletIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Skills Extraction & Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Extract skills from JIE roles, upload custom lists, or search skill taxonomies
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('jie')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'jie'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            JIE Roles
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upload'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Upload Skills
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'search'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Search Skills
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'jie' && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            JIE Role Skills Extraction
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search JIE Roles
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field flex-1"
                  placeholder="Enter job role or keywords..."
                />
                <button className="btn-primary">
                  <MagnifyingGlassIcon className="h-4 w-4 mr-1" />
                  Search
                </button>
              </div>
            </div>

            {/* Mock Results */}
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg">
              <div className="p-3 border-b border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white">Search Results</h4>
              </div>
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <MagnifyingGlassIcon className="h-8 w-8 mx-auto mb-2" />
                <p>Enter a search term to find JIE roles and extract their skills</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Upload Custom Skills List
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Skills List (one per line)
              </label>
              <textarea
                value={uploadedSkills}
                onChange={(e) => setUploadedSkills(e.target.value)}
                rows={10}
                className="input-field"
                placeholder="Python&#10;JavaScript&#10;Machine Learning&#10;Project Management&#10;..."
              />
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {uploadedSkills.split('\n').filter(s => s.trim()).length} skills entered
              </p>
              <button className="btn-primary">
                <DocumentArrowUpIcon className="h-4 w-4 mr-1" />
                Upload Skills
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'search' && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Search Skill Taxonomies
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search Skills Database
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  className="input-field flex-1"
                  placeholder="Search for specific skills or categories..."
                />
                <button className="btn-primary">
                  <MagnifyingGlassIcon className="h-4 w-4 mr-1" />
                  Search
                </button>
              </div>
            </div>

            {/* Category Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['Programming', 'Leadership', 'Analytics', 'Communication'].map((category) => (
                <button
                  key={category}
                  className="px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selected Skills Summary */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          Selected Skills Summary
        </h4>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          0 skills selected for assessment. Use one of the methods above to add skills to your assessment.
        </p>
      </div>
    </div>
  );
};

export default SkillsExtraction;