/**
 * LLM Configuration Component
 * Configure LLM providers and assessment parameters
 */
import React, { useState } from 'react';
import { Cog6ToothIcon, KeyIcon } from '@heroicons/react/24/outline';

const LLMConfiguration: React.FC = () => {
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    google: '',
    grok: '',
  });

  const [selectedProviders, setSelectedProviders] = useState<string[]>(['openai']);

  const providers = [
    { id: 'openai', name: 'OpenAI', description: 'GPT-3.5, GPT-4 models' },
    { id: 'anthropic', name: 'Anthropic', description: 'Claude models' },
    { id: 'google', name: 'Google', description: 'Gemini models' },
    { id: 'grok', name: 'Grok', description: 'xAI models' },
  ];

  const toggleProvider = (providerId: string) => {
    if (selectedProviders.includes(providerId)) {
      setSelectedProviders(selectedProviders.filter(p => p !== providerId));
    } else {
      setSelectedProviders([...selectedProviders, providerId]);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center mb-8">
        <Cog6ToothIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            LLM Provider Configuration
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Configure your LLM providers and assessment parameters
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Provider Selection */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            LLM Providers
          </h3>
          <div className="space-y-3">
            {providers.map((provider) => (
              <label key={provider.id} className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedProviders.includes(provider.id)}
                  onChange={() => toggleProvider(provider.id)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {provider.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {provider.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <KeyIcon className="h-5 w-5 mr-2" />
            API Keys
          </h3>
          <div className="space-y-4">
            {providers.filter(p => selectedProviders.includes(p.id)).map((provider) => (
              <div key={provider.id}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {provider.name} API Key
                </label>
                <input
                  type="password"
                  value={apiKeys[provider.id as keyof typeof apiKeys]}
                  onChange={(e) => setApiKeys({ ...apiKeys, [provider.id]: e.target.value })}
                  className="input-field"
                  placeholder={`Enter ${provider.name} API key`}
                />
              </div>
            ))}
          </div>
          <button className="w-full btn-primary mt-4">
            Test API Keys
          </button>
        </div>
      </div>

      {/* Assessment Parameters */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Assessment Parameters
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Batch Size
            </label>
            <input type="number" defaultValue={100} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Concurrent Batches
            </label>
            <input type="number" defaultValue={3} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Temperature
            </label>
            <input type="number" step="0.1" defaultValue={0.7} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Tokens
            </label>
            <input type="number" defaultValue={1000} className="input-field" />
          </div>
        </div>
      </div>

      {/* Assessment Methods */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          Assessment Methods
        </h4>
        <div className="grid md:grid-cols-3 gap-4">
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" defaultChecked />
            <span className="text-sm text-blue-700 dark:text-blue-300">Direct LLM Assessment</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" defaultChecked />
            <span className="text-sm text-blue-700 dark:text-blue-300">RAG-Enhanced Assessment</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            <span className="text-sm text-blue-700 dark:text-blue-300">Python-Based Matching</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default LLMConfiguration;