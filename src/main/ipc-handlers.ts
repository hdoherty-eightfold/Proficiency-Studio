import { IpcMain, dialog, BrowserWindow, safeStorage, app } from 'electron';
import { readFile, writeFile, readdir, mkdir, unlink } from 'fs/promises';
import { createHash, randomUUID } from 'crypto';
import * as path from 'path';
import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import log from 'electron-log';
import {
  validateAndSanitizePath,
  isPathAllowed,
  sanitizeFilename,
} from './utils/path-validator.js';

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

// Allowlist of permitted store keys — prevents arbitrary data injection via renderer
const ALLOWED_STORE_KEYS = new Set([
  'theme',
  'sidebarCollapsed',
  'currentStep',
  'completedSteps',
  'windowBounds',
  'lastUsedProvider',
  'lastUsedModel',
  'connectedEnvironment',
  'assessmentConfig',
]);

// Maximum SSE chunk buffer size (prevent memory exhaustion on malformed streams)
const MAX_SSE_BUFFER_SIZE = 1024 * 1024; // 1MB

/**
 * Validate that a backend API endpoint is safe to proxy.
 * Allows only relative paths starting with '/' and rejects path traversal.
 */
function validateEndpoint(endpoint: string): void {
  if (
    typeof endpoint !== 'string' ||
    !endpoint.startsWith('/') ||
    endpoint.includes('..') ||
    /[\r\n]/.test(endpoint)
  ) {
    throw new Error(`Invalid API endpoint: ${endpoint}`);
  }
}

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
      timeout: 5000,
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
function formatApiError(
  error: AxiosError<{ detail?: string | Array<{ msg?: string }> | { msg?: string } } | unknown>
): string {
  // Connection refused
  if (error.code === 'ECONNREFUSED') {
    return (
      'Cannot connect to backend server. Please ensure the backend is running on ' + BACKEND_URL
    );
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
  const detail =
    data && typeof data === 'object' && 'detail' in data
      ? (data as Record<string, unknown>).detail
      : undefined;
  if (Array.isArray(detail)) {
    return detail.map((e: Record<string, unknown>) => e.msg || JSON.stringify(e)).join('; ');
  } else if (typeof detail === 'object' && detail !== null) {
    return ((detail as Record<string, unknown>).msg as string) || JSON.stringify(detail);
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

  // Renderer → main log bridge: forwards renderer console.* to electron-log file
  ipcMain.on(
    'log:renderer',
    (_event, level: 'info' | 'warn' | 'error' | 'debug', message: string, ...args: unknown[]) => {
      const logFn = log[level] ?? log.info;
      logFn('[renderer]', message, ...args);
    }
  );

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
    if (typeof key !== 'string' || !ALLOWED_STORE_KEYS.has(key)) {
      log.warn(`store:set rejected for key: ${key}`);
      throw new Error(`Store key not permitted: ${key}`);
    }
    store.set(key, value);
  });

  ipcMain.handle('store:delete', (_, key: string) => {
    if (typeof key !== 'string' || !ALLOWED_STORE_KEYS.has(key)) {
      log.warn(`store:delete rejected for key: ${key}`);
      throw new Error(`Store key not permitted: ${key}`);
    }
    store.delete(key);
  });

  ipcMain.handle('store:clear', () => {
    log.warn('store:clear called — wiping all persisted settings');
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
    const win = BrowserWindow.fromWebContents(event.sender);
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
        throw new Error(
          `Content exceeds maximum allowed size (${MAX_CONTENT_SIZE / 1024 / 1024}MB)`
        );
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
  ipcMain.handle('health:check', async () => {
    const isHealthy = await checkBackendHealth();
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      healthy: isHealthy,
      backendUrl: BACKEND_URL,
      timestamp: new Date(lastHealthCheck).toISOString(),
      lastChecked: new Date(lastHealthCheck).toISOString(),
    };
  });

  // Backend API proxy with health check and timeouts
  ipcMain.handle('api:get', async (_, endpoint: string, params?: Record<string, unknown>) => {
    try {
      validateEndpoint(endpoint);
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
      validateEndpoint(endpoint);
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
      validateEndpoint(endpoint);
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
      validateEndpoint(endpoint);
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
        timeout: 120000, // 2 minutes for uploads
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
            generationConfig: { maxOutputTokens: 5 },
          });
          return { valid: true };
        }
        case 'kimi': {
          const kimiBaseUrl = process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1';
          await axios.post(
            `${kimiBaseUrl}/chat/completions`,
            {
              model: model || 'kimi-k2.5',
              max_tokens: 5,
              messages: [{ role: 'user', content: 'Hi' }],
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
            }
          );
          return { valid: true };
        }
        default:
          return { valid: false, error: `Unknown provider: ${provider}` };
      }
    } catch (error: unknown) {
      const axiosErr = error as AxiosError<{ error?: { message?: string } | string }>;
      log.error(`API key test error for ${provider}:`, axiosErr.message);
      const responseError = axiosErr.response?.data?.error;
      const errorMessage =
        (typeof responseError === 'object' && responseError !== null
          ? responseError.message
          : (responseError as string)) ||
        axiosErr.message ||
        'Unknown error';
      return { valid: false, error: errorMessage };
    }
  });

  // Streaming assessment handler using SSE
  ipcMain.handle('api:stream-assessment', async (event, requestData: Record<string, unknown>) => {
    // Input validation
    if (!requestData || typeof requestData !== 'object' || Array.isArray(requestData)) {
      throw new Error('api:stream-assessment: requestData must be a non-null object');
    }
    if (!Array.isArray(requestData.skills) || requestData.skills.length === 0) {
      throw new Error('api:stream-assessment: skills must be a non-empty array');
    }
    if (requestData.skills.length > 5000) {
      throw new Error('api:stream-assessment: too many skills (max 5000)');
    }

    const streamId = randomUUID();
    const abortController = new AbortController();
    activeStreams.set(streamId, abortController);

    const webContents = event.sender;
    const skillCount = Array.isArray(requestData.skills) ? requestData.skills.length : 0;

    log.info(`Starting streaming assessment: ${streamId}, skills: ${skillCount}`);

    // Scale timeout with skill count: 2 min base + 1 min per 50 skills, max 30 min.
    // Large batches (500 skills) get ~12 min; small batches (50 skills) get ~3 min.
    const streamTimeoutMs = Math.min(30, 2 + Math.ceil(skillCount / 50)) * 60 * 1000;
    const streamTimeout = setTimeout(() => {
      if (activeStreams.has(streamId)) {
        log.warn(
          `Stream ${streamId} timed out after ${streamTimeoutMs / 60000} minutes (${skillCount} skills), aborting`
        );
        abortController.abort();
        activeStreams.delete(streamId);
      }
    }, streamTimeoutMs);

    // Start the stream processing in the background
    (async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/proficiency/assess/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
          signal: abortController.signal,
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
          // Guard against memory exhaustion from malformed streams
          if (buffer.length > MAX_SSE_BUFFER_SIZE) {
            log.warn(`Stream ${streamId} buffer exceeded ${MAX_SSE_BUFFER_SIZE} bytes, aborting`);
            abortController.abort();
            break;
          }
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
                  log.info(
                    `Assessment complete: ${(summary.assessments as unknown[])?.length || 0} results, status=${summary.status}, failed=${summary.failed_assessments}`
                  );
                  if (summary.failed_assessments > 0) {
                    log.warn(
                      `Failed skills sample: ${JSON.stringify((summary.failed_skills as string[])?.slice(0, 3))}`
                    );
                  }
                }
                if (!webContents.isDestroyed()) {
                  webContents.send('assessment:event', { streamId, eventType, data: parsedData });
                }
              } catch (parseError) {
                log.warn('Failed to parse SSE data:', eventData);
                if (!webContents.isDestroyed()) {
                  webContents.send('assessment:event', {
                    streamId,
                    eventType: 'error',
                    data: { error: `Failed to parse assessment response` },
                  });
                }
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
          // "terminated" is an undici/fetch error thrown when the backend SSE connection
          // closes abruptly (e.g. LangGraph recursion limit, backend crash, or oversized
          // response). Surface a human-readable message instead of the raw word.
          const userMessage =
            message === 'terminated'
              ? 'The assessment stream was interrupted — the server closed the connection unexpectedly. ' +
                'This usually means the response was too large for the current batch. ' +
                'Try enabling batch mode with a smaller chunk size (10–15 skills per batch).'
              : message;
          if (!webContents.isDestroyed()) {
            webContents.send('assessment:event', {
              streamId,
              eventType: 'error',
              data: { error: userMessage },
            });
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

  // Generate a content hash for duplicate detection
  const hashAssessmentData = (data: Record<string, unknown>): string => {
    const results = data.results as Record<string, unknown> | undefined;
    if (!results) return '';
    const assessments = (results.assessments as Array<Record<string, unknown>>) || [];
    // Create a stable signature from skill names + proficiency levels
    const signature = assessments
      .map((a) => `${a.skill_name}:${a.proficiency ?? a.proficiency_numeric}`)
      .sort()
      .join('|');
    return createHash('sha256').update(signature).digest('hex').slice(0, 16);
  };

  // Save assessment results to a JSON file (with duplicate detection)
  ipcMain.handle('assessment:save-results', async (_, data: Record<string, unknown>) => {
    try {
      const dir = await getAssessmentsDir();

      // Check for duplicates by content hash
      const contentHash = hashAssessmentData(data);
      if (contentHash) {
        const existingFiles = await readdir(dir);
        for (const f of existingFiles.filter((f) => f.endsWith('.json'))) {
          try {
            const content = await readFile(path.join(dir, f), 'utf-8');
            const parsed = JSON.parse(content);
            if (parsed.content_hash === contentHash) {
              log.info(`Duplicate assessment detected (hash: ${contentHash}), skipping save`);
              return { success: true, filePath: path.join(dir, f), filename: f, duplicate: true };
            }
          } catch {
            // Skip malformed files
          }
        }
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `assessment_${timestamp}.json`;
      const filePath = path.join(dir, filename);

      const payload = {
        saved_at: new Date().toISOString(),
        content_hash: contentHash,
        ...data,
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
        .filter((f) => f.endsWith('.json'))
        .sort()
        .reverse(); // newest first

      const results = [];
      for (const filename of jsonFiles) {
        try {
          const content = await readFile(path.join(dir, filename), 'utf-8');
          const parsed = JSON.parse(content);
          const assessments = (parsed.results?.assessments as Array<Record<string, unknown>>) || [];
          const avgConfidence =
            assessments.length > 0
              ? assessments.reduce(
                  (sum: number, a) => sum + ((a.confidence_score as number) || 0),
                  0
                ) / assessments.length
              : 0;
          const summary = parsed.summary || {};
          const source = parsed.source || {};
          const config = parsed.config || {};
          results.push({
            filename,
            saved_at: parsed.saved_at,
            total_skills: parsed.results?.total_skills || assessments.length || 0,
            avg_proficiency: parsed.results?.avg_proficiency || 0,
            avg_confidence: avgConfidence,
            model_used: parsed.results?.model_used || 'unknown',
            provider: config.llmConfig?.provider || '',
            processing_time: parsed.results?.processing_time || 0,
            content_hash: parsed.content_hash || '',
            // Source info
            extraction_source: source.extractionSource || '',
            source_filename: source.filename || '',
            environment_name: source.environmentName || '',
            // Summary stats
            total_tokens: summary.total_tokens_used || 0,
            estimated_cost: summary.estimated_cost || 0,
            success_rate: summary.success_rate || 0,
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
      if (!filename || typeof filename !== 'string') {
        return { success: false, error: 'Invalid filename' };
      }
      const dir = await getAssessmentsDir();
      const safeName = sanitizeFilename(filename);
      const filePath = path.join(dir, safeName);
      // Verify resolved path stays within the assessments directory
      const resolvedDir = path.resolve(dir);
      const resolvedFile = path.resolve(filePath);
      if (!resolvedFile.startsWith(resolvedDir + path.sep) && resolvedFile !== resolvedDir) {
        log.warn(`assessment:load-saved path traversal blocked: ${filename}`);
        return { success: false, error: 'Access denied' };
      }
      const content = await readFile(filePath, 'utf-8');
      return { success: true, data: JSON.parse(content) };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  // Delete a saved assessment file
  ipcMain.handle('assessment:delete-saved', async (_, filename: string) => {
    try {
      if (!filename || typeof filename !== 'string') {
        return { success: false, error: 'Invalid filename' };
      }
      const dir = await getAssessmentsDir();
      const safeName = sanitizeFilename(filename);
      const filePath = path.join(dir, safeName);
      // Verify resolved path stays within the assessments directory
      const resolvedDir = path.resolve(dir);
      const resolvedFile = path.resolve(filePath);
      if (!resolvedFile.startsWith(resolvedDir + path.sep) && resolvedFile !== resolvedDir) {
        log.warn(`assessment:delete-saved path traversal blocked: ${filename}`);
        return { success: false, error: 'Access denied' };
      }
      await unlink(filePath);
      log.info(`Assessment deleted: ${filePath}`);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error('Failed to delete assessment:', message);
      return { success: false, error: message };
    }
  });

  // ==========================================
  // Feedback File Storage (score corrections for calibration)
  // ==========================================

  const getFeedbackDir = async (): Promise<string> => {
    const dir = path.join(app.getPath('userData'), 'feedback');
    await mkdir(dir, { recursive: true });
    return dir;
  };

  // Save or update feedback for a skill correction
  ipcMain.handle('feedback:save', async (_, feedbackItem: Record<string, unknown>) => {
    try {
      const skillName = feedbackItem.skill_name;
      if (!skillName || typeof skillName !== 'string') {
        return { success: false, error: 'skill_name is required' };
      }
      const dir = await getFeedbackDir();
      const hash = createHash('sha256')
        .update(skillName.toLowerCase().trim())
        .digest('hex')
        .slice(0, 16);
      const filename = `feedback_${hash}.json`;
      const filePath = path.join(dir, filename);

      // Load existing history for this skill (if any)
      let existing: Record<string, unknown> = { skill_name: skillName, corrections: [] };
      try {
        const content = await readFile(filePath, 'utf-8');
        existing = JSON.parse(content);
      } catch {
        /* no existing file */
      }

      const corrections = (existing.corrections as Array<Record<string, unknown>>) || [];
      corrections.push({
        original_score: feedbackItem.original_score,
        corrected_score: feedbackItem.corrected_score,
        model_used: feedbackItem.model_used,
        note: feedbackItem.note || '',
        timestamp: new Date().toISOString(),
      });

      const payload = { skill_name: skillName, corrections };
      await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
      log.info(`Feedback saved for skill: ${skillName}`);
      return { success: true, filename };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error('Failed to save feedback:', message);
      return { success: false, error: message };
    }
  });

  // Load feedback for a specific skill (by name)
  ipcMain.handle('feedback:load-skill', async (_, skillName: string) => {
    try {
      if (!skillName || typeof skillName !== 'string') {
        return { success: false, error: 'skill_name is required' };
      }
      const dir = await getFeedbackDir();
      const hash = createHash('sha256')
        .update(skillName.toLowerCase().trim())
        .digest('hex')
        .slice(0, 16);
      const filename = `feedback_${hash}.json`;
      const filePath = path.join(dir, filename);
      const content = await readFile(filePath, 'utf-8');
      return { success: true, data: JSON.parse(content) };
    } catch {
      return { success: true, data: null }; // No feedback yet is not an error
    }
  });

  // Load all feedback (for calibration / few-shot injection)
  ipcMain.handle('feedback:load-all', async () => {
    try {
      const dir = await getFeedbackDir();
      const files = await readdir(dir);
      const jsonFiles = files.filter((f) => f.startsWith('feedback_') && f.endsWith('.json'));
      const allFeedback: Array<Record<string, unknown>> = [];
      for (const filename of jsonFiles) {
        try {
          const content = await readFile(path.join(dir, filename), 'utf-8');
          allFeedback.push(JSON.parse(content));
        } catch {
          /* skip malformed */
        }
      }
      return { success: true, feedback: allFeedback };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: message, feedback: [] };
    }
  });

  log.info('IPC handlers setup complete');
}
