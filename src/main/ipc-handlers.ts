import { IpcMain, dialog, BrowserWindow, safeStorage, app } from 'electron';
import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import * as path from 'path';
import axios, { AxiosError } from 'axios';
import log from 'electron-log';
import { validateAndSanitizePath, isPathAllowed, sanitizeFilename } from './utils/path-validator.js';
import { randomUUID } from 'crypto';

// Maximum content size for file operations (50MB)
const MAX_CONTENT_SIZE = 50 * 1024 * 1024;

// API timeout in milliseconds (5 minutes for assessment calls)
const API_TIMEOUT = 300000;

// Health check cache
let backendHealthy = false;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

// Track active SSE connections for cancellation
const activeStreams = new Map<string, AbortController>();

// Module-level backend URL and client — set in setupIpcHandlers
let BACKEND_URL = 'http://127.0.0.1:8000';
let apiClient = axios.create({ baseURL: BACKEND_URL, timeout: API_TIMEOUT });

/**
 * Check if backend is healthy (with caching)
 */
async function checkBackendHealth(): Promise<boolean> {
  const now = Date.now();

  // Use cached result if recent
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL && backendHealthy) {
    return true;
  }

  try {
    const response = await axios.get(`${BACKEND_URL}/health`, {
      timeout: 5000
    });
    backendHealthy = response.data?.status === 'healthy' || response.status === 200;
    lastHealthCheck = now;
    return backendHealthy;
  } catch (error) {
    backendHealthy = false;
    lastHealthCheck = now;
    return false;
  }
}

/**
 * Format error message from API response
 */
function formatApiError(error: AxiosError<{ detail?: string | Array<{ msg?: string }> | { msg?: string } } | unknown>): string {
  // Connection refused
  if (error.code === 'ECONNREFUSED') {
    return 'Cannot connect to backend server. Please ensure the backend is running on ' + BACKEND_URL;
  }

  // Timeout
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
    return 'Request timed out. The server may be overloaded or unavailable.';
  }

  // Network error
  if (error.code === 'ERR_NETWORK') {
    return 'Network error. Please check your connection.';
  }

  // API response error
  const data = error.response?.data;
  const detail = data && typeof data === 'object' && 'detail' in data ? (data as Record<string, unknown>).detail : undefined;
  if (Array.isArray(detail)) {
    return detail.map((e: Record<string, unknown>) => e.msg || JSON.stringify(e)).join('; ');
  } else if (typeof detail === 'object' && detail !== null) {
    return (detail as Record<string, unknown>).msg as string || JSON.stringify(detail);
  } else if (detail) {
    return String(detail);
  }

  return error.message || 'An unexpected error occurred';
}

interface SimpleStore {
  get(key: string, defaultValue?: unknown): unknown;
  set(key: string, value: unknown): void;
  delete(key: string): void;
  clear(): void;
}

