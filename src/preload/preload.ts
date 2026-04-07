import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
export type ElectronAPI = {
  // Window controls
  closeWindow: () => void;
  minimizeWindow: () => void;
  maximizeWindow: () => void;

  // Menu listeners
  onMenuAction: (callback: (channel: string, ...args: unknown[]) => void) => () => void;

  // API communication
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  send: (channel: string, ...args: unknown[]) => void;
  on: (
    channel: string,
    callback: (event: IpcRendererEvent, ...args: unknown[]) => void
  ) => () => void;

  // Store operations
  store: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<void>;
    delete: (key: string) => Promise<void>;
    clear: () => Promise<void>;
  };

  // Secure storage for credentials (encrypted)
  secureStorage: {
    storeCredential: (key: string, value: string) => Promise<{ success: boolean; secure: boolean }>;
    getCredential: (key: string) => Promise<string | null>;
    deleteCredential: (key: string) => Promise<{ success: boolean }>;
    isAvailable: () => Promise<boolean>;
  };

  // File operations
  selectFile: (options?: {
    title?: string;
    filters?: { name: string; extensions: string[] }[];
  }) => Promise<string[] | undefined>;
  selectDirectory: (options?: { title?: string }) => Promise<string | undefined>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<void>;
  isPathAllowed: (filePath: string) => Promise<boolean>;
  sanitizeFilename: (filename: string) => Promise<string>;

  // Backend API proxy
  api: {
    get: (endpoint: string, params?: Record<string, unknown>) => Promise<unknown>;
    post: (endpoint: string, data?: unknown) => Promise<unknown>;
    put: (endpoint: string, data?: unknown) => Promise<unknown>;
    delete: (endpoint: string) => Promise<unknown>;
    upload: (endpoint: string, filePaths: string[]) => Promise<unknown>;
    streamAssessment: (data: Record<string, unknown>) => Promise<{ streamId: string }>;
    cancelAssessment: (streamId: string) => Promise<{ success: boolean; error?: string }>;
  };

  // Assessment streaming events
  onAssessmentEvent: (
    callback: (event: {
      streamId: string;
      eventType: string;
      data: Record<string, unknown>;
    }) => void
  ) => () => void;

  // Backend status events (crash, startup failure)
  onBackendStatus: (callback: (status: { status: string; error?: string }) => void) => () => void;

  // Auto-updater events
  onUpdateReady: (callback: () => void) => () => void;

  // Assessment file storage
  assessmentStorage: {
    saveResults: (
      data: Record<string, unknown>
    ) => Promise<{ success: boolean; filePath?: string; filename?: string; error?: string }>;
    listSaved: () => Promise<{
      success: boolean;
      assessments: Array<{
        filename: string;
        saved_at: string;
        total_skills: number;
        avg_proficiency: number;
        avg_confidence: number;
        model_used: string;
        provider: string;
        processing_time: number;
        content_hash: string;
        extraction_source: string;
        source_filename: string;
        environment_name: string;
        total_tokens: number;
        estimated_cost: number;
        success_rate: number;
      }>;
      error?: string;
    }>;
    loadSaved: (filename: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
    deleteSaved: (filename: string) => Promise<{ success: boolean; error?: string }>;
  };

  // Score feedback storage (for calibration learning loop)
  feedback: {
    save: (item: {
      skill_name: string;
      original_score: number;
      corrected_score: number;
      model_used: string;
      note?: string;
    }) => Promise<{ success: boolean; filename?: string; error?: string }>;
    loadSkill: (
      skillName: string
    ) => Promise<{
      success: boolean;
      data: {
        skill_name: string;
        corrections: Array<{
          original_score: number;
          corrected_score: number;
          model_used: string;
          note: string;
          timestamp: string;
        }>;
      } | null;
      error?: string;
    }>;
    loadAll: () => Promise<{
      success: boolean;
      feedback: Array<{
        skill_name: string;
        corrections: Array<{
          original_score: number;
          corrected_score: number;
          model_used: string;
          note: string;
          timestamp: string;
        }>;
      }>;
      error?: string;
    }>;
  };

  // LLM operations
  llm: {
    testKey: (
      provider: string,
      apiKey: string,
      model?: string
    ) => Promise<{ valid: boolean; error?: string }>;
  };

  // Renderer → main process log bridge (so renderer logs appear in electron-log file)
  log: (level: 'info' | 'warn' | 'error' | 'debug', message: string, ...args: unknown[]) => void;

  // System info
  platform: string;
  version: string;
};

// Channel allowlists — prevents renderer code from invoking arbitrary IPC channels
const ALLOWED_INVOKE_CHANNELS = new Set([
  'store:get',
  'store:set',
  'store:delete',
  'store:clear',
  'secure:store-credential',
  'secure:get-credential',
  'secure:delete-credential',
  'secure:is-available',
  'dialog:select-file',
  'dialog:select-directory',
  'fs:read-file',
  'fs:write-file',
  'fs:is-path-allowed',
  'fs:sanitize-filename',
  'api:get',
  'api:post',
  'api:put',
  'api:delete',
  'api:upload',
  'api:stream-assessment',
  'api:cancel-assessment',
  'assessment:save-results',
  'assessment:list-saved',
  'assessment:load-saved',
  'assessment:delete-saved',
  'feedback:save',
  'feedback:load-skill',
  'feedback:load-all',
  'llm:test-key',
  'health:check',
  'health:status',
]);

const ALLOWED_SEND_CHANNELS = new Set([
  'window:close',
  'window:minimize',
  'window:maximize',
  'log:renderer',
]);

