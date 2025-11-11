/**
 * Welcome Component
 * Introduction and overview of SkillsProfGen
 */
import React from 'react';
import { AcademicCapIcon, CpuChipIcon, CloudIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const Welcome: React.FC = () => {
  const features = [
    {
      icon: AcademicCapIcon,
      title: 'AI-Powered Assessment',
      description: 'Advanced LLM integration with Claude agents for intelligent skills evaluation',
    },
    {
      icon: CpuChipIcon,
      title: 'RAG Pipeline',
      description: 'PyTorch-based vector similarity search with optimized embeddings for context-aware assessment',
    },
    {
      icon: CloudIcon,
      title: 'Eightfold Integration',
      description: 'Direct API integration with OAuth authentication and multi-environment support',
    },
    {
      icon: ChartBarIcon,
      title: 'Comprehensive Analysis',
      description: 'Multi-method comparison with detailed proficiency levels and confidence scoring',
    },
  ];

  const workflow = [
    'Configure Environment & Authentication',
    'Extract Skills from JIE Roles or Upload Lists',
    'Upload Candidate Resumes',
    'Configure LLM Providers & Parameters',
    'Execute Multi-Method Assessment',
    'Analyze Results & Export Reports',
  ];

  return (
    <div className="p-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-primary-100 dark:bg-primary-900/30 rounded-full">
            <AcademicCapIcon className="h-16 w-16 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Skills Proficiency Generator
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          AI-powered skills proficiency assessment system that combines RAG pipeline technology with Claude agents
          for intelligent orchestration and comprehensive Eightfold API integration.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {features.map((feature, index) => (
          <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-full">
                <feature.icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {feature.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* Workflow Steps */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          Assessment Workflow
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflow.map((step, index) => (
            <div key={index} className="flex items-center bg-white dark:bg-gray-700 rounded-lg p-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                {index + 1}
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {step}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Capabilities */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          Key Capabilities
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Assessment Methods
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li>• Direct LLM Assessment</li>
              <li>• RAG-Enhanced Analysis</li>
              <li>• Python-Based Matching</li>
              <li>• Comparative Evaluation</li>
            </ul>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              LLM Providers
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li>• OpenAI GPT Models</li>
              <li>• Anthropic Claude</li>
              <li>• Google Gemini</li>
              <li>• Grok & Other Providers</li>
            </ul>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Proficiency Levels
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li>• Novice (1) - Basic understanding</li>
              <li>• Developing (2) - Growing competence</li>
              <li>• Intermediate (3) - Solid proficiency</li>
              <li>• Advanced (4) - High competence</li>
              <li>• Expert (5) - Deep expertise</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Get Started */}
      <div className="mt-12 text-center">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Ready to begin your skills assessment journey?
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-500">
          Use the navigation arrows or sidebar to proceed to Step 1: Authentication & Environment Setup
        </div>
      </div>
    </div>
  );
};

export default Welcome;