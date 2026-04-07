/**
 * API Skills
 * Skills extraction, SFTP, data quality, CSV editing, and field mapping methods.
 */

import { electronAPI } from './electron-api';
import { retryWithBackoff, ApiCore } from './api-core';

import type {
  SkillsExtractResponse,
  SkillsListResponse,
  FileReviewResponse,
  ApplyFixesResponse,
  CellUpdateResponse,
  BulkUpdateResponse,
  DeleteRowsResponse,
  FilePreviewResponse,
  DataAnalysisResponse,
  EntityDetectionResponse,
  AutoMapResponse,
  MappingSuggestionResponse,
  SFTPCredentialsResponse,
  SFTPCredentialResponse,
  SFTPConnectionTestResponse,
  SFTPBrowseResponse,
  SFTPUploadResponse,
  SFTPDownloadResponse,
  ApiStatus,
  DeleteResponse,
} from '../types/api';

export class ApiWithSkills extends ApiCore {
  // ==========================================
  // Skills API
  // ==========================================

  async extractSkills(data: {
    filename: string;
    file_content: string;
  }): Promise<SkillsExtractResponse> {
    return retryWithBackoff(() => electronAPI.post('/api/skills/extract', data));
  }

  async getSkills(): Promise<SkillsListResponse> {
    return retryWithBackoff(() => electronAPI.get('/api/skills'));
  }

  async extractSkillsFromSFTP(data: {
    credential_id: string;
    remote_path: string;
  }): Promise<SkillsExtractResponse> {
    return retryWithBackoff(() => electronAPI.post('/api/skills/extract/sftp', data));
  }

  async extractSkillsFromAPI(data: {
    environment_id: string;
    session_token?: string;
  }): Promise<SkillsExtractResponse> {
    return retryWithBackoff(() =>
      electronAPI.post('/api/skills/extract/api', {
        environment_id: data.environment_id,
        auth_token: data.session_token,
      })
    );
  }

  // ==========================================
  // AI File Review API
  // ==========================================

  async reviewFile(fileId: string, entityName: string): Promise<FileReviewResponse> {
    return retryWithBackoff(() =>
      electronAPI.post(`/api/review/file/${fileId}`, { entity_name: entityName })
    );
  }

  async applyFixes(fileId: string, entityName: string): Promise<ApplyFixesResponse> {
    return retryWithBackoff(() =>
      electronAPI.post(`/api/review/apply-fixes/${fileId}`, { entity_name: entityName })
    );
  }

  // ==========================================
  // CSV Cell Editing API
  // ==========================================

  async updateCellValue(data: {
    file_id: string;
    row_index: number;
    column_name: string;
    new_value: unknown;
  }): Promise<CellUpdateResponse> {
    return retryWithBackoff(() => electronAPI.post('/api/transform/update-cell', data));
  }

  async updateCellsBulk(data: {
    file_id: string;
    updates: Array<{ row_index: number; column_name: string; new_value: unknown }>;
  }): Promise<BulkUpdateResponse> {
    return retryWithBackoff(() => electronAPI.post('/api/transform/update-cells-bulk', data));
  }

  async deleteRows(data: { file_id: string; row_indices: number[] }): Promise<DeleteRowsResponse> {
    return retryWithBackoff(() => electronAPI.post('/api/transform/delete-rows', data));
  }

  async getFilePreview(fileId: string, sampleSize?: number): Promise<FilePreviewResponse> {
    return retryWithBackoff(() =>
      electronAPI.get(`/api/transform/file-data/${fileId}?sample_size=${sampleSize || 1000}`)
    );
  }

  // ==========================================
  // Data Quality Analysis API
  // ==========================================

  async analyzeData(fileId: string): Promise<DataAnalysisResponse> {
    return retryWithBackoff(() => electronAPI.post('/api/analysis/analyze', { file_id: fileId }));
  }

  async analyzeDataContent(content: string, filename: string): Promise<DataAnalysisResponse> {
    return retryWithBackoff(() =>
      electronAPI.post('/api/analysis/analyze-content', { content, filename })
    );
  }

  async getComprehensiveAnalysis(data: {
    file_id?: string;
    content?: string;
  }): Promise<DataAnalysisResponse> {
    return retryWithBackoff(() => electronAPI.post('/api/analysis/analyze', data));
  }

  async analyzeFileContent(data: {
    content: string;
    filename: string;
  }): Promise<DataAnalysisResponse> {
    return retryWithBackoff(() => electronAPI.post('/api/analysis/analyze-content', data));
  }