const ALLOWED_RECEIVE_CHANNELS = new Set([
  'assessment:event',
  'backend:status',
  'app:update-ready',
  'menu:new-project',
  'menu:open-project',
  'menu:settings',
  'menu:next-step',
  'menu:previous-step',
  'menu:goto-step',
  'menu:about',
]);

const electronAPI: ElectronAPI = {
  // Window controls
  closeWindow: () => ipcRenderer.send('window:close'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),

  // Menu listeners
  onMenuAction: (callback) => {
    const subscription = (_event: IpcRendererEvent, channel: string, ...args: unknown[]) => {
      callback(channel, ...args);
    };

    const channels = [
      'menu:new-project',
      'menu:open-project',
      'menu:settings',
      'menu:next-step',
      'menu:previous-step',
      'menu:goto-step',
      'menu:about',
    ];

    channels.forEach((channel) => {
      ipcRenderer.on(channel, subscription);
    });

    return () => {
      channels.forEach((channel) => {
        ipcRenderer.removeListener(channel, subscription);
      });
    };
  },

  // Generic IPC — allowlisted channels only
  invoke: (channel, ...args) => {
    if (!ALLOWED_INVOKE_CHANNELS.has(channel)) {
      return Promise.reject(new Error(`IPC channel not permitted: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  send: (channel, ...args) => {
    if (!ALLOWED_SEND_CHANNELS.has(channel)) {
      return;
    }
    ipcRenderer.send(channel, ...args);
  },
  on: (channel, callback) => {
    if (!ALLOWED_RECEIVE_CHANNELS.has(channel)) {
      return () => {};
    }
    ipcRenderer.on(channel, callback);
    return () => ipcRenderer.removeListener(channel, callback);
  },

  // Store operations
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key) => ipcRenderer.invoke('store:delete', key),
    clear: () => ipcRenderer.invoke('store:clear'),
  },

  // Secure storage for credentials (encrypted)
  secureStorage: {
    storeCredential: (key, value) => ipcRenderer.invoke('secure:store-credential', key, value),
    getCredential: (key) => ipcRenderer.invoke('secure:get-credential', key),
    deleteCredential: (key) => ipcRenderer.invoke('secure:delete-credential', key),
    isAvailable: () => ipcRenderer.invoke('secure:is-available'),
  },

  // File operations
  selectFile: (options) => ipcRenderer.invoke('dialog:select-file', options),
  selectDirectory: (options) => ipcRenderer.invoke('dialog:select-directory', options),
  readFile: (filePath) => ipcRenderer.invoke('fs:read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:write-file', filePath, content),
  isPathAllowed: (filePath) => ipcRenderer.invoke('fs:is-path-allowed', filePath),
  sanitizeFilename: (filename) => ipcRenderer.invoke('fs:sanitize-filename', filename),

  // Backend API proxy
  api: {
    get: (endpoint, params) => ipcRenderer.invoke('api:get', endpoint, params),
    post: (endpoint, data) => ipcRenderer.invoke('api:post', endpoint, data),
    put: (endpoint, data) => ipcRenderer.invoke('api:put', endpoint, data),
    delete: (endpoint) => ipcRenderer.invoke('api:delete', endpoint),
    upload: (endpoint, filePaths) => ipcRenderer.invoke('api:upload', endpoint, filePaths),
    streamAssessment: (data) => ipcRenderer.invoke('api:stream-assessment', data),
    cancelAssessment: (streamId) => ipcRenderer.invoke('api:cancel-assessment', streamId),
  },

  // Assessment file storage
  assessmentStorage: {
    saveResults: (data) => ipcRenderer.invoke('assessment:save-results', data),
    listSaved: () => ipcRenderer.invoke('assessment:list-saved'),
    loadSaved: (filename) => ipcRenderer.invoke('assessment:load-saved', filename),
    deleteSaved: (filename) => ipcRenderer.invoke('assessment:delete-saved', filename),
  },

  // Assessment streaming events
  onAssessmentEvent: (callback) => {
    const handler = (
      _event: IpcRendererEvent,
      eventData: { streamId: string; eventType: string; data: Record<string, unknown> }
    ) => {
      callback(eventData);
    };
    ipcRenderer.on('assessment:event', handler);
    return () => ipcRenderer.removeListener('assessment:event', handler);
  },

  // Backend status events
  onBackendStatus: (callback) => {
    const handler = (_event: IpcRendererEvent, data: { status: string; error?: string }) => {
      callback(data);
    };
    ipcRenderer.on('backend:status', handler);
    return () => ipcRenderer.removeListener('backend:status', handler);
  },

  // Auto-updater events
  onUpdateReady: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('app:update-ready', handler);
    return () => ipcRenderer.removeListener('app:update-ready', handler);
  },

  // Feedback storage
  feedback: {
    save: (item) => ipcRenderer.invoke('feedback:save', item),
    loadSkill: (skillName) => ipcRenderer.invoke('feedback:load-skill', skillName),
    loadAll: () => ipcRenderer.invoke('feedback:load-all'),
  },

  // LLM operations
  llm: {
    testKey: (provider, apiKey, model) =>
      ipcRenderer.invoke('llm:test-key', provider, apiKey, model),
  },

  // Renderer → main log bridge
  log: (level, message, ...args) => ipcRenderer.send('log:renderer', level, message, ...args),

  // System info
  platform: process.platform,
  version: process.versions.electron,
};

// Expose electronAPI to renderer
contextBridge.exposeInMainWorld('electron', electronAPI);

// Type declaration for TypeScript
declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
