/**
 * API Assessment
 * Proficiency assessment, history, analytics, and export methods.
 */

import { electronAPI } from './electron-api';
import { retryWithBackoff } from './api-core';
import { ApiWithSkills } from './api-skills';

import type {
  AssessmentResponse,
  AssessmentDetailResponse,
  AssessmentHistoryResponse,
  AssessmentCompareResponse,
  ExportResponse,
  AnalyticsOverviewResponse,
  ModelPerformanceResponse,
  VolumeDataResponse,
  TopSkillsResponse,
  ApiStatus,
  DeleteResponse,
} from '../types/api';

export class ApiWithAssessment extends ApiWithSkills {
  // ==========================================
  // Proficiency Assessment API
  // ==========================================

  async configureProficiency(config: {
    proficiency_levels: Array<{ level: number; name: string; description: string }>;
    llm_config: { provider: string; model: string; temperature?: number };
    prompt_template?: string;
  }): Promise<ApiStatus> {
    return retryWithBackoff(() => electronAPI.post('/api/proficiency/default-prompt', config));
  }

  async runAssessment(data: {
    skills: Array<{ name: string }>;
    llm_config: { provider: string; model: string };
    prompt_template?: string;
    proficiency_levels?: Array<{ level: number; name: string; description: string }>;
  }): Promise<AssessmentResponse> {
    return retryWithBackoff(() => electronAPI.post('/api/proficiency/assess', data));
  }

  async getAssessmentResults(id: string): Promise<AssessmentDetailResponse> {
    return retryWithBackoff(() => electronAPI.get(`/api/export/history/${id}`));
  }

  // ==========================================
  // Assessment History API
  // ==========================================

  async getAssessmentHistory(params?: {
    environment_name?: string;
    model_provider?: string;
    limit?: number;
  }): Promise<AssessmentHistoryResponse> {
    let url = '/api/export/history';
    const queryParams: string[] = [];
    if (params?.environment_name)
      queryParams.push(`environment_name=${encodeURIComponent(params.environment_name)}`);
    if (params?.model_provider)
      queryParams.push(`model_provider=${encodeURIComponent(params.model_provider)}`);
    if (params?.limit) queryParams.push(`limit=${params.limit}`);
    if (queryParams.length > 0) url += `?${queryParams.join('&')}`;
    return retryWithBackoff(() => electronAPI.get(url));
  }

  async getAssessmentDetail(assessmentId: string): Promise<AssessmentDetailResponse> {
    return retryWithBackoff(() => electronAPI.get(`/api/export/history/${assessmentId}`));
  }

  async deleteAssessment(assessmentId: string): Promise<DeleteResponse> {
    return retryWithBackoff(() =>
      electronAPI.delete(`/api/export/history/${assessmentId}?confirm=true`)
    );
  }

  async compareAssessments(assessmentIds: string[]): Promise<AssessmentCompareResponse> {
    return retryWithBackoff(() => electronAPI.post('/api/export/history/compare', assessmentIds));
  }

  async exportProficiencies(params: {
    assessment_id?: string;
    format: 'json' | 'csv' | 'xlsx';
    include_metadata?: boolean;
  }): Promise<ExportResponse> {
    return retryWithBackoff(() => electronAPI.post('/api/export/proficiencies', params));
  }

  // ==========================================
  // Export API
  // ==========================================

  async exportData(format: 'csv' | 'xml', data: unknown): Promise<ExportResponse> {
    const endpoint = format === 'csv' ? '/api/transform/export' : '/api/transform/export-xml';
    return retryWithBackoff(() => electronAPI.post(endpoint, data));
  }

  async exportAssessment(
    assessmentId: string,
    params: {
      format: 'json' | 'csv' | 'xlsx';
      include_metadata?: boolean;
      include_reasoning?: boolean;
      include_confidence?: boolean;
    }
  ): Promise<ExportResponse> {
    return retryWithBackoff(() =>
      electronAPI.post(`/api/export/assessment/${assessmentId}`, params)
    );
  }

  async exportBatch(
    batchId: string,
    params: {
      format: 'json' | 'csv' | 'xlsx';
      include_metadata?: boolean;
    }
  ): Promise<ExportResponse> {
    return retryWithBackoff(() => electronAPI.post(`/api/export/batch/${batchId}`, params));
  }

  async getExportHistory(): Promise<AssessmentHistoryResponse> {
    return retryWithBackoff(() => electronAPI.get('/api/export/history'));
  }

  // ==========================================
  // Analytics API
  // ==========================================

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
    return retryWithBackoff(() => electronAPI.get(url));
  }

  async getModelPerformance(): Promise<ModelPerformanceResponse> {
    return retryWithBackoff(() => electronAPI.get('/api/analytics/models'));
  }

  async getVolumeData(params?: {
    period?: 'day' | 'week' | 'month';
    days?: number;
  }): Promise<VolumeDataResponse> {
    let url = '/api/analytics/volume';
    const queryParams: string[] = [];
    if (params?.period) queryParams.push(`period=${params.period}`);
    if (params?.days) queryParams.push(`days=${params.days}`);
    if (queryParams.length > 0) url += `?${queryParams.join('&')}`;
    return retryWithBackoff(() => electronAPI.get(url));
  }

  async getTopSkills(params?: {
    limit?: number;
    environment_id?: string;
  }): Promise<TopSkillsResponse> {
    let url = '/api/analytics/top-skills';
    const queryParams: string[] = [];
    if (params?.limit) queryParams.push(`limit=${params.limit}`);
    if (params?.environment_id) queryParams.push(`environment_id=${params.environment_id}`);
    if (queryParams.length > 0) url += `?${queryParams.join('&')}`;
    return retryWithBackoff(() => electronAPI.get(url));
  }
}
