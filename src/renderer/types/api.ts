/**
 * API Response Types for ProfStudio-Desktop
 *
 * Provides TypeScript interfaces for all API responses to ensure type safety
 * and prevent runtime crashes from unexpected response formats.
 */

// ==========================================
// Common Types
// ==========================================

export interface ApiStatus {
  status: 'success' | 'error';
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// ==========================================
// Health Check
// ==========================================

export interface HealthCheckResponse {
  status: 'healthy' | 'ok' | 'unhealthy';
  version?: string;
  timestamp?: string;
}

// ==========================================
// Skills Types
// ==========================================

export interface Skill {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  source?: 'csv' | 'api' | 'sftp';
}

export interface SkillsExtractResponse {
  status: 'success' | 'error';
  skills: Skill[];
  total_count: number;
  file_id?: string;
  message?: string;
}

export interface SkillsListResponse {
  status: 'success' | 'error';
  skills: Skill[];
  total_count: number;
}

// ==========================================
// Proficiency Assessment Types
// ==========================================

export interface ProficiencyLevel {
  level: number;
  name: string;
  description: string;
  color?: string;
}

export interface LLMConfig {
  provider: string;
  model: string;
  temperature?: number;
  max_tokens?: number;
}

export interface AssessmentResult {
  skill_name: string;
  proficiency?: number;
  proficiency_level?: number;
  proficiency_numeric?: number;
  proficiency_label?: string;
  confidence_score: number;
  reasoning: string;
  evidence?: string[];
  category?: string;
  years_experience?: number;
}

export interface AssessmentResponse {
  status: 'success' | 'error';
  assessments: AssessmentResult[];
  total_skills: number;
  processing_time_seconds: number;
  llm_provider: string;
  llm_model: string;
  timestamp: string;
  error?: string;
}

export interface AssessmentSummary {
  id: string;
  environment: string;
  provider: string;
  model: string;
  created_at: string;
  total_skills: number;
  average_confidence: number;
  processing_time_seconds: number;
}

export interface AssessmentDetail extends AssessmentSummary {
  statistics: {
    avg_confidence: number;
    min_confidence: number;
    max_confidence: number;
    proficiency_distribution: Record<string, number>;
  };
  proficiencies: AssessmentResult[];
  metadata: Record<string, unknown>;
}

export interface AssessmentHistoryResponse {
  status: 'success' | 'error';
  assessments: AssessmentSummary[];
  total_count: number;
  message?: string;
  exports?: Array<{
    id: string;
    format: string;
    created_at: string;
    filename: string;
    size_bytes?: number;
    status: 'completed' | 'failed';
  }>;
}

export interface AssessmentDetailResponse {
  status: 'success' | 'error';
  assessment: AssessmentDetail;
  message?: string;
}

export interface AssessmentCompareResponse {
  status: 'success' | 'error';
  assessments: AssessmentSummary[];
  common_skills: Array<{
    skill: string;
    assessments: Array<{
      assessment_id: string;
      proficiency_level: number;
      confidence_score: number;
    }>;
  }>;
  message?: string;
}

// ==========================================
// Environment Types
// ==========================================

export interface Environment {
  id: string;
  name: string;
  description?: string;
  base_url: string;
  username?: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Partial environment for API responses that may have optional fields
export interface PartialEnvironment {
  id: string;
  name: string;
  description?: string;
  base_url?: string;
  username?: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EnvironmentListResponse {
  status: 'success' | 'error';
  environments: Environment[];
  message?: string;
}

export interface EnvironmentResponse {
  status: 'success' | 'error';
  environment: Environment;
  message?: string;
}

export interface EnvironmentTestResponse {
  status: 'success' | 'error';
  connected: boolean;
  latency_ms?: number;
  version?: string;
  message?: string;
}

// ==========================================
// Configuration Types
// ==========================================

export interface ConfigData {
  vector_db: {
    type: string;
    options: Array<{ id: string; name: string }>;
  };
  ai_inference: {
    provider: string;
    options: Array<{ id: string; name: string }>;
  };
  api_keys: {
    gemini_configured: boolean;
    kimi_configured: boolean;
  };
}

export interface ConfigurationItem {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  author?: string;
  proficiency_levels: ProficiencyLevel[];
  llm_config?: LLMConfig;
  prompt_template?: string;
  is_default?: boolean;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ConfigurationListResponse {
  status: 'success' | 'error';
  configurations: ConfigurationItem[];
  message?: string;
}

export interface ConfigurationResponse {
  status: 'success' | 'error';
  configuration: ConfigurationItem;
  message?: string;
  id?: string;
  config_id?: string;
}

// ==========================================
// File & Transform Types
// ==========================================

export interface FilePreviewResponse {
  status: 'success' | 'error';
  file_id: string;
  data: Record<string, unknown>[];
  transformed_data?: Record<string, unknown>[];
  columns: string[];
  total_rows: number;
  sample_size: number;
  message?: string;
}

export interface CellUpdateResponse {
  status: 'success' | 'error';
  updated_row: Record<string, unknown>;
  message?: string;
}

export interface BulkUpdateResponse {
  status: 'success' | 'error';
  updated_count: number;
  message?: string;
}

export interface DeleteRowsResponse {
  status: 'success' | 'error';
  deleted_count: number;
  remaining_rows: number;
  message?: string;
}

// ==========================================
// Review Types
// ==========================================

export interface ReviewIssue {
  field: string;
  row_index: number;
  issue_type: string;
  description: string;
  suggestion?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface FileReviewResponse {
  status: 'success' | 'error';
  file_id: string;
  issues: ReviewIssue[];
  summary: {
    total_issues: number;
    errors: number;
    warnings: number;
    info: number;
  };
  data_quality_grade: string;
  message?: string;
  result?: {
    file_id: string;
    total_rows: number;
    issues: Array<{
      row: number;
      column: string;
      issue_type: 'error' | 'warning' | 'info';
      message: string;
      suggestion?: string;
      auto_fixable: boolean;
    }>;
    summary: {
      errors: number;
      warnings: number;
      info: number;
      auto_fixable: number;
    };
    quality_score: number;
  };
}

export interface ApplyFixesResponse {
  status: 'success' | 'error';
  fixed_count: number;
  remaining_issues: number;
  message?: string;
  fixes_applied?: number;
}

// ==========================================
// SFTP Types
// ==========================================

export interface SFTPCredential {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  default_path?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SFTPCredentialsResponse {
  status: 'success' | 'error';
  credentials: SFTPCredential[];
  message?: string;
}

export interface SFTPCredentialResponse {
  status: 'success' | 'error';
  credential: SFTPCredential;
  message?: string;
}

export interface SFTPConnectionTestResponse {
  status: 'success' | 'error';
  success?: boolean;
  connected: boolean;
  latency_ms?: number;
  server_info?: string;
  message?: string;
  error?: string;
}

export interface SFTPFileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified_at: string;
}

export interface SFTPBrowseResponse {
  status: 'success' | 'error';
  path: string;
  items: SFTPFileItem[];
  files?: SFTPFileItem[];
  message?: string;
}

export interface SFTPDownloadResponse {
  status: 'success' | 'error';
  content: string;
  filename: string;
  size: number;
  message?: string;
}

// ==========================================
// Analytics Types
// ==========================================

export interface AnalyticsOverview {
  total_assessments: number;
  total_skills_assessed: number;
  avg_confidence: number;
  avg_processing_time: number;
  assessments_by_environment: Record<string, number>;
  assessments_by_provider: Record<string, number>;
}

// Flexible response that can be either nested or flat
export interface AnalyticsOverviewResponse {
  status?: 'success' | 'error';
  overview?: AnalyticsOverview;
  period?: {
    start_date: string;
    end_date: string;
  };
  message?: string;
  // Flat properties for direct access (as components use it)
  total_assessments?: number;
  total_skills?: number;
  avg_confidence?: number;
  avg_processing_time?: number;
  assessments_change?: number;
  confidence_change?: number;
}

export interface ModelPerformance {
  provider: string;
  model: string;
  total_assessments?: number;
  assessments?: number;
  avg_confidence: number;
  avg_processing_time?: number;
  avg_latency_ms?: number;
  accuracy_score?: number;
}

export interface ModelPerformanceResponse {
  status?: 'success' | 'error';
  models: ModelPerformance[];
  message?: string;
}

export interface VolumeDataPoint {
  date: string;
  count: number;
  skills_count?: number;
}

export interface VolumeDataResponse {
  status?: 'success' | 'error';
  data?: VolumeDataPoint[];
  daily?: VolumeDataPoint[];
  period?: string;
  message?: string;
}

export interface TopSkill {
  name?: string;
  skill?: string;
  category?: string;
  assessment_count?: number;
  assessments?: number;
  avg_proficiency: number;
  avg_confidence?: number;
}

export interface TopSkillsResponse {
  status?: 'success' | 'error';
  skills: TopSkill[];
  message?: string;
}

// ==========================================
// Mapping Types
// ==========================================

export interface FieldMapping {
  source_field: string;
  target_field: string | null;
  confidence: number;
  confidence_tier?: 'high' | 'medium' | 'low' | 'unmapped';
  transformation?: string;
  tier?: 'T1' | 'T2' | 'T3' | 'T4';
  source?: 'alias' | 'vector' | 'ai' | 'manual';
  confirmed?: boolean;
  reasoning?: string;
}

export interface AutoMapResponse {
  status: 'success' | 'error';
  mappings: FieldMapping[];
  unmapped_fields: string[];
  message?: string;
  target_schema?: string[];
}

export interface MappingSuggestionResponse {
  status: 'success' | 'error';
  suggestions: Array<{
    target_field: string;
    confidence: number;
    reason: string;
  }>;
  message?: string;
}

// ==========================================
// Role Types
// ==========================================

export interface RoleProficiency {
  skill_id: string;
  skill_name: string;
  required_level: number;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  department?: string;
  environment_id?: string;
  proficiencies: RoleProficiency[];
  skills?: Array<{ id: string; name: string; proficiency_level?: number; required?: boolean }>;
  created_at?: string;
  updated_at?: string;
}

export interface RoleListResponse {
  status: 'success' | 'error';
  roles: Role[];
  message?: string;
}

export interface RoleResponse {
  status: 'success' | 'error';
  role: Role;
  message?: string;
}

export interface RoleSyncResponse {
  status: 'success' | 'error';
  synced_count: number;
  created_count: number;
  updated_count: number;
  errors: Array<{ role_id: string; error: string }>;
  message?: string;
}

// ==========================================
// Export Types
// ==========================================

export interface ExportResponse {
  status: 'success' | 'error';
  format: 'json' | 'csv' | 'xlsx';
  content?: string;
  filename?: string;
  download_url?: string;
  message?: string;
}

// ==========================================
// LLM Types
// ==========================================

export interface LLMProvider {
  id: string;
  name: string;
  models: Array<{
    id: string;
    name: string;
    max_tokens?: number;
  }>;
  requires_api_key: boolean;
  api_key_configured: boolean;
}

export interface LLMProvidersResponse {
  status: 'success' | 'error';
  providers: LLMProvider[];
  message?: string;
}

export interface LLMKeyTestResponse {
  status: 'success' | 'error';
  valid: boolean;
  provider: string;
  message?: string;
}

// ==========================================
// RAG Types
// ==========================================

export interface RAGSearchResult {
  skill_id: string;
  skill_name: string;
  skill?: string;
  score: number;
  category?: string;
}

export interface RAGSearchResponse {
  status: 'success' | 'error';
  results: RAGSearchResult[];
  query: string;
  message?: string;
}

export interface RAGContextResponse {
  status: 'success' | 'error';
  context: string[];
  sources: string[];
  message?: string;
}

export interface RAGEnhanceResponse {
  status: 'success' | 'error';
  enhanced_prompt: string;
  prompt?: string;
  context_used: string[];
  message?: string;
}

// ==========================================
// Authentication Types
// ==========================================

export interface EightfoldAuthResponse {
  status: 'success' | 'error';
  success?: boolean;
  authenticated: boolean;
  session_token?: string;
  access_token?: string;
  expires_at?: string;
  expires_in?: number;
  environment_name?: string;
  session_id?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  message?: string;
  error?: string;
}

// ==========================================
// Data Analysis Types
// ==========================================

export interface DataQualityGrade {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  score: number;
  breakdown: {
    completeness: number;
    accuracy: number;
    consistency: number;
    validity: number;
  };
}

export interface DataAnalysisResponse {
  status: 'success' | 'error';
  success?: boolean;
  file_id?: string;
  quality: DataQualityGrade;
  field_stats: Record<string, {
    type: string;
    null_count: number;
    unique_count: number;
    sample_values: string[];
  }>;
  recommendations: string[];
  message?: string;
  analysis?: Record<string, any>;
}

export interface EntityDetectionResponse {
  status: 'success' | 'error';
  entity_type: string;
  confidence: number;
  suggested_mappings: FieldMapping[];
  message?: string;
}

// ==========================================
// Batch Types
// ==========================================

export interface BatchCreateResponse {
  status: 'success' | 'error';
  batch_id: string;
  batch_name: string;
  assessment_count: number;
  message?: string;
}

// ==========================================
// Generic Delete Response
// ==========================================

export interface DeleteResponse {
  status: 'success' | 'error';
  deleted: boolean;
  message?: string;
}

// ==========================================
// Upload Response
// ==========================================

export interface UploadResponse {
  status: 'success' | 'error';
  file_id: string;
  filename: string;
  size: number;
  message?: string;
}
