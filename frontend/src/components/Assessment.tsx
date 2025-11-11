/**
 * Assessment Component
 * Handles running the skills proficiency assessment with AI
 */

import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

interface AssessmentConfig {
  provider: string;
  model: string;
  proficiency_levels: string[];
  batch_size: number;
  concurrent_batches: number;
  processing_mode: string;
}

interface AssessmentResult {
  skill_name: string;
  proficiency_level: string;
  confidence_score: number;
  reasoning: string;
  evidence: any[];
}

const Assessment: React.FC = () => {
  const [config, setConfig] = useState<AssessmentConfig>({
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    proficiency_levels: ['Novice', 'Developing', 'Intermediate', 'Advanced', 'Expert'],
    batch_size: 50,
    concurrent_batches: 2,
    processing_mode: 'parallel'
  });

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [keyStatus, setKeyStatus] = useState<any>({});
  const [assessmentComplete, setAssessmentComplete] = useState(false);

  useEffect(() => {
    checkApiKeys();
  }, []);

  const checkApiKeys = async () => {
    try {
      const status = await apiService.getApiKeysStatus();
      setKeyStatus(status);

      if (!status.openai && !status.anthropic && !status.google) {
        setMessage('Please configure your API keys before running an assessment');
      }
    } catch (error) {
      setMessage('Failed to check API key status');
    }
  };

  const handleConfigChange = (field: keyof AssessmentConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addProficiencyLevel = () => {
    const newLevel = prompt('Enter new proficiency level:');
    if (newLevel && !config.proficiency_levels.includes(newLevel)) {
      setConfig(prev => ({
        ...prev,
        proficiency_levels: [...prev.proficiency_levels, newLevel]
      }));
    }
  };

  const removeProficiencyLevel = (level: string) => {
    if (config.proficiency_levels.length > 1) {
      setConfig(prev => ({
        ...prev,
        proficiency_levels: prev.proficiency_levels.filter(l => l !== level)
      }));
    }
  };

  const runAssessment = async () => {
    if (!keyStatus[config.provider]) {
      setMessage(`${config.provider} API key is not configured. Please set up your API keys first.`);
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setMessage('Preparing assessment...');
    setResults([]);
    setAssessmentComplete(false);

    try {
      // Get mock skills for demonstration
      const skillsResponse = await apiService.getMockSkills();
      const skills = skillsResponse.skills;

      if (!skills || skills.length === 0) {
        throw new Error('No skills available for assessment');
      }

      setMessage(`Starting assessment of ${skills.length} skills...`);
      setProgress(25);

      // Simulate assessment progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 500);

      const assessmentRequest = {
        skills,
        provider: config.provider,
        model: config.model,
        proficiency_levels: config.proficiency_levels,
        batch_size: config.batch_size,
        concurrent_batches: config.concurrent_batches,
        processing_mode: config.processing_mode
      };

      const response = await apiService.assessSkillsProficiency(assessmentRequest);

      clearInterval(progressInterval);
      setProgress(100);

      if (response.success) {
        setResults(response.assessment.results);
        setMessage(`Assessment completed successfully! Assessed ${response.assessment.skills_assessed} skills.`);
        setAssessmentComplete(true);
      } else {
        throw new Error('Assessment failed');
      }
    } catch (error) {
      setMessage(`Assessment failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getProviderModels = (provider: string) => {
    switch (provider) {
      case 'openai':
        return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];
      case 'anthropic':
        return ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'];
      case 'google':
        return ['gemini-pro', 'gemini-1.5-pro'];
      default:
        return [];
    }
  };

  const formatConfidenceScore = (score: number) => {
    return `${(score * 100).toFixed(1)}%`;
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProficiencyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'expert': return 'bg-green-100 text-green-800';
      case 'advanced': return 'bg-blue-100 text-blue-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'developing': return 'bg-orange-100 text-orange-800';
      case 'novice': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 mb-4">
          <span className="text-3xl">🚀</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-4">
          Skills Assessment
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Run AI-powered skills proficiency assessment using Claude agents and RAG pipeline
        </p>
      </div>

      {/* Configuration Section */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Assessment Configuration</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              AI Provider
            </label>
            <select
              value={config.provider}
              onChange={(e) => handleConfigChange('provider', e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-eightfold-teal-300 focus:border-transparent"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google AI</option>
            </select>
            <div className="mt-1 text-xs">
              Status: <span className={keyStatus[config.provider] ? 'text-green-600' : 'text-red-600'}>
                {keyStatus[config.provider] ? 'Configured' : 'Not configured'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Model
            </label>
            <select
              value={config.model}
              onChange={(e) => handleConfigChange('model', e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-eightfold-teal-300 focus:border-transparent"
            >
              {getProviderModels(config.provider).map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Batch Size
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={config.batch_size}
              onChange={(e) => handleConfigChange('batch_size', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-eightfold-teal-300 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Concurrent Batches
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={config.concurrent_batches}
              onChange={(e) => handleConfigChange('concurrent_batches', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-eightfold-teal-300 focus:border-transparent"
            />
          </div>
        </div>

        {/* Proficiency Levels */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-gray-900">
              Proficiency Levels
            </label>
            <button
              onClick={addProficiencyLevel}
              className="text-sm px-3 py-1 bg-eightfold-teal-300 hover:bg-eightfold-teal-400 text-eightfold-navy-600 font-semibold rounded transition-all"
            >
              Add Level
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {config.proficiency_levels.map(level => (
              <div
                key={level}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg"
              >
                <span className="text-sm font-medium">{level}</span>
                <button
                  onClick={() => removeProficiencyLevel(level)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Run Assessment */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Run Assessment</h3>

        <button
          onClick={runAssessment}
          disabled={isRunning}
          className="w-full md:w-auto px-8 py-4 text-lg bg-eightfold-teal-300 hover:bg-eightfold-teal-400 text-eightfold-navy-600 font-semibold rounded-pill transition-all hover:-translate-y-0.5 shadow-eightfold-teal disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? 'Running Assessment...' : 'Start Skills Assessment'}
        </button>

        {isRunning && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-eightfold-teal-400 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">{progress}% complete</p>
          </div>
        )}

        {message && (
          <div className={`mt-4 p-4 rounded-lg ${
            message.includes('success') || message.includes('completed')
              ? 'bg-green-50 border border-green-200 text-green-800'
              : message.includes('failed')
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Assessment Results */}
      {assessmentComplete && results.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Assessment Results</h3>

          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{result.skill_name}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-pill ${getProficiencyColor(result.proficiency_level)}`}>
                      {result.proficiency_level}
                    </span>
                    <span className={`text-sm font-medium ${getConfidenceColor(result.confidence_score)}`}>
                      {formatConfidenceScore(result.confidence_score)}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-700">{result.reasoning}</p>
              </div>
            ))}
          </div>

          {/* Summary Statistics */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Assessment Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Skills:</span>
                <span className="ml-2 font-semibold">{results.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Average Confidence:</span>
                <span className="ml-2 font-semibold">
                  {formatConfidenceScore(
                    results.reduce((sum, r) => sum + r.confidence_score, 0) / results.length
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Provider:</span>
                <span className="ml-2 font-semibold">{config.provider}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assessment;