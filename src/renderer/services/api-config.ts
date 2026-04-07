/**
 * API Config
 * Environments, roles, LLM management, configurations, and RAG methods.
 */

import { electronAPI } from './electron-api';
import { ApiWithAssessment } from './api-assessment';

import type {
  EnvironmentListResponse,
  EnvironmentResponse,
  EnvironmentTestResponse,
  RoleListResponse,
  RoleResponse,
  RoleSyncResponse,
  LLMKeyTestResponse,
  LLMProvidersResponse,
  ConfigurationListResponse,
  ConfigurationResponse,
  RAGSearchResponse,
  RAGContextResponse,
  RAGEnhanceResponse,
  EightfoldAuthResponse,
  ApiStatus,
  DeleteResponse,
  PreviewMappingResponse,
  ExportWithMappingsRequest,
  EightfoldExportResponse,
} from '../types/api';

export class ApiWithConfig extends ApiWithAssessment {
  // ==========================================
  // Environments API
  // ==========================================

  async getEnvironments(): Promise<EnvironmentListResponse> {
    return electronAPI.get('/api/environments');
  }

  async createEnvironment(environment: {
    name: string;
    description?: string;
    base_url?: string;
    username?: string;
    password?: string;
  }): Promise<EnvironmentResponse> {
    return electronAPI.post('/api/environments', environment);
  }

  async updateEnvironment(
    id: string,
    environment: {
      name?: string;
      description?: string;
      base_url?: string;
      username?: string;
      password?: string;
    }
  ): Promise<EnvironmentResponse> {
    return electronAPI.put(`/api/environments/${id}`, environment);
  }

  async deleteEnvironment(id: string): Promise<DeleteResponse> {
    return electronAPI.delete(`/api/environments/${id}`);
  }

  async eightfoldLogin(data: {
    environment_id?: string;
    environment_key?: string;
    username?: string;
    password?: string;
    base_url?: string;
  }): Promise<EightfoldAuthResponse> {
    return electronAPI.post('/api/auth/eightfold', data);
  }

  async testEnvironmentConnection(data: {
    environment_id?: string;
    base_url?: string;
    username?: string;
    password?: string;
  }): Promise<EnvironmentTestResponse> {
    return electronAPI.post('/api/environments/test-connection', data);
  }

  async setDefaultEnvironment(id: string): Promise<ApiStatus> {
    return electronAPI.post(`/api/environments/default/${id}`, {});
  }

  async getDefaultEnvironment(): Promise<EnvironmentResponse> {
    return electronAPI.get('/api/environments/default/get');
  }

  async initializeEnvironments(): Promise<EnvironmentListResponse> {
    return electronAPI.post('/api/environments/initialize', {});
  }

  // ==========================================
  // Role CRUD API
  // ==========================================

  async getRoles(environmentName?: string, sessionToken?: string): Promise<RoleListResponse> {
    const qs = new URLSearchParams();
    if (environmentName) qs.set('environment_name', environmentName);
    if (sessionToken) qs.set('access_token', sessionToken);
    const params = qs.toString() ? `?${qs.toString()}` : '';
    return electronAPI.get(`/api/roles/list${params}`);
  }

  async getRole(roleId: string): Promise<RoleResponse> {
    return electronAPI.get(`/api/roles/${roleId}`);
  }

  async createRole(roleData: {
    name: string;
    description?: string;
    environment_id?: string;
    proficiencies?: Array<{ skill_id: string; skill_name: string; required_level: number }>;
  }): Promise<RoleResponse> {
    return electronAPI.post('/api/roles/create', roleData);
  }

  async updateRoleProficiencies(
    roleId: string,
    proficiencies: Array<{ skill_id: string; skill_name: string; required_level: number }>,
    mode: 'add' | 'update' | 'replace' = 'update'
  ): Promise<RoleResponse> {
    return electronAPI.put('/api/roles/update-proficiencies', {
      role_id: roleId,
      proficiencies,
      mode,
    });
  }

  async deleteRole(roleId: string): Promise<DeleteResponse> {
    return electronAPI.delete(`/api/roles/${roleId}`);
  }

