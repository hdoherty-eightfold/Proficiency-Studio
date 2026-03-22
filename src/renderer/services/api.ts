/**
 * API Service
 * Main API service for making requests to the backend
 * Routes through Electron IPC in desktop app
 */

import { electronAPI } from './electron-api';

// API version constant. Currently unused but available for future versioned endpoint support.
// When the backend adds versioned routes, update base URL construction to include `/api/${API_VERSION}`.
export const API_VERSION = 'v1';

// ==========================================
// Request Deduplication (GET only)
// ==========================================

/**
 * In-flight GET request cache.
 * Prevents duplicate concurrent GET requests to the same endpoint.
 * Keyed by `GET:endpoint`, stores the pending promise.
 */
const inflightRequests = new Map<string, Promise<unknown>>();

/**
 * Deduplicate a GET request. If an identical GET is already in flight,
 * returns the existing promise instead of making a new request.
 * Only applies to GET requests; mutations should never be deduplicated.
 */
function deduplicateGet<T>(endpoint: string, fn: () => Promise<T>): Promise<T> {
  const key = `GET:${endpoint}`;
  const existing = inflightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fn().finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, promise);
  return promise;
}

// ==========================================
// Retry with Exponential Backoff
// ==========================================

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

/**
 * Determines if an error is retryable.
 * Retries on network errors, timeouts, and 5xx server errors.
 * Does NOT retry on 4xx client errors.
 */
function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  // Network-level errors - always retryable
  if (
    message.includes('cannot connect to backend') ||
    message.includes('network error') ||
    message.includes('timed out') ||
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('econnaborted') ||
    message.includes('err_network') ||
    message.includes('fetch failed') ||
    message.includes('server may be overloaded')
  ) {
    return true;
  }

  // 5xx server errors - retryable (detect from error messages containing HTTP status)
  const httpStatusMatch = message.match(/\b(5\d{2})\b/);
  if (httpStatusMatch) {
    return true;
  }

  // 4xx client errors - not retryable (detect common 4xx patterns)
  const clientErrorMatch = message.match(/\b(4\d{2})\b/);
  if (clientErrorMatch) {
    return false;
  }

  // "Internal server error" text without status code
  if (message.includes('internal server error')) {
    return true;
  }

  return false;
}

