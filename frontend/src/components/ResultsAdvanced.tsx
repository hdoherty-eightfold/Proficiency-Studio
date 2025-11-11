/**
 * Advanced Results Component
 * Beautiful visualization of assessment results with SnapMap-style polish
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Share2,
  Filter,
  Eye,
  Award,
  Target,
  Users,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Star
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';

interface AssessmentResult {
  skill_name: string;
  proficiency_level: string;
  proficiency: number;
  confidence_score: number;
  reasoning: string;
  category?: string;
  evidence?: string[];
}

interface AssessmentMetadata {
  provider: string;
  model: string;
  total_skills: number;
  processing_time: number;
  batch_info?: {
    total_batches: number;
    successful_batches: number;
    batch_size: number;
  };
}

export const ResultsAdvanced: React.FC = () => {
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [metadata, setMetadata] = useState<AssessmentMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterProficiency, setFilterProficiency] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'proficiency' | 'confidence'>('proficiency');

  // Mock data for demonstration
  useEffect(() => {
    const mockResults: AssessmentResult[] = [
      {
        skill_name: 'React',
        proficiency_level: 'Advanced',
        proficiency: 4,
        confidence_score: 0.92,
        reasoning: 'Strong understanding of component lifecycle, hooks, and state management',
        category: 'Frontend Frameworks',
        evidence: ['Complex component architecture', 'Custom hooks implementation']
      },
      {
        skill_name: 'TypeScript',
        proficiency_level: 'Advanced',
        proficiency: 4,
        confidence_score: 0.88,
        reasoning: 'Excellent type system knowledge and advanced patterns',
        category: 'Programming Languages'
      },
      {
        skill_name: 'Python',
        proficiency_level: 'Expert',
        proficiency: 5,
        confidence_score: 0.95,
        reasoning: 'Deep expertise in language features, frameworks, and optimization',
        category: 'Programming Languages'
      },
      {
        skill_name: 'Machine Learning',
        proficiency_level: 'Intermediate',
        proficiency: 3,
        confidence_score: 0.78,
        reasoning: 'Solid foundation in ML concepts and practical implementation',
        category: 'AI/ML'
      },
      {
        skill_name: 'Project Management',
        proficiency_level: 'Advanced',
        proficiency: 4,
        confidence_score: 0.85,
        reasoning: 'Proven track record in leading cross-functional teams',
        category: 'Soft Skills'
      },
      {
        skill_name: 'Docker',
        proficiency_level: 'Intermediate',
        proficiency: 3,
        confidence_score: 0.82,
        reasoning: 'Good understanding of containerization and deployment',
        category: 'DevOps'
      }
    ];

    const mockMetadata: AssessmentMetadata = {
      provider: 'openai',
      model: 'gpt-4',
      total_skills: 6,
      processing_time: 45.2,
      batch_info: {
        total_batches: 1,
        successful_batches: 1,
        batch_size: 50
      }
    };

    setTimeout(() => {
      setResults(mockResults);
      setMetadata(mockMetadata);
      setLoading(false);
    }, 1000);
  }, []);

  const getProficiencyColor = (level: string) => {
    const colors = {
      'Expert': 'bg-purple-100 text-purple-800 border-purple-200',
      'Advanced': 'bg-blue-100 text-blue-800 border-blue-200',
      'Intermediate': 'bg-green-100 text-green-800 border-green-200',
      'Developing': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Novice': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getProficiencyIcon = (level: string) => {
    const icons = {
      'Expert': <Star className="w-4 h-4" />,
      'Advanced': <Award className="w-4 h-4" />,
      'Intermediate': <Target className="w-4 h-4" />,
      'Developing': <TrendingUp className="w-4 h-4" />,
      'Novice': <CheckCircle className="w-4 h-4" />
    };
    return icons[level as keyof typeof icons] || <CheckCircle className="w-4 h-4" />;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getFilteredAndSortedResults = () => {
    let filtered = results.filter(result => {
      const categoryMatch = filterCategory === 'all' || result.category === filterCategory;
      const proficiencyMatch = filterProficiency === 'all' || result.proficiency_level === filterProficiency;
      return categoryMatch && proficiencyMatch;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.skill_name.localeCompare(b.skill_name);
        case 'proficiency':
          return b.proficiency - a.proficiency;
        case 'confidence':
          return b.confidence_score - a.confidence_score;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getSkillsByCategory = () => {
    const categorized: Record<string, AssessmentResult[]> = {};
    results.forEach(result => {
      const category = result.category || 'Other';
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(result);
    });
    return categorized;
  };

  const getProficiencyDistribution = () => {
    const distribution: Record<string, number> = {
      'Expert': 0,
      'Advanced': 0,
      'Intermediate': 0,
      'Developing': 0,
      'Novice': 0
    };

    results.forEach(result => {
      distribution[result.proficiency_level]++;
    });

    return Object.entries(distribution).map(([level, count]) => ({
      level,
      count,
      percentage: results.length > 0 ? Math.round((count / results.length) * 100) : 0
    }));
  };

  const getAverageConfidence = () => {
    if (results.length === 0) return 0;
    const total = results.reduce((acc, result) => acc + result.confidence_score, 0);
    return Math.round((total / results.length) * 100);
  };

  const getTopSkills = () => {
    return results
      .sort((a, b) => b.proficiency - a.proficiency || b.confidence_score - a.confidence_score)
      .slice(0, 5);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 mb-4">
            <BarChart3 className="w-10 h-10 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Loading Results...
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Processing assessment data and generating insights
          </p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
          <AlertCircle className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          No Results Available
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-6">
          Complete a skills assessment to view detailed results and insights
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 mb-4">
          <BarChart3 className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Assessment Results
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Comprehensive analysis of skills proficiency with AI-powered insights and recommendations
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="text-center">
          <CardContent className="p-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-3">
              <Target className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{results.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Skills Assessed</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{getAverageConfidence()}%</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg Confidence</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-3">
              <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {results.filter(r => r.proficiency >= 4).length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Advanced+ Skills</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-3">
              <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{metadata?.processing_time}s</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Processing Time</p>
          </CardContent>
        </Card>
      </div>

      {/* Proficiency Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Proficiency Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {getProficiencyDistribution().map(({ level, count, percentage }) => (
              <div key={level} className="text-center">
                <div className={`p-4 rounded-lg border-2 ${getProficiencyColor(level)} mb-2`}>
                  <div className="flex items-center justify-center mb-2">
                    {getProficiencyIcon(level)}
                  </div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm">{percentage}%</p>
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{level}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Top Performing Skills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getTopSkills().map((skill, index) => (
              <div key={skill.skill_name} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">{skill.skill_name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{skill.category}</p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getProficiencyColor(skill.proficiency_level)}`}>
                    {skill.proficiency_level}
                  </span>
                  <p className={`text-sm mt-1 ${getConfidenceColor(skill.confidence_score)}`}>
                    {Math.round(skill.confidence_score * 100)}% confident
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Detailed Results
            </CardTitle>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-all flex items-center gap-2">
                <Eye className="w-4 h-4" />
                View Report
              </button>
              <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </button>
              <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Categories</option>
                {Array.from(new Set(results.map(r => r.category))).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Proficiency Level
              </label>
              <select
                value={filterProficiency}
                onChange={(e) => setFilterProficiency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Levels</option>
                <option value="Expert">Expert</option>
                <option value="Advanced">Advanced</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Developing">Developing</option>
                <option value="Novice">Novice</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="proficiency">Proficiency Level</option>
                <option value="confidence">Confidence Score</option>
                <option value="name">Skill Name</option>
              </select>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getFilteredAndSortedResults().map((result) => (
              <div key={result.skill_name} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{result.skill_name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{result.category}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getProficiencyColor(result.proficiency_level)}`}>
                    {result.proficiency_level}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Confidence</span>
                    <span className={`font-medium ${getConfidenceColor(result.confidence_score)}`}>
                      {Math.round(result.confidence_score * 100)}%
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${result.confidence_score * 100}%` }}
                    />
                  </div>

                  {result.reasoning && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {result.reasoning}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assessment Metadata */}
      {metadata && (
        <Card>
          <CardHeader>
            <CardTitle>Assessment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">AI Provider</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">{metadata.provider}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Model</p>
                <p className="font-medium text-gray-900 dark:text-white">{metadata.model}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Processing Time</p>
                <p className="font-medium text-gray-900 dark:text-white">{metadata.processing_time} seconds</p>
              </div>
              {metadata.batch_info && (
                <>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Batches</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {metadata.batch_info.successful_batches}/{metadata.batch_info.total_batches}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Batch Size</p>
                    <p className="font-medium text-gray-900 dark:text-white">{metadata.batch_info.batch_size}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ResultsAdvanced;