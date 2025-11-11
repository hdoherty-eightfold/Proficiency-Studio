/**
 * API Service for SkillsProfGen Frontend
 * Handles all communication with the FastAPI backend
 */

const API_BASE_URL = 'http://localhost:8000';

// Session management
let sessionId = localStorage.getItem('skillsprofgen-session-id');
if (!sessionId) {
  sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('skillsprofgen-session-id', sessionId);
}

class ApiService {
  private baseUrl: string;
  private sessionId: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.sessionId = sessionId!;
  }

  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      'X-Session-ID': this.sessionId,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Health and status endpoints
  async getApiStatus() {
    return this.request('/api/status');
  }

  async getHealth() {
    return this.request('/health');
  }

  // API Keys management
  async getApiKeysStatus() {
    return this.request('/api/keys/status');
  }

  async updateApiKeys(keys: {
    openai?: string;
    anthropic?: string;
    google?: string;
    grok?: string;
  }) {
    return this.request('/api/keys/update', {
      method: 'POST',
      body: JSON.stringify(keys),
    });
  }

  async testApiKeys() {
    return this.request('/api/keys/test', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // Eightfold environment and authentication
  async getEnvironments() {
    return this.request('/api/environments');
  }

  async authenticateEightfold(credentials: {
    username: string;
    password: string;
    api_url?: string;
    grant_type?: string;
    auth_header?: string;
  }) {
    return this.request('/api/eightfold/authenticate', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  // Skills and assessment
  async getLatestSkills() {
    return this.request('/api/latest-skills');
  }

  async getMockSkills() {
    return this.request('/api/mock/skills');
  }

  async listAssessments(limit = 50) {
    return this.request(`/api/assessments/list?limit=${limit}`);
  }

  async assessSkillsProficiency(request: {
    skills: Array<{name: string; category?: string}>;
    provider?: string;
    model?: string;
    proficiency_levels?: string[];
    prompt_template?: string;
    batch_size?: number;
    concurrent_batches?: number;
    processing_mode?: string;
  }) {
    return this.request('/api/skills/assess-proficiencies', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Resume upload
  async uploadResume() {
    return this.request('/api/resume/upload', {
      method: 'POST',
    });
  }
}

export const apiService = new ApiService();
export default apiService;