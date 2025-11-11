/**
 * LLM Configuration Component
 * Allows users to configure API keys for different LLM providers
 */

import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

interface ApiKeyStatus {
  openai: boolean;
  anthropic: boolean;
  google: boolean;
  grok: boolean;
  eightfold: boolean;
}

interface TestResults {
  [provider: string]: {
    configured: boolean;
    status?: string;
    message?: string;
    response?: string;
    error?: string;
  };
}

const LLMConfiguration: React.FC = () => {
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    google: '',
    grok: ''
  });

  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>({
    openai: false,
    anthropic: false,
    google: false,
    grok: false,
    eightfold: false
  });

  const [testResults, setTestResults] = useState<TestResults>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadApiKeyStatus();
  }, []);

  const loadApiKeyStatus = async () => {
    try {
      const status = await apiService.getApiKeysStatus();
      setApiKeyStatus(status);
    } catch (error) {
      console.error('Failed to load API key status:', error);
    }
  };

  const handleInputChange = (provider: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: value
    }));
  };

  const saveApiKeys = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      // Only send non-empty keys
      const keysToUpdate = Object.entries(apiKeys).reduce((acc, [key, value]) => {
        if (value.trim()) {
          acc[key] = value.trim();
        }
        return acc;
      }, {} as any);

      await apiService.updateApiKeys(keysToUpdate);
      await loadApiKeyStatus();

      setMessage('API keys updated successfully!');

      // Clear form after successful save
      setApiKeys({
        openai: '',
        anthropic: '',
        google: '',
        grok: ''
      });
    } catch (error) {
      setMessage(`Failed to save API keys: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testApiKeys = async () => {
    setIsTesting(true);
    setMessage('');

    try {
      const results = await apiService.testApiKeys();
      setTestResults(results);
      setMessage('API key testing completed. Check results below.');
    } catch (error) {
      setMessage(`Failed to test API keys: ${error}`);
    } finally {
      setIsTesting(false);
    }
  };

  const getProviderStatus = (provider: string) => {
    const isConfigured = apiKeyStatus[provider as keyof ApiKeyStatus];
    const testResult = testResults[provider];

    if (testResult) {
      return testResult.status === 'valid' ? 'valid' : 'invalid';
    }

    return isConfigured ? 'configured' : 'not-configured';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'text-green-600';
      case 'invalid': return 'text-red-600';
      case 'configured': return 'text-blue-600';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'valid': return '✓ Valid';
      case 'invalid': return '✗ Invalid';
      case 'configured': return '● Configured';
      default: return '○ Not configured';
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 mb-4">
          <span className="text-3xl">⚙️</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-4">
          LLM Configuration
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Configure your AI provider API keys to enable skills proficiency assessment
        </p>
      </div>

      {/* Configuration Form */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">API Key Configuration</h2>

        <div className="grid grid-cols-1 gap-6">
          {/* OpenAI */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              OpenAI API Key
              <span className={`ml-2 text-xs ${getStatusColor(getProviderStatus('openai'))}`}>
                {getStatusText(getProviderStatus('openai'))}
              </span>
            </label>
            <input
              type="password"
              value={apiKeys.openai}
              onChange={(e) => handleInputChange('openai', e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-eightfold-teal-300 focus:border-transparent"
            />
            {testResults.openai && (
              <div className="mt-2 text-sm">
                {testResults.openai.status === 'valid' ? (
                  <span className="text-green-600">✓ {testResults.openai.message}</span>
                ) : testResults.openai.configured ? (
                  <span className="text-red-600">✗ {testResults.openai.error}</span>
                ) : (
                  <span className="text-gray-500">Not configured</span>
                )}
              </div>
            )}
          </div>

          {/* Anthropic */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Anthropic API Key
              <span className={`ml-2 text-xs ${getStatusColor(getProviderStatus('anthropic'))}`}>
                {getStatusText(getProviderStatus('anthropic'))}
              </span>
            </label>
            <input
              type="password"
              value={apiKeys.anthropic}
              onChange={(e) => handleInputChange('anthropic', e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-eightfold-teal-300 focus:border-transparent"
            />
            {testResults.anthropic && (
              <div className="mt-2 text-sm">
                {testResults.anthropic.status === 'valid' ? (
                  <span className="text-green-600">✓ {testResults.anthropic.message}</span>
                ) : testResults.anthropic.configured ? (
                  <span className="text-red-600">✗ {testResults.anthropic.error}</span>
                ) : (
                  <span className="text-gray-500">Not configured</span>
                )}
              </div>
            )}
          </div>

          {/* Google */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Google AI API Key
              <span className={`ml-2 text-xs ${getStatusColor(getProviderStatus('google'))}`}>
                {getStatusText(getProviderStatus('google'))}
              </span>
            </label>
            <input
              type="password"
              value={apiKeys.google}
              onChange={(e) => handleInputChange('google', e.target.value)}
              placeholder="AIza..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-eightfold-teal-300 focus:border-transparent"
            />
            {testResults.google && (
              <div className="mt-2 text-sm">
                {testResults.google.status === 'valid' ? (
                  <span className="text-green-600">✓ {testResults.google.message}</span>
                ) : testResults.google.configured ? (
                  <span className="text-red-600">✗ {testResults.google.error}</span>
                ) : (
                  <span className="text-gray-500">Not configured</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={saveApiKeys}
            disabled={isLoading}
            className="px-6 py-3 bg-eightfold-teal-300 hover:bg-eightfold-teal-400 text-eightfold-navy-600 font-semibold rounded-pill transition-all hover:-translate-y-0.5 shadow-eightfold-teal disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save API Keys'}
          </button>

          <button
            onClick={testApiKeys}
            disabled={isTesting}
            className="px-6 py-3 bg-white border border-eightfold-teal-300 text-eightfold-teal-400 font-semibold rounded-pill transition-all hover:bg-eightfold-teal-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? 'Testing...' : 'Test API Keys'}
          </button>
        </div>

        {message && (
          <div className={`mt-4 p-4 rounded-lg ${
            message.includes('success') || message.includes('completed')
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Current Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Current Configuration Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">OpenAI</span>
            <span className={getStatusColor(getProviderStatus('openai'))}>
              {getStatusText(getProviderStatus('openai'))}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Anthropic</span>
            <span className={getStatusColor(getProviderStatus('anthropic'))}>
              {getStatusText(getProviderStatus('anthropic'))}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Google AI</span>
            <span className={getStatusColor(getProviderStatus('google'))}>
              {getStatusText(getProviderStatus('google'))}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Eightfold</span>
            <span className={getStatusColor(apiKeyStatus.eightfold ? 'configured' : 'not-configured')}>
              {getStatusText(apiKeyStatus.eightfold ? 'configured' : 'not-configured')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LLMConfiguration;