export function setupIpcHandlers(ipcMain: IpcMain, store: SimpleStore, backendUrl?: string): void {
  // Configure backend URL and API client
  if (backendUrl) {
    BACKEND_URL = backendUrl;
    apiClient = axios.create({ baseURL: BACKEND_URL, timeout: API_TIMEOUT });
  }
  log.info('Setting up IPC handlers, backend URL:', BACKEND_URL);

  // Window controls
  ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  // Store operations
  ipcMain.handle('store:get', (_, key: string) => {
    return store.get(key);
  });

  ipcMain.handle('store:set', (_, key: string, value: unknown) => {
    store.set(key, value);
  });

  ipcMain.handle('store:delete', (_, key: string) => {
    store.delete(key);
  });

  ipcMain.handle('store:clear', () => {
    store.clear();
  });

  // Secure storage operations using Electron's safeStorage
  ipcMain.handle('secure:store-credential', async (_, key: string, value: string) => {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        log.warn('Secure storage not available, falling back to regular storage');
        // Fall back to regular storage with a warning
        store.set(`credentials.${key}`, value);
        return { success: true, secure: false };
      }

      const encrypted = safeStorage.encryptString(value);
      store.set(`credentials.${key}`, encrypted.toString('base64'));
      return { success: true, secure: true };
    } catch (error) {
      log.error('Error storing credential:', error);
      throw new Error('Failed to store credential securely');
    }
  });

  ipcMain.handle('secure:get-credential', async (_, key: string) => {
    try {
      const stored = store.get(`credentials.${key}`) as string | undefined;
      if (!stored) return null;

      if (!safeStorage.isEncryptionAvailable()) {
        // If encryption not available, assume stored as plain text
        return stored;
      }

      try {
        const buffer = Buffer.from(stored, 'base64');
        return safeStorage.decryptString(buffer);
      } catch {
        // If decryption fails, it might be stored as plain text
        return stored;
      }
    } catch (error) {
      log.error('Error retrieving credential:', error);
      return null;
    }
  });

  ipcMain.handle('secure:delete-credential', async (_, key: string) => {
    try {
      store.delete(`credentials.${key}`);
      return { success: true };
    } catch (error) {
      log.error('Error deleting credential:', error);
      throw new Error('Failed to delete credential');
    }
  });

  ipcMain.handle('secure:is-available', async () => {
    return safeStorage.isEncryptionAvailable();
  });

  // File dialogs
  ipcMain.handle('dialog:select-file', async (event, options) => {
    const win= BrowserWindow.fromWebContents(event.sender);
    if (!win) return undefined;

    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile', 'multiSelections'],
      ...options,
    });

    return result.canceled ? undefined : result.filePaths;
  });

  ipcMain.handle('dialog:select-directory', async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return undefined;

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      ...options,
    });

    return result.canceled ? undefined : result.filePaths[0];
  });

  // File system operations with path validation
  ipcMain.handle('fs:read-file', async (_, filePath: string) => {
    try {
      // Validate the path before reading
      const validatedPath = await validateAndSanitizePath(filePath);
      const content = await readFile(validatedPath, 'utf-8');
      return content;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to read file';
      log.error('Error reading file:', message);
      throw new Error(message);
    }
  });

  ipcMain.handle('fs:write-file', async (_, filePath: string, content: string) => {
    try {
      // Validate the path before writing
      const validatedPath = await validateAndSanitizePath(filePath);

      // Validate content size to prevent DoS
      if (content.length > MAX_CONTENT_SIZE) {
        throw new Error(`Content exceeds maximum allowed size (${MAX_CONTENT_SIZE / 1024 / 1024}MB)`);
      }

      await writeFile(validatedPath, content, 'utf-8');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to write file';
      log.error('Error writing file:', message);
      throw new Error(message);
    }
  });

  ipcMain.handle('fs:is-path-allowed', async (_, filePath: string) => {
    return isPathAllowed(filePath);
  });

  ipcMain.handle('fs:sanitize-filename', async (_, filename: string) => {
    return sanitizeFilename(filename);
  });

  // Backend health check endpoint
  ipcMain.handle('api:health-check', async () => {
    const isHealthy = await checkBackendHealth();
    return {
      healthy: isHealthy,
      backendUrl: BACKEND_URL,
      lastChecked: new Date(lastHealthCheck).toISOString()
    };
  });

  // Backend API proxy with health check and timeouts
  ipcMain.handle('api:get', async (_, endpoint: string, params?: Record<string, unknown>) => {
    try {
      log.info(`API GET: ${endpoint}`, params);
      const response = await apiClient.get(endpoint, { params });
      return response.data;
    } catch (error: unknown) {
      const axiosErr = error as AxiosError;
      log.error(`API GET error: ${endpoint}`, axiosErr.message);
      throw new Error(formatApiError(axiosErr));
    }
  });

  ipcMain.handle('api:post', async (_, endpoint: string, data?: unknown) => {
    try {
      log.info(`API POST: ${endpoint}`);
      const response = await apiClient.post(endpoint, data);
      return response.data;
    } catch (error: unknown) {
      const axiosErr = error as AxiosError;
      log.error(`API POST error: ${endpoint}`, axiosErr.message);
      throw new Error(formatApiError(axiosErr));
    }
  });

  ipcMain.handle('api:put', async (_, endpoint: string, data?: unknown) => {
    try {
      log.info(`API PUT: ${endpoint}`);
      const response = await apiClient.put(endpoint, data);
      return response.data;
    } catch (error: unknown) {
      const axiosErr = error as AxiosError;
      log.error(`API PUT error: ${endpoint}`, axiosErr.message);
      throw new Error(formatApiError(axiosErr));
    }
  });

  ipcMain.handle('api:delete', async (_, endpoint: string) => {
    try {
      log.info(`API DELETE: ${endpoint}`);
      const response = await apiClient.delete(endpoint);
      return response.data;
    } catch (error: unknown) {
      const axiosErr = error as AxiosError;
      log.error(`API DELETE error: ${endpoint}`, axiosErr.message);
      throw new Error(formatApiError(axiosErr));
    }
  });

  // File upload with proper handling for Electron
  ipcMain.handle('api:upload', async (_, endpoint: string, filePaths: string[]) => {
    try {
      log.info(`API UPLOAD: ${endpoint}`, filePaths.length, 'files');

      // Use form-data package for Node.js file uploads
      const FormData = require('form-data');
      const formData = new FormData();

      // Read files from disk and append to form data (with path validation)
      for (const filePath of filePaths) {
        try {
          const validatedPath = await validateAndSanitizePath(filePath);
          const fileBuffer = await readFile(validatedPath);
          const fileName = sanitizeFilename(path.basename(validatedPath));
          formData.append('files', fileBuffer, { filename: fileName });
        } catch (fileError: unknown) {
          const message = fileError instanceof Error ? fileError.message : 'Unknown error';
          log.error(`Error reading file ${filePath}:`, message);
          throw new Error(`Failed to read file: ${path.basename(filePath)}`);
        }
      }

      const response = await apiClient.post(endpoint, formData, {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 120000 // 2 minutes for uploads
      });

      return response.data;
    } catch (error: unknown) {
      const axiosErr = error as AxiosError;
      log.error(`API UPLOAD error: ${endpoint}`, axiosErr.message);
      throw new Error(formatApiError(axiosErr));
    }
  });

  // Direct API key testing (bypasses backend, tests directly with provider)
  ipcMain.handle('llm:test-key', async (_, provider: string, apiKey: string, model?: string) => {
    try {
      log.info(`Testing API key for provider: ${provider}`);

      switch (provider) {
        case 'google': {
          const modelToTest = model || 'gemini-3.1-flash-lite-preview';
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTest}:generateContent?key=${apiKey}`;
          await axios.post(url, {
            contents: [{ parts: [{ text: 'Hello' }] }],
            generationConfig: { maxOutputTokens: 5 }
          });
          return { valid: true };
        }
        case 'kimi': {
          const kimiBaseUrl = process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1';
          await axios.post(`${kimiBaseUrl}/chat/completions`, {
            model: model || 'kimi-k2.5',
            max_tokens: 5,
            messages: [{ role: 'user', content: 'Hi' }]
          }, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          return { valid: true };
        }
        default:
          return { valid: false, error: `Unknown provider: ${provider}` };
      }
    } catch (error: unknown) {
      const axiosErr = error as AxiosError<{ error?: { message?: string } | string }>;
      log.error(`API key test error for ${provider}:`, axiosErr.message);
      const responseError = axiosErr.response?.data?.error;
      const errorMessage = (typeof responseError === 'object' && responseError !== null ? responseError.message : responseError as string) ||
                          axiosErr.message ||
                          'Unknown error';
      return { valid: false, error: errorMessage };
    }
  });

  // Streaming assessment handler using SSE
  ipcMain.handle('api:stream-assessment', async (event, requestData: Record<string, unknown>) => {
    const streamId = randomUUID();
    const abortController = new AbortController();
    activeStreams.set(streamId, abortController);

    const webContents = event.sender;

    log.info(`Starting streaming assessment: ${streamId}, skills: ${Array.isArray(requestData.skills) ? requestData.skills.length : 'N/A'}`);

    // Auto-cleanup after 10 minutes to prevent memory leaks
    const streamTimeout = setTimeout(() => {
      if (activeStreams.has(streamId)) {
        log.warn(`Stream ${streamId} timed out after 10 minutes, aborting`);
        abortController.abort();
        activeStreams.delete(streamId);
      }
    }, 10 * 60 * 1000);

    // Start the stream processing in the background
    (async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/proficiency/assess/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
          signal: abortController.signal
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          if (webContents.isDestroyed()) {
            log.info(`WebContents destroyed, aborting stream: ${streamId}`);
            abortController.abort();
            break;
          }

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const eventBlock of events) {
            if (!eventBlock.trim()) continue;

            // Parse SSE format: event: type\ndata: json
            const lines = eventBlock.split('\n');
            let eventType = 'message';
            let eventData = '';

            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                eventData = line.slice(5).trim();
              }
            }

            if (eventData) {
              try {
                const parsedData = JSON.parse(eventData);
                if (eventType === 'complete') {
                  const summary = parsedData.summary || parsedData;
                  log.info(`Assessment complete: ${(summary.assessments as unknown[])?.length || 0} results, status=${summary.status}, failed=${summary.failed_assessments}`);
                  if (summary.failed_assessments > 0) {
                    log.warn(`Failed skills sample: ${JSON.stringify((summary.failed_skills as string[])?.slice(0, 3))}`);
                  }
                }
                if (!webContents.isDestroyed()) {
                  webContents.send('assessment:event', { streamId, eventType, data: parsedData });
                }
              } catch (parseError) {
                log.warn('Failed to parse SSE data:', eventData);
              }
            }
          }
        }

        if (!webContents.isDestroyed()) {
          webContents.send('assessment:event', { streamId, eventType: 'done', data: {} });
        }
        log.info(`Streaming assessment completed: ${streamId}`);

      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          log.info(`Streaming assessment cancelled: ${streamId}`);
          if (!webContents.isDestroyed()) {
            webContents.send('assessment:event', { streamId, eventType: 'cancelled', data: {} });
          }
        } else {
          const message = err instanceof Error ? err.message : 'Unknown streaming error';
          log.error(`Streaming assessment error: ${streamId}`, message);
          if (!webContents.isDestroyed()) {
            webContents.send('assessment:event', { streamId, eventType: 'error', data: { error: message } });
          }
        }
      } finally {
        clearTimeout(streamTimeout);
        activeStreams.delete(streamId);
      }
    })();

    return { streamId };
  });

  // Cancel streaming assessment
  ipcMain.handle('api:cancel-assessment', async (_, streamId: string) => {
    const controller = activeStreams.get(streamId);
    if (controller) {
      log.info(`Cancelling streaming assessment: ${streamId}`);
      controller.abort();
      activeStreams.delete(streamId);
      return { success: true };
    }
    return { success: false, error: 'Stream not found' };
  });

  // ==========================================
  // Assessment Results File Storage
  // ==========================================

  const getAssessmentsDir = async (): Promise<string> => {
    const dir = path.join(app.getPath('userData'), 'assessments');
    await mkdir(dir, { recursive: true });
    return dir;
  };

  // Save assessment results to a JSON file
  ipcMain.handle('assessment:save-results', async (_, data: Record<string, unknown>) => {
    try {
      const dir = await getAssessmentsDir();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `assessment_${timestamp}.json`;
      const filePath = path.join(dir, filename);

      const payload = {
        saved_at: new Date().toISOString(),
        ...data
      };

      await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
      log.info(`Assessment results saved to: ${filePath}`);
      return { success: true, filePath, filename };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error('Failed to save assessment results:', message);
      return { success: false, error: message };
    }
  });

  // List saved assessment files
  ipcMain.handle('assessment:list-saved', async () => {
    try {
      const dir = await getAssessmentsDir();
      const files = await readdir(dir);
      const jsonFiles = files
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse(); // newest first

      const results = [];
      for (const filename of jsonFiles) {
        try {
          const content = await readFile(path.join(dir, filename), 'utf-8');
          const parsed = JSON.parse(content);
          results.push({
            filename,
            saved_at: parsed.saved_at,
            total_skills: parsed.results?.total_skills || 0,
            avg_proficiency: parsed.results?.avg_proficiency || 0,
            model_used: parsed.results?.model_used || 'unknown',
          });
        } catch {
          // Skip malformed files
        }
      }
      return { success: true, assessments: results };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message, assessments: [] };
    }
  });

  // Load a specific saved assessment
  ipcMain.handle('assessment:load-saved', async (_, filename: string) => {
    try {
      const dir = await getAssessmentsDir();
      const safeName = sanitizeFilename(filename);
      const filePath = path.join(dir, safeName);
      const content = await readFile(filePath, 'utf-8');
      return { success: true, data: JSON.parse(content) };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  log.info('IPC handlers setup complete');
}
