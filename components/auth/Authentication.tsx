/**
 * Authentication Component
 * Environment selection and API authentication
 */
import React, { useState } from 'react';
import { ShieldCheckIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

const Authentication: React.FC = () => {
  const [selectedEnvironment, setSelectedEnvironment] = useState('');
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });

  const environments = [
    { id: 'usaa-tm', name: 'USAA TM Sandbox', url: 'usaa-tm-sandbox.eightfold.ai' },
    { id: 'adoherty', name: 'ADoherty Demo', url: 'adoherty-demo.eightfold.ai' },
    { id: 'eu-dev', name: 'EU Development', url: 'eu-dev.eightfold.ai' },
    { id: 'custom', name: 'Custom Environment', url: 'custom.eightfold.ai' },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center mb-8">
        <ShieldCheckIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Environment & Authentication
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Select your Eightfold environment and configure authentication
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Environment Selection */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <GlobeAltIcon className="h-5 w-5 mr-2" />
            Environment Selection
          </h3>
          <div className="space-y-3">
            {environments.map((env) => (
              <label key={env.id} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="environment"
                  value={env.id}
                  checked={selectedEnvironment === env.id}
                  onChange={(e) => setSelectedEnvironment(e.target.value)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {env.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {env.url}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Authentication Form */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Eightfold Credentials
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                className="input-field"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="input-field"
                placeholder="Enter your password"
              />
            </div>
            <button className="w-full btn-primary">
              Test Connection
            </button>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center">
          <div className="h-3 w-3 bg-yellow-400 rounded-full mr-3 animate-pulse" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Connection Status
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {selectedEnvironment && credentials.username && credentials.password
                ? 'Ready to test connection'
                : 'Please select an environment and enter credentials'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Authentication;