/**
 * Tests for API Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api';
import { electronAPI } from './electron-api';
import { createSkills, createAssessmentSummaries, createEnvironments, createSuccessResponse } from '../test/factories';

// Mock the electron-api module
vi.mock('./electron-api', () => ({
  electronAPI: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  },
}));

describe('APIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('healthCheck', () => {
    it('should call GET /health and return response', async () => {
      vi.mocked(electronAPI.get).mockResolvedValue({ status: 'healthy' });

      const result = await api.healthCheck();

      expect(electronAPI.get).toHaveBeenCalledWith('/health');
      expect(result.status).toBe('healthy');
    });
  });

  describe('extractSkills', () => {
    it('should POST to /api/skills/extract with file data', async () => {
      const mockResponse = createSuccessResponse({
        skills: createSkills(5),
        total_count: 5,
        file_id: 'file_123',
      });
      vi.mocked(electronAPI.post).mockResolvedValue(mockResponse);

      const result = await api.extractSkills({
        filename: 'test.csv',
        file_content: 'name,category\nTypeScript,Programming',
      });

      expect(electronAPI.post).toHaveBeenCalledWith('/api/skills/extract', {
        filename: 'test.csv',
        file_content: 'name,category\nTypeScript,Programming',
      });
      expect(result.skills).toHaveLength(5);
    });
  });

  describe('getSkills', () => {
    it('should GET skills list', async () => {
      const mockResponse = createSuccessResponse({
        skills: createSkills(10),
        total_count: 10,
      });
      vi.mocked(electronAPI.get).mockResolvedValue(mockResponse);

      const result = await api.getSkills();

      expect(electronAPI.get).toHaveBeenCalledWith('/api/skills');
      expect(result.skills).toHaveLength(10);
    });
  });

  describe('runAssessment', () => {
    it('should POST assessment request with skills and config', async () => {
      vi.mocked(electronAPI.post).mockResolvedValue({
        status: 'success',
        assessments: [],
        total_skills: 5,
        processing_time_seconds: 10.5,
        llm_provider: 'google',
        llm_model: 'gemini-3.1-flash-lite-preview',
        timestamp: new Date().toISOString(),
      });

      const result = await api.runAssessment({
        skills: [{ name: 'TypeScript' }, { name: 'React' }],
        llm_config: { provider: 'google', model: 'gemini-3.1-flash-lite-preview' },
      });

      expect(electronAPI.post).toHaveBeenCalledWith('/api/proficiency/assess', {
        skills: [{ name: 'TypeScript' }, { name: 'React' }],
        llm_config: { provider: 'google', model: 'gemini-3.1-flash-lite-preview' },
      });
      expect(result.status).toBe('success');
    });
  });

  describe('getEnvironments', () => {
    it('should GET environments list', async () => {
      const mockResponse = createSuccessResponse({
        environments: createEnvironments(3),
      });
      vi.mocked(electronAPI.get).mockResolvedValue(mockResponse);

      const result = await api.getEnvironments();

      expect(electronAPI.get).toHaveBeenCalledWith('/api/environments');
      expect(result.environments).toHaveLength(3);
    });
  });

  describe('createEnvironment', () => {
    it('should POST new environment', async () => {
      vi.mocked(electronAPI.post).mockResolvedValue({
        status: 'success',
        environment: {
          id: 'env_1',
          name: 'Test Environment',
          base_url: 'https://test.example.com',
        },
      });

      const result = await api.createEnvironment({
        name: 'Test Environment',
        base_url: 'https://test.example.com',
      });

      expect(electronAPI.post).toHaveBeenCalledWith('/api/environments', {
        name: 'Test Environment',
        base_url: 'https://test.example.com',
      });
      expect(result.status).toBe('success');
    });
  });

  describe('updateEnvironment', () => {
    it('should PUT updated environment', async () => {
      vi.mocked(electronAPI.put).mockResolvedValue({
        status: 'success',
        environment: { id: 'env_1', name: 'Updated Name', base_url: 'https://test.example.com' },
      });

      const result = await api.updateEnvironment('env_1', { name: 'Updated Name' });

      expect(electronAPI.put).toHaveBeenCalledWith('/api/environments/env_1', { name: 'Updated Name' });
      expect(result.status).toBe('success');
    });
  });

  describe('deleteEnvironment', () => {
    it('should DELETE environment', async () => {
      vi.mocked(electronAPI.delete).mockResolvedValue({ status: 'success', deleted: true });

      const result = await api.deleteEnvironment('env_1');

      expect(electronAPI.delete).toHaveBeenCalledWith('/api/environments/env_1');
      expect(result.deleted).toBe(true);
    });
  });

  describe('getAssessmentHistory', () => {
    it('should GET history with no filters', async () => {
      const mockResponse = createSuccessResponse({
        assessments: createAssessmentSummaries(5),
        total_count: 5,
      });
      vi.mocked(electronAPI.get).mockResolvedValue(mockResponse);

      const result = await api.getAssessmentHistory();

      expect(electronAPI.get).toHaveBeenCalledWith('/api/export/history');
      expect(result.assessments).toHaveLength(5);
    });

    it('should GET history with filters', async () => {
      vi.mocked(electronAPI.get).mockResolvedValue({ assessments: [] });

      await api.getAssessmentHistory({
        environment_name: 'Production',
        model_provider: 'google',
        limit: 10,
      });

      expect(electronAPI.get).toHaveBeenCalledWith(
        '/api/export/history?environment_name=Production&model_provider=google&limit=10'
      );
    });
  });

  describe('getAssessmentDetail', () => {
    it('should GET assessment by ID', async () => {
      vi.mocked(electronAPI.get).mockResolvedValue({
        status: 'success',
        assessment: { id: 'assessment_1' },
      });

      const result = await api.getAssessmentDetail('assessment_1');

      expect(electronAPI.get).toHaveBeenCalledWith('/api/export/history/assessment_1');
      expect(result.assessment.id).toBe('assessment_1');
    });
  });

  describe('deleteAssessment', () => {
    it('should DELETE assessment with confirm param', async () => {
      vi.mocked(electronAPI.delete).mockResolvedValue({ status: 'success', deleted: true });

      await api.deleteAssessment('assessment_1');

      expect(electronAPI.delete).toHaveBeenCalledWith('/api/export/history/assessment_1?confirm=true');
    });
  });

  describe('compareAssessments', () => {
    it('should POST assessment IDs for comparison', async () => {
      vi.mocked(electronAPI.post).mockResolvedValue({
        status: 'success',
        assessments: [],
        common_skills: [],
      });

      await api.compareAssessments(['a1', 'a2', 'a3']);

      expect(electronAPI.post).toHaveBeenCalledWith('/api/export/history/compare', ['a1', 'a2', 'a3']);
    });
  });

  describe('getFilePreview', () => {
    it('should GET file data with default sample size', async () => {
      vi.mocked(electronAPI.get).mockResolvedValue({
        status: 'success',
        data: [],
        columns: [],
        total_rows: 0,
      });

      await api.getFilePreview('file_1');

      expect(electronAPI.get).toHaveBeenCalledWith('/api/transform/file-data/file_1?sample_size=1000');
    });

    it('should GET file data with custom sample size', async () => {
      vi.mocked(electronAPI.get).mockResolvedValue({ status: 'success', data: [] });

      await api.getFilePreview('file_1', 500);

      expect(electronAPI.get).toHaveBeenCalledWith('/api/transform/file-data/file_1?sample_size=500');
    });
  });

  describe('updateCellValue', () => {
    it('should POST cell update', async () => {
      vi.mocked(electronAPI.post).mockResolvedValue({
        status: 'success',
        updated_row: { id: 1, name: 'Updated' },
      });

      const result = await api.updateCellValue({
        file_id: 'file_1',
        row_index: 0,
        column_name: 'name',
        new_value: 'Updated',
      });

      expect(electronAPI.post).toHaveBeenCalledWith('/api/transform/update-cell', {
        file_id: 'file_1',
        row_index: 0,
        column_name: 'name',
        new_value: 'Updated',
      });
      expect(result.status).toBe('success');
    });
  });

  describe('SFTP operations', () => {
    it('should list SFTP credentials', async () => {
      vi.mocked(electronAPI.get).mockResolvedValue({
        status: 'success',
        credentials: [],
      });

      const result = await api.listSFTPCredentials();

      expect(electronAPI.get).toHaveBeenCalledWith('/api/sftp/credentials');
      expect(result.credentials).toBeDefined();
    });

    it('should test SFTP connection', async () => {
      vi.mocked(electronAPI.post).mockResolvedValue({
        status: 'success',
        connected: true,
        latency_ms: 150,
      });

      const result = await api.testSFTPConnection({ credential_id: 'sftp_1' });

      expect(electronAPI.post).toHaveBeenCalledWith('/api/sftp/test-connection', { credential_id: 'sftp_1' });
      expect(result.connected).toBe(true);
    });

    it('should browse SFTP directory', async () => {
      vi.mocked(electronAPI.post).mockResolvedValue({
        status: 'success',
        path: '/uploads',
        items: [],
      });

      const result = await api.browseSFTP({ credential_id: 'sftp_1', path: '/uploads' });

      expect(electronAPI.post).toHaveBeenCalledWith('/api/sftp/browse', {
        credential_id: 'sftp_1',
        path: '/uploads',
      });
      expect(result.path).toBe('/uploads');
    });
  });

  describe('Analytics operations', () => {
    it('should get analytics overview', async () => {
      vi.mocked(electronAPI.get).mockResolvedValue({
        status: 'success',
        total_assessments: 100,
      });

      const result = await api.getAnalyticsOverview();

      expect(electronAPI.get).toHaveBeenCalledWith('/api/analytics/overview');
      expect(result.total_assessments).toBe(100);
    });

    it('should get analytics with date filters', async () => {
      vi.mocked(electronAPI.get).mockResolvedValue({ status: 'success' });

      await api.getAnalyticsOverview({
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        environment_id: 'env_1',
      });

      expect(electronAPI.get).toHaveBeenCalledWith(
        '/api/analytics/overview?start_date=2024-01-01&end_date=2024-12-31&environment_id=env_1'
      );
    });

    it('should get top skills', async () => {
      vi.mocked(electronAPI.get).mockResolvedValue({
        status: 'success',
        skills: [],
      });

      await api.getTopSkills({ limit: 20 });

      expect(electronAPI.get).toHaveBeenCalledWith('/api/analytics/top-skills?limit=20');
    });
  });

  describe('LLM operations', () => {
    it('should test LLM key', async () => {
      vi.mocked(electronAPI.post).mockResolvedValue({
        status: 'success',
        valid: true,
        provider: 'google',
      });

      const result = await api.testLLMKey('google', 'AIzaSyTest123');

      expect(electronAPI.post).toHaveBeenCalledWith('/api/llm/test-key', {
        provider: 'google',
        api_key: 'AIzaSyTest123',
      });
      expect(result.valid).toBe(true);
    });

    it('should get LLM providers', async () => {
      vi.mocked(electronAPI.get).mockResolvedValue({
        status: 'success',
        providers: [],
      });

      const result = await api.getLLMProviders();

      expect(electronAPI.get).toHaveBeenCalledWith('/api/llm/providers');
      expect(result.providers).toBeDefined();
    });
  });

  describe('Configuration operations', () => {
    it('should list configurations', async () => {
      vi.mocked(electronAPI.get).mockResolvedValue({
        status: 'success',
        configurations: [],
      });

      const result = await api.listConfigurations();

      expect(electronAPI.get).toHaveBeenCalledWith('/api/configurations');
      expect(result.configurations).toBeDefined();
    });

    it('should create configuration', async () => {
      vi.mocked(electronAPI.post).mockResolvedValue({
        status: 'success',
        configuration: { id: 'config_1' },
      });

      await api.createConfiguration({
        name: 'Test Config',
        proficiency_levels: [{ level: 1, name: 'Novice', description: 'Beginning level' }],
      });

      expect(electronAPI.post).toHaveBeenCalledWith('/api/configurations', expect.objectContaining({
        name: 'Test Config',
      }));
    });

    it('should clone configuration', async () => {
      vi.mocked(electronAPI.post).mockResolvedValue({
        status: 'success',
        configuration: { id: 'config_2' },
      });

      await api.cloneConfiguration('config_1');

      expect(electronAPI.post).toHaveBeenCalledWith('/api/configurations/config_1/clone', {});
    });
  });
});