  async detectEntityType(data: {
    fields: string[];
    sample_values?: string[][];
  }): Promise<EntityDetectionResponse> {
    return retryWithBackoff(() => electronAPI.post('/api/ai/detect-entity', data));
  }

  async inferCorrections(data: {
    field_name: string;
    values: string[];
    expected_type?: string;
  }): Promise<ApiStatus & { corrections?: Array<{ original: string; corrected: string }> }> {
    return retryWithBackoff(() => electronAPI.post('/api/ai/infer-corrections', data));
  }

  // ==========================================
  // Field Mapping API
  // ==========================================

  async getMappings(): Promise<AutoMapResponse> {
    return retryWithBackoff(() => electronAPI.get('/api/mappings'));
  }

  async saveMapping(mapping: {
    mappings: Array<{ source_field: string; target_field: string }>;
  }): Promise<ApiStatus> {
    return retryWithBackoff(() => electronAPI.post('/api/mappings', mapping));
  }

  async autoMapFields(sourceFields: string[], targetSchema: string): Promise<AutoMapResponse> {
    return retryWithBackoff(() =>
      electronAPI.post('/api/auto-map', {
        source_fields: sourceFields,
        target_schema: targetSchema,
      })
    );
  }

  async suggestMapping(
    sourceField: string,
    entityName: string
  ): Promise<MappingSuggestionResponse> {
    return retryWithBackoff(() =>
      electronAPI.post('/api/mapping/suggest', {
        source_field: sourceField,
        entity_name: entityName,
      })
    );
  }

  async saveFieldMappings(
    mappings: Array<{ source_field: string; target_field: string }>
  ): Promise<ApiStatus> {
    return retryWithBackoff(() => electronAPI.post('/api/mapping/save', { mappings }));
  }

  // ==========================================
  // SFTP Management API
  // ==========================================

  async listSFTPCredentials(): Promise<SFTPCredentialsResponse> {
    const result = await retryWithBackoff(() => electronAPI.get('/api/sftp/credentials'));
    // Backend returns a raw array; normalize to expected wrapper shape
    if (Array.isArray(result)) {
      return { status: 'success', credentials: result };
    }
    return result as SFTPCredentialsResponse;
  }

  async createSFTPCredential(data: {
    name: string;
    host: string;
    port?: number;
    username: string;
    password: string;
    remote_path?: string;
  }): Promise<SFTPCredentialResponse> {
    return retryWithBackoff(() => electronAPI.post('/api/sftp/credentials', data));
  }

  async updateSFTPCredential(
    id: string,
    data: {
      name?: string;
      host?: string;
      port?: number;
      username?: string;
      password?: string;
      remote_path?: string;
    }
  ): Promise<SFTPCredentialResponse> {
    return retryWithBackoff(() => electronAPI.put(`/api/sftp/credentials/${id}`, data));
  }

  async deleteSFTPCredential(id: string): Promise<DeleteResponse> {
    return retryWithBackoff(() => electronAPI.delete(`/api/sftp/credentials/${id}`));
  }

  async testSFTPConnection(data: { credential_id: string }): Promise<SFTPConnectionTestResponse> {
    return retryWithBackoff(() => electronAPI.post(`/api/sftp/test/${data.credential_id}`, {}));
  }

  async browseSFTP(data: { credential_id: string; path?: string }): Promise<SFTPBrowseResponse> {
    const remotePath = encodeURIComponent(data.path ?? '/');
    return retryWithBackoff(() =>
      electronAPI.post(`/api/sftp/list/${data.credential_id}?remote_path=${remotePath}`, {})
    );
  }

  async downloadFromSFTP(data: {
    credential_id: string;
    remote_path: string;
  }): Promise<SFTPDownloadResponse> {
    const remotePath = encodeURIComponent(data.remote_path);
    return retryWithBackoff(() =>
      electronAPI.post(`/api/sftp/download/${data.credential_id}?remote_path=${remotePath}`, {})
    );
  }

  async uploadToSFTP(data: {
    credential_id: string;
    remote_path?: string;
    content: string;
    filename: string;
  }): Promise<SFTPUploadResponse> {
    return retryWithBackoff(() =>
      electronAPI.post(`/api/sftp/upload-content/${data.credential_id}`, {
        filename: data.filename,
        content: data.content,
        remote_path: data.remote_path,
      })
    );
  }
}
