/**
 * Advanced Skills Extraction Component
 * Enhanced with SnapMap-style features and AI analysis
 */

import React, { useState, useEffect } from 'react';
import {
  Brain,
  CheckCircle,
  AlertTriangle,
  FileSearch,
  Sparkles,
  Download,
  Upload,
  RefreshCw,
  Target,
  TrendingUp,
  Users
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import ResumeUpload from './ResumeUpload';

interface Skill {
  name: string;
  category: string;
  confidence: number;
  source: 'jie_role' | 'resume' | 'manual';
  description?: string;
}

interface SkillsExtractionAdvancedProps {
  onSkillsExtracted?: (skills: Skill[]) => void;
}

export const SkillsExtractionAdvanced: React.FC<SkillsExtractionAdvancedProps> = ({ onSkillsExtracted }) => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedSource, setSelectedSource] = useState<'jie_role' | 'resume' | 'both'>('both');
  const [jieRoleId, setJieRoleId] = useState('');
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [uploadedResume, setUploadedResume] = useState<File | null>(null);

  // Mock JIE roles data
  const mockJieRoles = [
    { id: 'se-001', title: 'Senior Software Engineer', department: 'Engineering' },
    { id: 'ds-001', title: 'Data Scientist', department: 'Analytics' },
    { id: 'pm-001', title: 'Product Manager', department: 'Product' },
    { id: 'ux-001', title: 'UX Designer', department: 'Design' },
  ];

  const handleJieRoleExtraction = async () => {
    if (!jieRoleId) return;

    setIsAnalyzing(true);
    try {
      // Simulate API call to extract skills from JIE role
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockJieSkills: Skill[] = [
        { name: 'React', category: 'Frontend Frameworks', confidence: 0.95, source: 'jie_role' },
        { name: 'TypeScript', category: 'Programming Languages', confidence: 0.90, source: 'jie_role' },
        { name: 'Node.js', category: 'Backend Technologies', confidence: 0.85, source: 'jie_role' },
        { name: 'System Design', category: 'Architecture', confidence: 0.80, source: 'jie_role' },
        { name: 'Agile Methodologies', category: 'Process Management', confidence: 0.75, source: 'jie_role' },
      ];

      setSkills(prevSkills => {
        const newSkills = [...prevSkills.filter(s => s.source !== 'jie_role'), ...mockJieSkills];
        if (onSkillsExtracted) onSkillsExtracted(newSkills);
        return newSkills;
      });

    } finally {
      setIsAnalyzing(false);
      setAnalysisComplete(true);
    }
  };

  const handleResumeUploaded = (file: File, extractedSkills: string[]) => {
    setUploadedResume(file);

    const resumeSkills: Skill[] = extractedSkills.map(skillName => ({
      name: skillName,
      category: 'Technical Skills', // Would be determined by AI
      confidence: 0.85,
      source: 'resume' as const
    }));

    setSkills(prevSkills => {
      const newSkills = [...prevSkills.filter(s => s.source !== 'resume'), ...resumeSkills];
      if (onSkillsExtracted) onSkillsExtracted(newSkills);
      return newSkills;
    });
    setAnalysisComplete(true);
  };

  const handleAnalyzeAll = async () => {
    setIsAnalyzing(true);
    try {
      // Simulate comprehensive analysis
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Add analysis confidence scores and suggestions
      const analyzedSkills = skills.map(skill => ({
        ...skill,
        confidence: Math.min(skill.confidence + 0.1, 1.0)
      }));

      setSkills(analyzedSkills);
      if (onSkillsExtracted) onSkillsExtracted(analyzedSkills);

    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSkillsBySource = (source: string) => {
    return skills.filter(skill => skill.source === source);
  };

  const getSkillsByCategory = () => {
    const categories: Record<string, Skill[]> = {};
    skills.forEach(skill => {
      if (!categories[skill.category]) {
        categories[skill.category] = [];
      }
      categories[skill.category].push(skill);
    });
    return categories;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-100';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 mb-4">
          <Brain className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          AI-Powered Skills Extraction
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Extract skills from JIE role descriptions and candidate resumes using advanced AI analysis
        </p>
      </div>

      {/* Source Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Skills Source Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <input
                type="radio"
                name="source"
                value="jie_role"
                checked={selectedSource === 'jie_role'}
                onChange={(e) => setSelectedSource(e.target.value as any)}
                className="w-4 h-4 text-primary-600"
              />
              <div className="ml-3">
                <p className="font-medium text-gray-900 dark:text-white">JIE Role Only</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Extract from job description</p>
              </div>
            </label>

            <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <input
                type="radio"
                name="source"
                value="resume"
                checked={selectedSource === 'resume'}
                onChange={(e) => setSelectedSource(e.target.value as any)}
                className="w-4 h-4 text-primary-600"
              />
              <div className="ml-3">
                <p className="font-medium text-gray-900 dark:text-white">Resume Only</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Extract from resume</p>
              </div>
            </label>

            <label className="flex items-center p-4 border-2 border-primary-300 bg-primary-50 dark:bg-primary-900/20 rounded-lg cursor-pointer">
              <input
                type="radio"
                name="source"
                value="both"
                checked={selectedSource === 'both'}
                onChange={(e) => setSelectedSource(e.target.value as any)}
                className="w-4 h-4 text-primary-600"
              />
              <div className="ml-3">
                <p className="font-medium text-gray-900 dark:text-white">Both Sources</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Comprehensive analysis</p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* JIE Role Selection */}
      {(selectedSource === 'jie_role' || selectedSource === 'both') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              JIE Role Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Select JIE Role
                </label>
                <select
                  value={jieRoleId}
                  onChange={(e) => setJieRoleId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select a role...</option>
                  {mockJieRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.title} - {role.department}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleJieRoleExtraction}
                disabled={!jieRoleId || isAnalyzing}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-all hover:-translate-y-0.5 shadow-lg flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Extracting Skills...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    Extract from JIE Role
                  </>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resume Upload */}
      {(selectedSource === 'resume' || selectedSource === 'both') && (
        <ResumeUpload onFileUploaded={handleResumeUploaded} />
      )}

      {/* Skills Analysis Results */}
      {skills.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Extracted Skills Analysis ({skills.length} skills)
              </CardTitle>
              <button
                onClick={handleAnalyzeAll}
                disabled={isAnalyzing}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Enhance Analysis
                  </>
                )}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">From JIE Role</span>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {getSkillsBySource('jie_role').length}
                </p>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileSearch className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">From Resume</span>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {getSkillsBySource('resume').length}
                </p>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Confidence</span>
                </div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {Math.round((skills.reduce((acc, skill) => acc + skill.confidence, 0) / skills.length) * 100)}%
                </p>
              </div>
            </div>

            {/* Skills by Category */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Skills by Category</h4>
              {Object.entries(getSkillsByCategory()).map(([category, categorySkills]) => (
                <div key={category} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-3">{category}</h5>
                  <div className="flex flex-wrap gap-2">
                    {categorySkills.map((skill, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm"
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {skill.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getConfidenceColor(skill.confidence)}`}>
                          {Math.round(skill.confidence * 100)}%
                        </span>
                        <span className={`w-2 h-2 rounded-full ${
                          skill.source === 'jie_role' ? 'bg-blue-500' : 'bg-green-500'
                        }`} title={skill.source} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {analysisComplete && skills.length > 0 && (
        <div className="flex justify-center gap-4">
          <button className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg transition-all hover:-translate-y-0.5 shadow-lg flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Skills List
          </button>
          <button className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-all hover:-translate-y-0.5 shadow-lg flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Proceed to Assessment
          </button>
        </div>
      )}
    </div>
  );
};

export default SkillsExtractionAdvanced;