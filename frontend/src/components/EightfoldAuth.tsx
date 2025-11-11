/**
 * Enhanced Eightfold Authentication Component
 * Professional SnapMap-style UI with advanced features
 * Matches the reference design with modern dark theme
 */

import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

interface Environment {
  name: string;
  url: string;
  description: string;
}

interface Config {
  id: string;
  name: string;
  environment: string;
  username: string;
  isDefault?: boolean;
}

const EightfoldAuth: React.FC = () => {
  const [credentials, setCredentials] = useState({
    username: 'demo@eightfolddemo-adoherty.com',
    password: '',
    api_url: 'https://apiv2.eightfold.ai',
    grant_type: 'password',
    auth_header: ''
  });

  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState('ADoherty Demo');
  const [selectedConfig, setSelectedConfig] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [message, setMessage] = useState('');
  const [authResult, setAuthResult] = useState<any>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [skillsCount, setSkillsCount] = useState(0);

  useEffect(() => {
    loadEnvironments();
    loadConfigs();
  }, []);

  const loadEnvironments = async () => {
    try {
      const response = await apiService.getEnvironments();
      setEnvironments(response.environments);
    } catch (error) {
      console.error('Failed to load environments:', error);
    }
  };

  const loadConfigs = () => {
    // Mock configs for demo
    const mockConfigs: Config[] = [
      {
        id: '1',
        name: 'ADoherty Demo',
        environment: 'Demo Sandbox',
        username: 'demo@eightfolddemo-adoherty.com',
        isDefault: true
      },
      {
        id: '2',
        name: 'TM Sandbox',
        environment: 'TM Sandbox',
        username: 'admin@tm-sandbox.eightfold.ai'
      },
      {
        id: '3',
        name: 'Production',
        environment: 'Production API',
        username: 'user@production.eightfold.ai'
      }
    ];
    setConfigs(mockConfigs);
  };

  const handleInputChange = (field: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEnvironmentChange = (envName: string) => {
    setSelectedEnvironment(envName);
    const config = configs.find(c => c.name === envName);
    if (config) {
      setCredentials(prev => ({
        ...prev,
        username: config.username
      }));
    }
  };

  const authenticate = async () => {
    if (!credentials.username || !credentials.password) {
      setMessage('Please enter both username and password');
      return;
    }

    setIsAuthenticating(true);
    setMessage('');

    try {
      const result = await apiService.authenticateEightfold(credentials);
      setAuthResult(result);
      setMessage('Authentication successful! You can now proceed to the next step.');
    } catch (error) {
      setMessage(`Authentication failed: ${error}`);
      setAuthResult(null);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const fetchJIERoles = async () => {
    if (!authResult) {
      setMessage('Please authenticate first');
      return;
    }

    setIsLoading(true);
    try {
      // Mock JIE roles fetch
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSkillsCount(42); // Mock skills count
      setMessage('Successfully fetched JIE roles and extracted skills');
    } catch (error) {
      setMessage(`Failed to fetch JIE roles: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Hero Section - SnapMap Style */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 mb-6">
          <span className="text-3xl">🛡️</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Eightfold Authentication
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Connect securely to your Eightfold environment using your API credentials for seamless JIE integration
        </p>
      </div>

      {/* Main Authentication Card - SnapMap Style */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="px-8 py-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Environment & Credentials</h2>
          <p className="text-sm text-gray-600 mt-1">Select your environment and enter your authentication details</p>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Environment Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Environment
              </label>
              <select
                value={selectedEnvironment}
                onChange={(e) => handleEnvironmentChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eightfold-teal-300 focus:border-eightfold-teal-300 transition-colors"
              >
                {configs.map(config => (
                  <option key={config.id} value={config.name}>
                    {config.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfigModal(true)}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Manage
              </button>
              <button
                onClick={() => setShowConfigModal(true)}
                className="flex-1 px-4 py-3 bg-eightfold-teal-300 hover:bg-eightfold-teal-400 text-eightfold-navy-600 font-medium rounded-lg transition-colors"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Credentials Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eightfold-teal-300 focus:border-eightfold-teal-300 transition-colors"
                placeholder="Enter your Eightfold username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eightfold-teal-300 focus:border-eightfold-teal-300 transition-colors"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {/* Advanced Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grant Type
              </label>
              <select
                value={credentials.grant_type}
                onChange={(e) => handleInputChange('grant_type', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eightfold-teal-300 focus:border-eightfold-teal-300 transition-colors"
              >
                <option value="password">Password</option>
                <option value="authorization_code">Authorization Code</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API URL
              </label>
              <input
                type="url"
                value={credentials.api_url}
                onChange={(e) => handleInputChange('api_url', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eightfold-teal-300 focus:border-eightfold-teal-300 transition-colors"
                placeholder="https://your-environment.eightfold.ai"
              />
            </div>
          </div>

          {/* Optional Auth Header */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Auth Header (optional)
            </label>
            <textarea
              value={credentials.auth_header}
              onChange={(e) => handleInputChange('auth_header', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eightfold-teal-300 focus:border-eightfold-teal-300 transition-colors resize-none"
              placeholder="Basic authentication header (leave empty to use default)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to use the default sandbox authentication header
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={authenticate}
              disabled={isAuthenticating || !credentials.username || !credentials.password}
              className="px-8 py-3 bg-eightfold-teal-300 hover:bg-eightfold-teal-400 text-eightfold-navy-600 font-semibold rounded-lg transition-all hover:-translate-y-0.5 shadow-eightfold-teal disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isAuthenticating ? 'Authenticating...' : 'Authenticate'}
            </button>

            <button
              onClick={() => setMessage('Testing API connection...')}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg transition-colors hover:bg-gray-50"
            >
              Test Connection
            </button>
          </div>
        </div>
      </div>

      {/* Status Messages - SnapMap Style */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg border ${
          message.includes('successful') || message.includes('Successfully')
            ? 'bg-green-50 border-green-200'
            : message.includes('failed') || message.includes('Failed') || message.includes('error')
            ? 'bg-red-50 border-red-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-lg flex-shrink-0">
              {message.includes('successful') || message.includes('Successfully') ? '✅' :
               message.includes('failed') || message.includes('Failed') || message.includes('error') ? '❌' : 'ℹ️'}
            </span>
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                message.includes('successful') || message.includes('Successfully')
                  ? 'text-green-800'
                  : message.includes('failed') || message.includes('Failed') || message.includes('error')
                  ? 'text-red-800'
                  : 'text-blue-800'
              }`}>
                {message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Authentication Success Card */}
      {authResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 text-lg">✓</span>
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-green-800 mb-2">
                Authentication Successful!
              </h4>
              <div className="space-y-2 text-sm text-green-700">
                <p><span className="font-medium">Environment:</span> {authResult.environment}</p>
                <p><span className="font-medium">Status:</span> {authResult.message}</p>
                {authResult.token && (
                  <p><span className="font-medium">Token:</span> {authResult.token.substring(0, 20)}...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EightfoldAuth;