  async syncRoles(
    sourceEnvId: string,
    targetEnvId: string,
    roleIds?: string[]
  ): Promise<RoleSyncResponse> {
    return electronAPI.post('/api/roles/sync', {
      source_environment_id: sourceEnvId,
      target_environment_id: targetEnvId,
      role_ids: roleIds,
    });
  }

  async dryRunSync(
    sourceEnvId: string,
    targetEnvId: string,
    roleIds?: string[]
  ): Promise<RoleSyncResponse> {
    return electronAPI.post('/api/roles/sync', {
      source_environment_id: sourceEnvId,
      target_environment_id: targetEnvId,
      role_ids: roleIds,
      dry_run: true,
    });
  }

  async bulkRoleOperations(
    operations: Array<{ action: string; role_id?: string; data?: unknown }>
  ): Promise<ApiStatus> {
    return electronAPI.post('/api/roles/bulk', { operations });
  }

  // ==========================================
  // LLM Management API
  // ==========================================

  async testLLMKey(provider: string, apiKey: string): Promise<LLMKeyTestResponse> {
    return electronAPI.post('/api/llm/test-key', { provider, api_key: apiKey });
  }

  async getLLMProviders(): Promise<LLMProvidersResponse> {
    return electronAPI.get('/api/llm/providers');
  }

  // ==========================================
  // Configuration Management API
  // ==========================================

  async listConfigurations(): Promise<ConfigurationListResponse> {
    return electronAPI.get('/api/configurations');
  }

  async getConfiguration(id: string): Promise<ConfigurationResponse> {
    return electronAPI.get(`/api/configurations/${id}`);
  }

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

  async updateConfiguration(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      tags: string[];
      proficiency_levels: Array<{ level: number; name: string; description: string }>;
      llm_config: { provider: string; model: string };
      prompt_template: string;
      is_default: boolean;
    }>
  ): Promise<ConfigurationResponse> {
    return electronAPI.put(`/api/configurations/${id}`, data);
  }

  async deleteConfiguration(id: string): Promise<DeleteResponse> {
    return electronAPI.delete(`/api/configurations/${id}`);
  }

  async setDefaultConfiguration(id: string): Promise<ApiStatus> {
    return electronAPI.post(`/api/configurations/default/${id}`, {});
  }

  async cloneConfiguration(id: string): Promise<ConfigurationResponse> {
    return electronAPI.post(`/api/configurations/${id}/clone`, {});
  }

  // ==========================================
  // RAG (Retrieval-Augmented Generation) API
  // ==========================================

  async indexSkillsForRAG(data: {
    skills: Array<{ id: string; name: string; description?: string; category?: string }>;
  }): Promise<ApiStatus> {
    return electronAPI.post('/api/rag/skills/index', data);
  }

  async addRAGContext(data: {
    documents: Array<{ content: string; metadata?: Record<string, unknown> }>;
  }): Promise<ApiStatus> {
    return electronAPI.post('/api/rag/context/add', data);
  }

  async searchSkillsSemantic(data: {
    query: string;
    top_k?: number;
    min_score?: number;
    category?: string;
  }): Promise<RAGSearchResponse> {
    return electronAPI.post('/api/rag/skills/search', data);
  }

  async retrieveRAGContext(data: { query: string; top_k?: number }): Promise<RAGContextResponse> {
    return electronAPI.post('/api/rag/context/retrieve', data);
  }

  async enhancePromptWithRAG(data: {
    prompt: string;
    skill_name: string;
    use_context?: boolean;
  }): Promise<RAGEnhanceResponse> {
    return electronAPI.post('/api/rag/prompt/enhance', data);
  }

  // ==========================================
  // Skill-Role Matching API
  // ==========================================

  async previewSkillMapping(data: {
    assessments: Array<{ skill_name: string; proficiency_numeric: number }>;
    role_id: string;
    role_data?: Record<string, unknown>;
    environment_id: string;
    auth_token?: string;
  }): Promise<PreviewMappingResponse> {
    return electronAPI.post('/api/proficiency/preview-mapping', data);
  }

  async exportToEightfoldWithMappings(
    data: ExportWithMappingsRequest
  ): Promise<EightfoldExportResponse> {
    return electronAPI.post('/api/proficiency/export-to-eightfold', data);
  }
}
