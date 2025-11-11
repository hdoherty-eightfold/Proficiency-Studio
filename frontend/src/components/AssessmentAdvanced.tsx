/**
 * Advanced Assessment Component
 * Combines SnapMap UI polish with SkillsProfGen backend functionality
 */

import React, { useState, useEffect } from 'react';
import {
  Brain,
  Settings,
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Clock,
  Target,
  Zap,
  TrendingUp,
  Download,
  Eye,
  Loader2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';

interface AssessmentConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'grok';
  model: string;
  batchSize: number;
  concurrentBatches: number;
  processingMode: 'parallel' | 'sequential';
  temperature: number;
  maxTokens: number;
}

interface Skill {
  name: string;
  category: string;
  confidence?: number;
  source?: string;
}

interface AssessmentResult {
  skill_name: string;
  proficiency_level: string;
  proficiency: number;
  confidence_score: number;
  reasoning: string;
  evidence?: string[];
}

interface BatchInfo {
  total_skills: number;
  total_batches: number;
  successful_batches: number;
  failed_batches: number;
  successful_assessments: number;
  processing_mode: string;
  batch_size: number;
  concurrent_batches: number;
}

export const AssessmentAdvanced: React.FC = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([]);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const [config, setConfig] = useState<AssessmentConfig>({
    provider: 'openai',
    model: 'gpt-4',
    batchSize: 50,
    concurrentBatches: 2,
    processingMode: 'parallel',
    temperature: 1.0,
    maxTokens: 4000
  });

  // Mock skills data for demonstration
  useEffect(() => {
    const mockSkills: Skill[] = [
      { name: 'React', category: 'Frontend Frameworks' },
      { name: 'TypeScript', category: 'Programming Languages' },
      { name: 'Python', category: 'Programming Languages' },
      { name: 'FastAPI', category: 'Backend Frameworks' },
      { name: 'Machine Learning', category: 'AI/ML' },
      { name: 'Data Analysis', category: 'Analytics' },
      { name: 'Project Management', category: 'Soft Skills' },
      { name: 'System Design', category: 'Architecture' },
      { name: 'Docker', category: 'DevOps' },
      { name: 'AWS', category: 'Cloud Platforms' },
    ];
    setSkills(mockSkills);
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAssessing && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime.getTime());
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isAssessing, startTime]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStartAssessment = async () => {
    if (skills.length === 0) {
      setError('No skills to assess. Please extract skills first.');
      return;
    }

    setIsAssessing(true);
    setError(null);
    setStartTime(new Date());
    setProgress(0);
    setCurrentBatch(0);
    setAssessmentResults([]);

    try {
      setStatusMessage('Starting assessment...');

      // Calculate batches
      const calculatedBatches = Math.ceil(skills.length / config.batchSize);
      setTotalBatches(calculatedBatches);

      const response = await fetch('http://localhost:8000/api/skills/assess-proficiencies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': 'default'
        },
        body: JSON.stringify({
          skills: skills.map(skill => ({ name: skill.name, category: skill.category })),
          provider: config.provider,
          model: config.model,
          batch_size: config.batchSize,
          concurrent_batches: config.concurrentBatches,
          processing_mode: config.processingMode,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          proficiency_levels: ['Novice', 'Developing', 'Intermediate', 'Advanced', 'Expert']
        })
      });

      if (!response.ok) {
        throw new Error(`Assessment failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setAssessmentResults(data.assessment.results);
        setBatchInfo(data.assessment.metadata);
        setProgress(100);
        setStatusMessage(`Assessment completed! Processed ${data.assessment.results.length} skills.`);
      } else {
        throw new Error(data.message || 'Assessment failed');
      }

    } catch (err: any) {
      setError(err.message || 'Assessment failed');
      setStatusMessage('Assessment failed');
    } finally {
      setIsAssessing(false);
    }
  };

  const getProviderModels = (provider: string) => {
    const models = {
      openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
      google: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-pro'],
      grok: ['grok-1', 'grok-beta']
    };
    return models[provider as keyof typeof models] || [];
  };

  const getProficiencyColor = (level: string) => {
    const colors = {
      'Expert': 'bg-purple-100 text-purple-800',
      'Advanced': 'bg-blue-100 text-blue-800',
      'Intermediate': 'bg-green-100 text-green-800',
      'Developing': 'bg-yellow-100 text-yellow-800',
      'Novice': 'bg-gray-100 text-gray-800'
    };
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getSkillsByCategory = () => {
    const resultsBySkill: Record<string, AssessmentResult> = {};
    assessmentResults.forEach(result => {
      resultsBySkill[result.skill_name] = result;
    });

    const categorized: Record<string, Array<{ skill: Skill; result?: AssessmentResult }>> = {};

    skills.forEach(skill => {
      if (!categorized[skill.category]) {
        categorized[skill.category] = [];
      }
      categorized[skill.category].push({
        skill,
        result: resultsBySkill[skill.name]
      });
    });

    return categorized;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 mb-4">
          <Brain className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Skills Proficiency Assessment
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          AI-powered skills assessment with advanced batch processing and multi-provider support
        </p>
      </div>

      {/* Assessment Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Assessment Configuration
            </CardTitle>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              {showConfig ? 'Hide' : 'Show'} Advanced
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                AI Provider
              </label>
              <select
                value={config.provider}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  provider: e.target.value as any,
                  model: getProviderModels(e.target.value)[0] || ''
                }))}
                disabled={isAssessing}
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google</option>
                <option value="grok">Grok</option>
              </select>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Model
              </label>
              <select
                value={config.model}
                onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
                disabled={isAssessing}
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-60"
              >
                {getProviderModels(config.provider).map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Advanced Configuration */}
          {showConfig && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Advanced Settings</h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Batch Size
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={config.batchSize}
                    onChange={(e) => setConfig(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 50 }))}
                    disabled={isAssessing}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Concurrent Batches
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={config.concurrentBatches}
                    onChange={(e) => setConfig(prev => ({ ...prev, concurrentBatches: parseInt(e.target.value) || 2 }))}
                    disabled={isAssessing}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Processing Mode
                  </label>
                  <select
                    value={config.processingMode}
                    onChange={(e) => setConfig(prev => ({ ...prev, processingMode: e.target.value as any }))}
                    disabled={isAssessing}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="parallel">Parallel</option>
                    <option value="sequential">Sequential</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skills Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Skills to Assess ({skills.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(skills.reduce((acc, skill) => {
              acc[skill.category] = (acc[skill.category] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)).map(([category, count]) => (
              <div key={category} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">{category}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assessment Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Assessment Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Status and Progress */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isAssessing ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                ) : assessmentResults.length > 0 ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <Play className="w-6 h-6 text-gray-400" />
                )}
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {statusMessage || 'Ready to start assessment'}
                  </p>
                  {startTime && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Elapsed: {formatTime(elapsedTime)}
                    </p>
                  )}
                </div>
              </div>

              {batchInfo && (
                <div className="text-right text-sm text-gray-600 dark:text-gray-400">
                  <p>Batches: {batchInfo.successful_batches}/{batchInfo.total_batches}</p>
                  <p>Skills: {batchInfo.successful_assessments}/{batchInfo.total_skills}</p>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {(isAssessing || assessmentResults.length > 0) && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    isAssessing ? 'bg-primary-600' : 'bg-green-600'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-100">Assessment Error</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={handleStartAssessment}
              disabled={isAssessing || skills.length === 0}
              className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all hover:-translate-y-0.5 shadow-lg flex items-center justify-center gap-2"
            >
              {isAssessing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Assessing Skills...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Start Assessment
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Results */}
      {assessmentResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Assessment Results ({assessmentResults.length} skills)
              </CardTitle>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-all flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {['Expert', 'Advanced', 'Intermediate', 'Developing', 'Novice'].map(level => {
                const count = assessmentResults.filter(r => r.proficiency_level === level).length;
                return (
                  <div key={level} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{level}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{count}</p>
                  </div>
                );
              })}
            </div>

            {/* Results by Category */}
            <div className="space-y-4">
              {Object.entries(getSkillsByCategory()).map(([category, categorySkills]) => (
                <div key={category} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{category}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categorySkills.map(({ skill, result }, index) => (
                      <div key={index} className="p-3 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900 dark:text-white">{skill.name}</span>
                          {result ? (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getProficiencyColor(result.proficiency_level)}`}>
                              {result.proficiency_level}
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                              Pending
                            </span>
                          )}
                        </div>
                        {result && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Confidence</span>
                              <span className="font-medium">{Math.round(result.confidence_score * 100)}%</span>
                            </div>
                            {result.reasoning && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                {result.reasoning}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssessmentAdvanced;