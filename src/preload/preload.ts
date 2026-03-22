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
  on: (channel: string, callback: (event: IpcRendererEvent, ...args: unknown[]) => void) => () => void;

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
  selectFile: (options?: { title?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<string[] | undefined>;
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
  onAssessmentEvent: (callback: (event: { streamId: string; eventType: string; data: Record<string, unknown> }) => void) => () => void;

  // Assessment file storage
  assessmentStorage: {
    saveResults: (data: Record<string, unknown>) => Promise<{ success: boolean; filePath?: string; filename?: string; error?: string }>;
    listSaved: () => Promise<{ success: boolean; assessments: Array<{ filename: string; saved_at: string; total_skills: number; avg_proficiency: number; model_used: string }>; error?: string }>;
    loadSaved: (filename: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  };

  // LLM operations
  llm: {
    testKey: (provider: string, apiKey: string, model?: string) => Promise<{ valid: boolean; error?: string }>;
  };

  // System info
  platform: string;
  version: string;
};

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

    channels.forEach(channel => {
      ipcRenderer.on(channel, subscription);
    });

    return () => {
      channels.forEach(channel => {
        ipcRenderer.removeListener(channel, subscription);
      });
    };
  },

  // Generic IPC
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  on: (channel, callback) => {
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
  },

  // Assessment streaming events
  onAssessmentEvent: (callback) => {
    const handler = (_event: IpcRendererEvent, eventData: { streamId: string; eventType: string; data: Record<string, unknown> }) => {
      callback(eventData);
    };
    ipcRenderer.on('assessment:event', handler);
    return () => ipcRenderer.removeListener('assessment:event', handler);
  },

  // LLM operations
  llm: {
    testKey: (provider, apiKey, model) => ipcRenderer.invoke('llm:test-key', provider, apiKey, model),
  },

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
