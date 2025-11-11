/**
 * API Client Service
 * Central API communication for SkillsProfGen
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Health and status
  async getHealth() {
    return this.request('/api/health');
  }

  // Environment management
  async getEnvironments() {
    return this.request<{
      environments: Array<{
        id: string;
        name: string;
        url: string;
        description: string;
      }>;
    }>('/api/environments');
  }

  async selectEnvironment(envId: string) {
    return this.request(`/api/environments/${envId}`, {
      method: 'POST',
    });
  }

  // Authentication
  async testConnection(credentials: { username: string; password: string }) {
    return this.request('/api/auth/test-connection', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  // LLM Configuration
  async configureLLM(config: {
    providers: string[];
    apiKeys: Record<string, string>;
    parameters: Record<string, any>;
  }) {
    return this.request('/api/llm/configure', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async testApiKeys(keys: Record<string, string>) {
    return this.request('/api/llm/test-keys', {
      method: 'POST',
      body: JSON.stringify(keys),
    });
  }

  // Skills management
  async searchSkills(query: string) {
    return this.request<{
      skills: string[];
      total: number;
      query: string;
    }>(`/api/skills/search?query=${encodeURIComponent(query)}`);
  }

  async uploadSkills(skills: string[]) {
    return this.request('/api/skills/upload', {
      method: 'POST',
      body: JSON.stringify({ skills }),
    });
  }

  // Resume upload
  async uploadResumes(files: File[]) {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`file_${index}`, file);
    });

    return this.request('/api/resumes/upload', {
      method: 'POST',
      headers: {}, // Remove Content-Type to let browser set it for FormData
      body: formData,
    });
  }

  // Assessment execution
  async startAssessment(config: {
    skills: string[];
    resumes: string[];
    llmConfig: Record<string, any>;
    methods: string[];
  }) {
    return this.request<{
      status: string;
      assessment_id: string;
      message: string;
    }>('/api/assessment/start', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getAssessmentStatus(assessmentId: string) {
    return this.request<{
      assessment_id: string;
      status: string;
      progress: number;
      current_stage: string;
    }>(`/api/assessment/${assessmentId}/status`);
  }

  async getAssessmentResults(assessmentId: string) {
    return this.request<{
      assessment_id: string;
      results: any[];
      summary: {
        total_skills: number;
        avg_proficiency: number;
        completion_time: string;
      };
    }>(`/api/assessment/${assessmentId}/results`);
  }
}

export const apiClient = new ApiClient();
export default apiClient;