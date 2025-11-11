/**
 * TypeScript type definitions for SkillsProfGen
 */

export interface Environment {
  id: string;
  name: string;
  url: string;
  description: string;
}

export interface Credentials {
  username: string;
  password: string;
}

export interface LLMProvider {
  id: string;
  name: string;
  description: string;
}

export interface LLMConfiguration {
  providers: string[];
  apiKeys: Record<string, string>;
  parameters: {
    batchSize: number;
    concurrentBatches: number;
    temperature: number;
    maxTokens: number;
  };
}

export interface Skill {
  name: string;
  category?: string;
  description?: string;
}

export interface AssessmentMethod {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface AssessmentConfig {
  skills: Skill[];
  resumes: File[];
  llmConfig: LLMConfiguration;
  methods: AssessmentMethod[];
}

export interface AssessmentResult {
  skill: Skill;
  proficiency: number;
  level: 'Novice' | 'Developing' | 'Intermediate' | 'Advanced' | 'Expert';
  confidence_score: number;
  reasoning: string;
  evidence: string[];
  method: string;
}

export interface AssessmentSummary {
  total_skills: number;
  avg_proficiency: number;
  completion_time: string;
  high_level_skills: number;
}

export interface Assessment {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  current_stage: string;
  results: AssessmentResult[];
  summary: AssessmentSummary;
  created_at: string;
  completed_at?: string;
}

export interface ApiResponse<T = any> {
  status: string;
  message?: string;
  data?: T;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}