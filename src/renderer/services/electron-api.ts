/**
 * Electron API Service
 * Provides type-safe wrappers around Electron IPC calls
 */

class ElectronAPIService {
  /**
   * Make a GET request to the backend
   */
  async get<T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.api.get(endpoint, params) as Promise<T>;
  }

  /**
   * Make a POST request to the backend
   */
  async post<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.api.post(endpoint, data) as Promise<T>;
  }

  /**
   * Make a PUT request to the backend
   */
  async put<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.api.put(endpoint, data) as Promise<T>;
  }

  /**
   * Make a DELETE request to the backend
   */
  async delete<T = unknown>(endpoint: string): Promise<T> {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.api.delete(endpoint) as Promise<T>;
  }

  /**
   * Upload files to the backend
   */
  async upload<T = unknown>(endpoint: string, filePaths: string[]): Promise<T> {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.api.upload(endpoint, filePaths) as Promise<T>;
  }

  /**
   * Select a file using native dialog
   */
  async selectFile(options?: {
    title?: string;
    filters?: { name: string; extensions: string[] }[];
  }): Promise<string[] | undefined> {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.selectFile(options);
  }

  /**
   * Select a directory using native dialog
   */
  async selectDirectory(options?: { title?: string }): Promise<string | undefined> {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.selectDirectory(options);
  }

  /**
   * Read a file from the file system
   */
  async readFile(filePath: string): Promise<string> {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.readFile(filePath);
  }

  /**
   * Write a file to the file system
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.writeFile(filePath, content);
  }

  /**
   * Get a value from the store
   */
  async getStoreValue<T = unknown>(key: string): Promise<T> {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.store.get(key) as Promise<T>;
  }

  /**
   * Set a value in the store
   */
  async setStoreValue(key: string, value: unknown): Promise<void> {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.store.set(key, value);
  }

  /**
   * Check if running in Electron environment
   */
  get isElectron(): boolean {
    return typeof window !== 'undefined' && !!window.electron;
  }

  /**
   * Get platform information
   */
  get platform(): string {
    return window.electron?.platform || 'unknown';
  }

  /**
   * Get Electron version
   */
  get version(): string {
    return window.electron?.version || 'unknown';
  }

  /**
   * Start streaming assessment via SSE
   */
  async streamAssessment(data: Record<string, unknown>): Promise<{ streamId: string }> {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.api.streamAssessment(data);
  }

  /**
   * Cancel a streaming assessment
   */
  async cancelAssessment(streamId: string): Promise<{ success: boolean; error?: string }> {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.api.cancelAssessment(streamId);
  }

  /**
   * Listen for assessment streaming events
   * Returns a cleanup function to stop listening
   */
  onAssessmentEvent(callback: (event: { streamId: string; eventType: string; data: Record<string, unknown> }) => void): () => void {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.onAssessmentEvent(callback);
  }

  /**
   * Save assessment results to a JSON file
   */
  async saveAssessmentResults(data: Record<string, unknown>): Promise<{ success: boolean; filePath?: string; filename?: string; error?: string }> {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.assessmentStorage.saveResults(data);
  }

  /**
   * List previously saved assessment files
   */
  async listSavedAssessments(): Promise<{ success: boolean; assessments: Array<{ filename: string; saved_at: string; total_skills: number; avg_proficiency: number; model_used: string }>; error?: string }> {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.assessmentStorage.listSaved();
  }

  /**
   * Load a specific saved assessment by filename
   */
  async loadSavedAssessment(filename: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }
    return window.electron.assessmentStorage.loadSaved(filename);
  }
}

export const electronAPI = new ElectronAPIService();