/**
 * Retry an async function with exponential backoff and jitter.
 * Retries on network errors and 5xx status codes.
 * Does NOT retry on 4xx client errors.
 *
 * Delay formula: min(baseDelay * 2^attempt, maxDelay) + random jitter
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay } = { ...DEFAULT_RETRY_OPTIONS, ...options };

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts or the error isn't retryable
      if (attempt >= maxRetries || !isRetryableError(error)) {
        throw error;
      }

      // Exponential backoff with jitter
      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const cappedDelay = Math.min(exponentialDelay, maxDelay);
      const jitter = Math.random() * cappedDelay * 0.1; // 0-10% jitter
      const delay = cappedDelay + jitter;

      console.warn(
        `[API Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${Math.round(delay)}ms:`,
        error instanceof Error ? error.message : error
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

import type {
  HealthCheckResponse,
  SkillsExtractResponse,
  SkillsListResponse,
  AssessmentResponse,
  AssessmentHistoryResponse,
  AssessmentDetailResponse,
  AssessmentCompareResponse,
  EnvironmentListResponse,
  EnvironmentResponse,
  EnvironmentTestResponse,
  ConfigurationListResponse,
  ConfigurationResponse,
  FilePreviewResponse,
  CellUpdateResponse,
  BulkUpdateResponse,
  DeleteRowsResponse,
  FileReviewResponse,
  ApplyFixesResponse,
  SFTPCredentialsResponse,
  SFTPCredentialResponse,
  SFTPConnectionTestResponse,
  SFTPBrowseResponse,
  SFTPDownloadResponse,
  AnalyticsOverviewResponse,
  ModelPerformanceResponse,
  VolumeDataResponse,
  TopSkillsResponse,
  AutoMapResponse,
  MappingSuggestionResponse,
  RoleListResponse,
  RoleResponse,
  RoleSyncResponse,
  ExportResponse,
  LLMProvidersResponse,
  LLMKeyTestResponse,
  RAGSearchResponse,
  RAGContextResponse,
  RAGEnhanceResponse,
  EightfoldAuthResponse,
  DataAnalysisResponse,
  EntityDetectionResponse,
  DeleteResponse,
  UploadResponse,
  ApiStatus,
} from '../types/api';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

class APIService {
  /**
   * Health check
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    return retryWithBackoff(() => electronAPI.get('/health'));
  }

  /**
   * Generic Post request
   */
  async post<T = unknown>(endpoint: string, data: unknown): Promise<T> {
    return retryWithBackoff(() => electronAPI.post(endpoint, data));
  }

  /**
   * Generic Put request
   */
  async put<T = unknown>(endpoint: string, data: unknown): Promise<T> {
    return retryWithBackoff(() => electronAPI.put(endpoint, data));
  }

  /**
   * Generic Delete request
   */
  async delete<T = unknown>(endpoint: string): Promise<T> {
    return retryWithBackoff(() => electronAPI.delete(endpoint));
  }

  /**
   * Generic Get request (deduplicated: concurrent identical GETs share one in-flight request)
   */
  async get<T = unknown>(endpoint: string): Promise<T> {
    return deduplicateGet(endpoint, () => retryWithBackoff(() => electronAPI.get(endpoint)));
  }

  /**
   * Upload a file by path (selected via native file dialog)
   */
  async uploadFile(filePath: string): Promise<UploadResponse> {
    return retryWithBackoff(() => electronAPI.upload('/api/upload', [filePath]));
  }

  /**
   * Upload multiple files by path
   */
  async uploadFiles(filePaths: string[]): Promise<UploadResponse> {
    return retryWithBackoff(() => electronAPI.upload('/api/upload', filePaths));
  }

  /**
   * Extract skills from uploaded data
   */
  async extractSkills(data: { filename: string; file_content: string }): Promise<SkillsExtractResponse> {
    return electronAPI.post('/api/skills/extract', data);
  }

  /**
   * Get skills list
   */
  async getSkills(): Promise<SkillsListResponse> {
    return electronAPI.get('/api/skills');
  }

  /**
   * Configure proficiency assessment
   */
  async configureProficiency(config: {
    proficiency_levels: Array<{ level: number; name: string; description: string }>;
    llm_config: { provider: string; model: string; temperature?: number };
    prompt_template?: string;
  }): Promise<ApiStatus> {
    return electronAPI.post('/api/proficiency/configure', config);
  }

  /**
   * Run proficiency assessment
   */
  async runAssessment(data: {
    skills: Array<{ name: string }>;
    llm_config: { provider: string; model: string };
    prompt_template?: string;
    proficiency_levels?: Array<{ level: number; name: string; description: string }>;
  }): Promise<AssessmentResponse> {
    return electronAPI.post('/api/proficiency/assess', data);
  }

  /**
   * Get assessment results
   */
  async getAssessmentResults(id: string): Promise<AssessmentDetailResponse> {
    return electronAPI.get(`/api/proficiency/results/${id}`);
  }

  /**
   * Get environments
   */
  async getEnvironments(): Promise<EnvironmentListResponse> {
    return electronAPI.get('/api/environments');
  }

  /**
   * Create environment
   */
  async createEnvironment(environment: {
    name: string;
    description?: string;
    base_url?: string;
    username?: string;
    password?: string;
  }): Promise<EnvironmentResponse> {
    return electronAPI.post('/api/environments', environment);
  }

  /**
   * Update environment
   */
  async updateEnvironment(id: string, environment: {
    name?: string;
    description?: string;
    base_url?: string;
    username?: string;
    password?: string;
  }): Promise<EnvironmentResponse> {
    return electronAPI.put(`/api/environments/${id}`, environment);
  }

  /**
   * Delete environment
   */
  async deleteEnvironment(id: string): Promise<DeleteResponse> {
    return electronAPI.delete(`/api/environments/${id}`);
  }

  /**
   * Get mapping data
   */
  async getMappings(): Promise<AutoMapResponse> {
    return electronAPI.get('/api/mappings');
  }

  /**
   * Save mapping
   */
  async saveMapping(mapping: { mappings: Array<{ source_field: string; target_field: string }> }): Promise<ApiStatus> {
    return electronAPI.post('/api/mappings', mapping);
  }

  /**
   * Export data
   */
  async exportData(format: 'csv' | 'xml', data: unknown): Promise<ExportResponse> {
    return electronAPI.post(`/api/export/${format}`, data);
  }

  // ==========================================
  // Assessment History API
  // ==========================================

  /**
   * Get assessment history with optional filtering
   */
  async getAssessmentHistory(params?: {
    environment_name?: string;
    model_provider?: string;
    limit?: number;
  }): Promise<AssessmentHistoryResponse> {
    let url = '/api/export/history';
    const queryParams: string[] = [];
    if (params?.environment_name) queryParams.push(`environment_name=${encodeURIComponent(params.environment_name)}`);
    if (params?.model_provider) queryParams.push(`model_provider=${encodeURIComponent(params.model_provider)}`);
    if (params?.limit) queryParams.push(`limit=${params.limit}`);
    if (queryParams.length > 0) url += `?${queryParams.join('&')}`;
    return electronAPI.get(url);
  }

  /**
   * Get detailed assessment by ID
   */
  async getAssessmentDetail(assessmentId: string): Promise<AssessmentDetailResponse> {
    return electronAPI.get(`/api/export/history/${assessmentId}`);
  }

  /**
   * Delete an assessment
   */
  async deleteAssessment(assessmentId: string): Promise<DeleteResponse> {
    return electronAPI.delete(`/api/export/history/${assessmentId}?confirm=true`);
  }

  /**
   * Compare multiple assessments
   */
  async compareAssessments(assessmentIds: string[]): Promise<AssessmentCompareResponse> {
    return electronAPI.post('/api/export/history/compare', assessmentIds);
  }

  /**
   * Export proficiencies in various formats
   */
  async exportProficiencies(params: {
    assessment_id?: string;
    format: 'json' | 'csv' | 'xlsx';
    include_metadata?: boolean;
  }): Promise<ExportResponse> {
    return electronAPI.post('/api/export/proficiencies', params);
  }

  // ==========================================
  // AI File Review API
  // ==========================================

  /**
   * Review uploaded file for issues using AI
   */
  async reviewFile(fileId: string, entityName: string): Promise<FileReviewResponse> {
    return electronAPI.post(`/api/review/file/${fileId}`, { entity_name: entityName });
  }

  /**
   * Apply AI-suggested fixes to a file
   */
  async applyFixes(fileId: string, entityName: string): Promise<ApplyFixesResponse> {
    return electronAPI.post(`/api/review/apply-fixes/${fileId}`, { entity_name: entityName });
  }

  // ==========================================
  // CSV Cell Editing API
  // ==========================================

  /**
   * Update a single cell value in stored file
   */
  async updateCellValue(data: {
    file_id: string;
    row_index: number;
    column_name: string;
    new_value: unknown;
  }): Promise<CellUpdateResponse> {
    return electronAPI.post('/api/transform/update-cell', data);
  }

  /**
   * Update multiple cells in batch
   */
  async updateCellsBulk(data: {
    file_id: string;
    updates: Array<{ row_index: number; column_name: string; new_value: unknown }>;
  }): Promise<BulkUpdateResponse> {
    return electronAPI.post('/api/transform/update-cells-bulk', data);
  }

  /**
   * Delete rows from stored file
   */
  async deleteRows(data: {
    file_id: string;
    row_indices: number[];
  }): Promise<DeleteRowsResponse> {
    return electronAPI.post('/api/transform/delete-rows', data);
  }

  /**
   * Get file preview data for editing
   */
  async getFilePreview(fileId: string, sampleSize?: number): Promise<FilePreviewResponse> {
    return electronAPI.get(`/api/transform/file-data/${fileId}?sample_size=${sampleSize || 1000}`);
  }

  // ==========================================
  // Data Quality Analysis API
  // ==========================================

  /**
   * Analyze data quality and get A-F grade
   */
  async analyzeData(fileId: string): Promise<DataAnalysisResponse> {
    return electronAPI.post('/api/analysis/analyze', { file_id: fileId });
  }

  /**
   * Analyze data quality from CSV content directly
   */
  async analyzeDataContent(content: string, filename: string): Promise<DataAnalysisResponse> {
    return electronAPI.post('/api/analysis/analyze-content', { content, filename });
  }

  /**
   * Get comprehensive data analysis
   */
  async getComprehensiveAnalysis(data: { file_id?: string; content?: string }): Promise<DataAnalysisResponse> {
    return electronAPI.post('/api/analysis/comprehensive', data);
  }

  // ==========================================
  // Field Mapping API (4-tier confidence)
  // ==========================================

  /**
   * Auto-map source fields to target schema
   */
  async autoMapFields(sourceFields: string[], targetSchema: string): Promise<AutoMapResponse> {
    return electronAPI.post('/api/mapping/auto-map', {
      source_fields: sourceFields,
      target_schema: targetSchema
    });
  }

  /**
   * Get mapping suggestion for a single field
   */
  async suggestMapping(sourceField: string, entityName: string): Promise<MappingSuggestionResponse> {
    return electronAPI.post('/api/mapping/suggest', {
      source_field: sourceField,
      entity_name: entityName
    });
  }

  /**
   * Save confirmed field mappings
   */
  async saveFieldMappings(mappings: Array<{ source_field: string; target_field: string }>): Promise<ApiStatus> {
    return electronAPI.post('/api/mapping/save', { mappings });
  }

  // ==========================================
  // Role CRUD API
  // ==========================================

  /**
   * Get all roles
   */
  async getRoles(): Promise<RoleListResponse> {
    return electronAPI.get('/api/roles/list');
  }

  /**
   * Get role by ID
   */
  async getRole(roleId: string): Promise<RoleResponse> {
    return electronAPI.get(`/api/roles/${roleId}`);
  }

  /**
   * Create a new role with proficiencies
   */
  async createRole(roleData: {
    name: string;
    description?: string;
    environment_id?: string;
    proficiencies?: Array<{ skill_id: string; skill_name: string; required_level: number }>;
  }): Promise<RoleResponse> {
    return electronAPI.post('/api/roles/create', roleData);
  }

  /**
   * Update role proficiencies
   */
  async updateRoleProficiencies(
    roleId: string,
    proficiencies: Array<{ skill_id: string; skill_name: string; required_level: number }>,
    mode: 'add' | 'update' | 'replace' = 'update'
  ): Promise<RoleResponse> {
    return electronAPI.put('/api/roles/update-proficiencies', {
      role_id: roleId,
      proficiencies,
      mode
    });
  }

  /**
   * Delete a role
   */
  async deleteRole(roleId: string): Promise<DeleteResponse> {
    return electronAPI.delete(`/api/roles/${roleId}`);
  }

  /**
   * Sync roles between environments
   */
  async syncRoles(sourceEnvId: string, targetEnvId: string, roleIds?: string[]): Promise<RoleSyncResponse> {
    return electronAPI.post('/api/roles/sync', {
      source_environment_id: sourceEnvId,
      target_environment_id: targetEnvId,
      role_ids: roleIds
    });
  }

  /**
   * Dry-run sync (preview changes)
   */
  async dryRunSync(sourceEnvId: string, targetEnvId: string, roleIds?: string[]): Promise<RoleSyncResponse> {
    return electronAPI.post('/api/roles/sync', {
      source_environment_id: sourceEnvId,
      target_environment_id: targetEnvId,
      role_ids: roleIds,
      dry_run: true
    });
  }

  /**
   * Bulk role operations
   */
  async bulkRoleOperations(operations: Array<{ action: string; role_id?: string; data?: unknown }>): Promise<ApiStatus> {
    return electronAPI.post('/api/roles/bulk', { operations });
  }

  // ==========================================
  // LLM Management API
  // ==========================================

  /**
   * Test LLM API key
   */
  async testLLMKey(provider: string, apiKey: string): Promise<LLMKeyTestResponse> {
    return electronAPI.post('/api/llm/test-key', { provider, api_key: apiKey });
  }

  /**
   * Get available LLM providers
   */
  async getLLMProviders(): Promise<LLMProvidersResponse> {
    return electronAPI.get('/api/llm/providers');
  }

  // ==========================================
  // SFTP Management API
  // ==========================================

  /**
   * List all SFTP credentials
   */
  async listSFTPCredentials(): Promise<SFTPCredentialsResponse> {
    return electronAPI.get('/api/sftp/credentials');
  }

  /**
   * Create SFTP credential
   */
  async createSFTPCredential(data: {
    name: string;
    host: string;
    port?: number;
    username: string;
    password: string;
    default_path?: string;
  }): Promise<SFTPCredentialResponse> {
    return electronAPI.post('/api/sftp/credentials', data);
  }

  /**
   * Update SFTP credential
   */
  async updateSFTPCredential(id: string, data: {
    name?: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    default_path?: string;
  }): Promise<SFTPCredentialResponse> {
    return electronAPI.put(`/api/sftp/credentials/${id}`, data);
  }

  /**
   * Delete SFTP credential
   */
  async deleteSFTPCredential(id: string): Promise<DeleteResponse> {
    return electronAPI.delete(`/api/sftp/credentials/${id}`);
  }

  /**
   * Test SFTP connection
   */
  async testSFTPConnection(data: {
    credential_id?: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
  }): Promise<SFTPConnectionTestResponse> {
    return electronAPI.post('/api/sftp/test-connection', data);
  }

  /**
   * Browse SFTP directory
   */
  async browseSFTP(data: {
    credential_id: string;
    path?: string;
  }): Promise<SFTPBrowseResponse> {
    return electronAPI.post('/api/sftp/browse', data);
  }

  /**
   * Download file from SFTP
   */
  async downloadFromSFTP(data: {
    credential_id: string;
    remote_path: string;
  }): Promise<SFTPDownloadResponse> {
    return electronAPI.post('/api/sftp/download', data);
  }

  /**
   * Upload content to SFTP (for exporting assessment results)
   */
  async uploadToSFTP(data: {
    credential_id: string;
    remote_path?: string;
    content: string;
    filename: string;
  }): Promise<{ success: boolean; path?: string; filename: string; size_bytes?: number; error?: string }> {
    return electronAPI.post(`/api/sftp/upload-content/${data.credential_id}`, {
      filename: data.filename,
      content: data.content,
      remote_path: data.remote_path
    });
  }

  /**
   * Extract skills from SFTP file
   */
  async extractSkillsFromSFTP(data: {
    credential_id: string;
    remote_path: string;
  }): Promise<SkillsExtractResponse> {
    return electronAPI.post('/api/skills/extract/sftp', data);
  }

  // ==========================================
  // Eightfold Authentication API
  // ==========================================

  /**
   * Authenticate with Eightfold OAuth
   */
  async eightfoldLogin(data: {
    environment_id?: string;
    environment_key?: string;
    username?: string;
    password?: string;
    base_url?: string;
  }): Promise<EightfoldAuthResponse> {
    return electronAPI.post('/api/auth/eightfold', data);
  }

  /**
   * Test environment connection
   */
  async testEnvironmentConnection(data: {
    environment_id?: string;
    base_url?: string;
    username?: string;
    password?: string;
  }): Promise<EnvironmentTestResponse> {
    return electronAPI.post('/api/environments/test-connection', data);
  }

  /**
   * Set default environment
   */
  async setDefaultEnvironment(id: string): Promise<ApiStatus> {
    return electronAPI.post(`/api/environments/default/${id}`, {});
  }

  /**
   * Get default environment
   */
  async getDefaultEnvironment(): Promise<EnvironmentResponse> {
    return electronAPI.get('/api/environments/default/get');
  }

  /**
   * Initialize default environments
   */
  async initializeEnvironments(): Promise<EnvironmentListResponse> {
    return electronAPI.post('/api/environments/initialize', {});
  }

  /**
   * Extract skills from Eightfold API
   */
  async extractSkillsFromAPI(data: {
    environment_id: string;
    session_token?: string;
  }): Promise<SkillsExtractResponse> {
    return electronAPI.post('/api/skills/extract/api', data);
  }

  // ==========================================
  // Analytics API
  // ==========================================

  /**
   * Get analytics overview
   */
  async getAnalyticsOverview(params?: {
    start_date?: string;
    end_date?: string;
    environment_id?: string;
  }): Promise<AnalyticsOverviewResponse> {
    let url = '/api/analytics/overview';
    const queryParams: string[] = [];
    if (params?.start_date) queryParams.push(`start_date=${params.start_date}`);
    if (params?.end_date) queryParams.push(`end_date=${params.end_date}`);
    if (params?.environment_id) queryParams.push(`environment_id=${params.environment_id}`);
    if (queryParams.length > 0) url += `?${queryParams.join('&')}`;
    return electronAPI.get(url);
  }

  /**
   * Get model performance metrics
   */
  async getModelPerformance(): Promise<ModelPerformanceResponse> {
    return electronAPI.get('/api/analytics/models');
  }

  /**
   * Get assessment volume data
   */
  async getVolumeData(params?: {
    period?: 'day' | 'week' | 'month';
    days?: number;
  }): Promise<VolumeDataResponse> {
    let url = '/api/analytics/volume';
    const queryParams: string[] = [];
    if (params?.period) queryParams.push(`period=${params.period}`);
    if (params?.days) queryParams.push(`days=${params.days}`);
    if (queryParams.length > 0) url += `?${queryParams.join('&')}`;
    return electronAPI.get(url);
  }

  /**
   * Get top assessed skills
   */
  async getTopSkills(params?: {
    limit?: number;
    environment_id?: string;
  }): Promise<TopSkillsResponse> {
    let url = '/api/analytics/top-skills';
    const queryParams: string[] = [];
    if (params?.limit) queryParams.push(`limit=${params.limit}`);
    if (params?.environment_id) queryParams.push(`environment_id=${params.environment_id}`);
    if (queryParams.length > 0) url += `?${queryParams.join('&')}`;
    return electronAPI.get(url);
  }

  // ==========================================
  // Configuration Management API
  // ==========================================

  /**
   * List all configurations
   */
  async listConfigurations(): Promise<ConfigurationListResponse> {
    return electronAPI.get('/api/configurations');
  }

  /**
   * Get configuration by ID
   */
  async getConfiguration(id: string): Promise<ConfigurationResponse> {
    return electronAPI.get(`/api/configurations/${id}`);
  }

  /**
   * Create configuration
   */
  async createConfiguration(data: {
    name: string;
    description?: string;
    tags?: string[];
    author?: string;
    proficiency_levels: Array<{
      level: number;
      name: string;
      description: string;
      color?: string;
    }>;
    llm_config?: {
      provider: string;
      model: string;
      temperature?: number;
      max_tokens?: number;
    };
    prompt_template?: string;
    is_default?: boolean;
    is_public?: boolean;
  }): Promise<ConfigurationResponse> {
    return electronAPI.post('/api/configurations', data);
  }

  /**
   * Update configuration
   */
  async updateConfiguration(id: string, data: Partial<{
    name: string;
    description: string;
    tags: string[];
    proficiency_levels: Array<{ level: number; name: string; description: string }>;
    llm_config: { provider: string; model: string };
    prompt_template: string;
    is_default: boolean;
  }>): Promise<ConfigurationResponse> {
    return electronAPI.put(`/api/configurations/${id}`, data);
  }

  /**
   * Delete configuration
   */
  async deleteConfiguration(id: string): Promise<DeleteResponse> {
    return electronAPI.delete(`/api/configurations/${id}`);
  }

  /**
   * Set default configuration
   */
  async setDefaultConfiguration(id: string): Promise<ApiStatus> {
    return electronAPI.post(`/api/configurations/default/${id}`, {});
  }

  /**
   * Clone configuration
   */
  async cloneConfiguration(id: string): Promise<ConfigurationResponse> {
    return electronAPI.post(`/api/configurations/${id}/clone`, {});
  }

  // ==========================================
  // RAG (Retrieval-Augmented Generation) API
  // ==========================================

  /**
   * Index skills for semantic search
   */
  async indexSkillsForRAG(data: {
    skills: Array<{ id: string; name: string; description?: string; category?: string }>;
  }): Promise<ApiStatus> {
    return electronAPI.post('/api/rag/skills/index', data);
  }

  /**
   * Add context documents for RAG
   */
  async addRAGContext(data: {
    documents: Array<{ content: string; metadata?: Record<string, unknown> }>;
  }): Promise<ApiStatus> {
    return electronAPI.post('/api/rag/context/add', data);
  }

  /**
   * Search skills semantically
   */
  async searchSkillsSemantic(data: {
    query: string;
    top_k?: number;
    min_score?: number;
    category?: string;
  }): Promise<RAGSearchResponse> {
    return electronAPI.post('/api/rag/skills/search', data);
  }

  /**
   * Retrieve context for a query
   */
  async retrieveRAGContext(data: {
    query: string;
    top_k?: number;
  }): Promise<RAGContextResponse> {
    return electronAPI.post('/api/rag/context/retrieve', data);
  }

  /**
   * Enhance prompt with RAG context
   */
  async enhancePromptWithRAG(data: {
    prompt: string;
    skill_name: string;
    use_context?: boolean;
  }): Promise<RAGEnhanceResponse> {
    return electronAPI.post('/api/rag/prompt/enhance', data);
  }

  // ==========================================
  // Data Analysis API (Enhanced)
  // ==========================================

  /**
   * Analyze file content directly
   */
  async analyzeFileContent(data: {
    content: string;
    filename: string;
  }): Promise<DataAnalysisResponse> {
    return electronAPI.post('/api/data-analysis/content-analyze', data);
  }

  /**
   * Detect entity type from fields
   */
  async detectEntityType(data: {
    fields: string[];
    sample_values?: string[][];
  }): Promise<EntityDetectionResponse> {
    return electronAPI.post('/api/ai/detect-entity', data);
  }

  /**
   * Infer field corrections
   */
  async inferCorrections(data: {
    field_name: string;
    values: string[];
    expected_type?: string;
  }): Promise<ApiStatus & { corrections?: Array<{ original: string; corrected: string }> }> {
    return electronAPI.post('/api/ai/infer-corrections', data);
  }

  // ==========================================
  // Export API (Enhanced)
  // ==========================================

  /**
   * Export assessment to specific format
   */
  async exportAssessment(assessmentId: string, params: {
    format: 'json' | 'csv' | 'xlsx';
    include_metadata?: boolean;
    include_reasoning?: boolean;
    include_confidence?: boolean;
  }): Promise<ExportResponse> {
    return electronAPI.post(`/api/export/assessment/${assessmentId}`, params);
  }

  /**
   * Export batch assessments
   */
  async exportBatch(batchId: string, params: {
    format: 'json' | 'csv' | 'xlsx';
    include_metadata?: boolean;
  }): Promise<ExportResponse> {
    return electronAPI.post(`/api/export/batch/${batchId}`, params);
  }

  /**
   * Get export history
   */
  async getExportHistory(): Promise<AssessmentHistoryResponse> {
    return electronAPI.get('/api/export/history');
  }
}

export const api = new APIService();
