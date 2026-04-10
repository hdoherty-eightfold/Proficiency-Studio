/**
 * Shared types for assessment components
 */

export interface AssessmentResult {
  skill_name: string;
  proficiency: number;
  proficiency_numeric: number;
  confidence_score: number;
  reasoning: string;
  evidence: string[];
  category?: string;
  years_experience?: number;
}

export interface AssessmentResponse {
  success: boolean;
  assessments: AssessmentResult[];
  total_skills: number;
  avg_proficiency: number;
  processing_time: number;
  model_used: string;
  timestamp: string;
  /** Total tokens consumed (prompt + completion) — set by backend when available */
  total_tokens?: number;
  /** Estimated USD cost for this assessment run */
  estimated_cost?: number;
  /** Number of skills that failed assessment (LLM parse errors, truncation, etc.) */
  failed_skills_count?: number;
  /** Total skills originally requested (assessed + failed) */
  requested_skills_count?: number;
}

export interface RequestResponseLog {
  request: {
    endpoint: string;
    method: string;
    payload: Record<string, unknown>;
    timestamp: string;
  };
  response?: {
    status: number;
    data: Record<string, unknown>;
    timestamp: string;
  };
  error?: {
    message: string;
    fullError?: unknown;
    details: unknown;
    timestamp: string;
  };
}

export type AssessmentPhase =
  | 'idle'
  | 'starting'
  | 'processing'
  | 'analyzing'
  | 'completed'
  | 'error';
