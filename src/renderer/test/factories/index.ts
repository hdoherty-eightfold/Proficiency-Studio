/**
 * Test Data Factories
 *
 * Provides factory functions to create test data for various types.
 * Use these to generate consistent mock data across tests.
 */

import type {
  Skill,
  AssessmentResult,
  AssessmentSummary,
  Environment,
  ProficiencyLevel,
  ConfigurationItem,
  SFTPCredential,
  Role,
  TopSkill,
  ModelPerformance,
} from '../../types/api';

// Counter for unique IDs
let idCounter = 0;
const uniqueId = (prefix = 'id') => `${prefix}_${++idCounter}`;

// Reset counter between test runs
export const resetFactoryIds = () => {
  idCounter = 0;
};

// ==========================================
// Skill Factories
// ==========================================

export const createSkill = (overrides: Partial<Skill> = {}): Skill => ({
  id: uniqueId('skill'),
  name: 'TypeScript',
  description: 'A typed superset of JavaScript',
  category: 'Programming Languages',
  source: 'csv',
  ...overrides,
});

export const createSkills = (count: number, overrides: Partial<Skill> = {}): Skill[] =>
  Array.from({ length: count }, (_, i) =>
    createSkill({
      name: `Skill ${i + 1}`,
      ...overrides,
    })
  );

// ==========================================
// Assessment Factories
// ==========================================

export const createAssessmentResult = (overrides: Partial<AssessmentResult> = {}): AssessmentResult => ({
  skill_name: 'TypeScript',
  proficiency: 3,
  proficiency_level: 3,
  proficiency_numeric: 3,
  proficiency_label: 'Intermediate',
  confidence_score: 0.85,
  reasoning: 'Demonstrated solid understanding of TypeScript fundamentals.',
  evidence: ['Strong type usage', 'Interface definitions'],
  category: 'Programming',
  ...overrides,
});

export const createAssessmentSummary = (overrides: Partial<AssessmentSummary> = {}): AssessmentSummary => ({
  id: uniqueId('assessment'),
  environment: 'Production',
  provider: 'google',
  model: 'gemini-3.1-flash-lite-preview',
  created_at: new Date().toISOString(),
  total_skills: 10,
  average_confidence: 0.82,
  processing_time_seconds: 45.5,
  ...overrides,
});

export const createAssessmentSummaries = (count: number): AssessmentSummary[] =>
  Array.from({ length: count }, (_, i) =>
    createAssessmentSummary({
      environment: `Environment ${i + 1}`,
      total_skills: 10 + i * 5,
    })
  );

// ==========================================
// Environment Factories
// ==========================================

export const createEnvironment = (overrides: Partial<Environment> = {}): Environment => ({
  id: uniqueId('env'),
  name: 'Production',
  description: 'Production environment',
  base_url: 'https://api.example.com',
  username: 'admin',
  is_default: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createEnvironments = (count: number): Environment[] =>
  Array.from({ length: count }, (_, i) =>
    createEnvironment({
      name: `Environment ${i + 1}`,
      is_default: i === 0,
    })
  );

// ==========================================
// Configuration Factories
// ==========================================

export const createProficiencyLevel = (level: number, overrides: Partial<ProficiencyLevel> = {}): ProficiencyLevel => {
  const labels = ['Novice', 'Developing', 'Intermediate', 'Advanced', 'Expert'];
  const colors = ['#9ca3af', '#3b82f6', '#eab308', '#22c55e', '#a855f7'];
  return {
    level,
    name: labels[level - 1] || 'Unknown',
    description: `${labels[level - 1] || 'Unknown'} level proficiency`,
    color: colors[level - 1] || '#666666',
    ...overrides,
  };
};

export const createProficiencyLevels = (): ProficiencyLevel[] =>
  [1, 2, 3, 4, 5].map(level => createProficiencyLevel(level));

export const createConfiguration = (overrides: Partial<ConfigurationItem> = {}): ConfigurationItem => ({
  id: uniqueId('config'),
  name: 'Default Configuration',
  description: 'Standard proficiency assessment configuration',
  tags: ['default', 'standard'],
  author: 'system',
  proficiency_levels: createProficiencyLevels(),
  llm_config: {
    provider: 'google',
    model: 'gemini-3.1-flash-lite-preview',
    temperature: 0.7,
    max_tokens: 2000,
  },
  prompt_template: 'Assess the proficiency level for skill: {{skill_name}}',
  is_default: true,
  is_public: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// ==========================================
// SFTP Factories
// ==========================================

export const createSFTPCredential = (overrides: Partial<SFTPCredential> = {}): SFTPCredential => ({
  id: uniqueId('sftp'),
  name: 'Production SFTP',
  host: 'sftp.example.com',
  port: 22,
  username: 'sftp_user',
  default_path: '/uploads',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// ==========================================
// Role Factories
// ==========================================

export const createRole = (overrides: Partial<Role> = {}): Role => ({
  id: uniqueId('role'),
  name: 'Senior Developer',
  description: 'Senior software developer role',
  environment_id: uniqueId('env'),
  proficiencies: [
    { skill_id: 'skill_1', skill_name: 'TypeScript', required_level: 4 },
    { skill_id: 'skill_2', skill_name: 'React', required_level: 4 },
    { skill_id: 'skill_3', skill_name: 'Node.js', required_level: 3 },
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// ==========================================
// Analytics Factories
// ==========================================

export const createTopSkill = (overrides: Partial<TopSkill> = {}): TopSkill => ({
  name: 'TypeScript',
  skill: 'TypeScript',
  category: 'Programming',
  assessment_count: 150,
  assessments: 150,
  avg_proficiency: 3.5,
  avg_confidence: 0.85,
  ...overrides,
});

export const createModelPerformance = (overrides: Partial<ModelPerformance> = {}): ModelPerformance => ({
  provider: 'google',
  model: 'gemini-3.1-flash-lite-preview',
  total_assessments: 500,
  assessments: 500,
  avg_confidence: 0.87,
  avg_processing_time: 2.5,
  avg_latency_ms: 2500,
  accuracy_score: 0.92,
  ...overrides,
});

// ==========================================
// API Response Factories
// ==========================================

export const createSuccessResponse = <T>(data: T) => ({
  status: 'success' as const,
  ...data,
});

export const createErrorResponse = (message: string, details?: string) => ({
  status: 'error' as const,
  message,
  details,
});

// ==========================================
// File/CSV Factories
// ==========================================

export const createCSVData = (rows: number, columns: string[] = ['id', 'name', 'email', 'department']): Record<string, unknown>[] =>
  Array.from({ length: rows }, (_, i) => {
    const row: Record<string, unknown> = {};
    columns.forEach((col, _j) => {
      if (col === 'id') row[col] = i + 1;
      else if (col === 'email') row[col] = `user${i + 1}@example.com`;
      else row[col] = `${col}_value_${i + 1}`;
    });
    return row;
  });

export const createFilePreviewData = (rows = 10, columns = ['id', 'name', 'email']) => ({
  status: 'success' as const,
  file_id: uniqueId('file'),
  data: createCSVData(rows, columns),
  columns,
  total_rows: rows,
  sample_size: rows,
});
