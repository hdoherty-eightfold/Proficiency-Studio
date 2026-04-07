/**
 * API Core
 * Base utilities (retry, deduplication) and generic CRUD methods.
 * All domain-specific service classes extend this.
 */

import { electronAPI } from './electron-api';
import { useToastStore } from '../stores/toast-store';

import type { HealthCheckResponse, UploadResponse } from '../types/api';

// API version constant. Currently unused but available for future versioned endpoint support.
export const API_VERSION = 'v1';

// ==========================================
// Request Deduplication (GET only)
// ==========================================

const inflightRequests = new Map<string, Promise<unknown>>();

function deduplicateGet<T>(endpoint: string, fn: () => Promise<T>): Promise<T> {
  const key = `GET:${endpoint}`;
  const existing = inflightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fn().finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, promise);
  return promise;
}

// ==========================================
// Retry with Exponential Backoff
// ==========================================

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  /** Optional AbortSignal — aborts remaining retry attempts (does not cancel in-flight IPC call) */
  signal?: AbortSignal;
}

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'signal'>> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

function isRetryableError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (
    message.includes('cannot connect to backend') ||
    message.includes('network error') ||
    message.includes('timed out') ||
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('econnaborted') ||
    message.includes('err_network') ||
    message.includes('fetch failed') ||
    message.includes('server may be overloaded')
  ) {
    return true;
  }

  if (message.includes('429') || message.includes('rate limit') || message.includes('quota')) {
    return true;
  }

  const httpStatusMatch = message.match(/\b(5\d{2})\b/);
  if (httpStatusMatch) {
    return true;
  }

  const clientErrorMatch = message.match(/\b(4\d{2})\b/);
  if (clientErrorMatch) {
    return false;
  }

  if (message.includes('internal server error')) {
    return true;
  }

  return false;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay, signal } = { ...DEFAULT_RETRY_OPTIONS, ...options };

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check for cancellation before each attempt
    if (signal?.aborted) {
      throw new DOMException('Request aborted', 'AbortError');
    }

    try {
      return await fn();
    } catch (error) {
      // Don't retry if the caller aborted
      if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
        throw error;
      }

      lastError = error;

      if (attempt >= maxRetries || !isRetryableError(error)) {
        throw error;
      }

      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const cappedDelay = Math.min(exponentialDelay, maxDelay);
      const jitter = Math.random() * cappedDelay * 0.1;
      const delay = cappedDelay + jitter;

      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(
        `[API Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${Math.round(delay)}ms:`,
        errorMsg
      );
      useToastStore.getState().addToast({
        title: `Request failed, retrying (${attempt + 1}/${maxRetries})...`,
        description: errorMsg.substring(0, 100),
        variant: 'default',
      });

      // Abortable delay
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, delay);
        signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new DOMException('Request aborted', 'AbortError'));
          },
          { once: true }
        );
      });
    }
  }

  throw lastError;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// ==========================================
// Base API Class
// ==========================================

export class ApiCore {
  async healthCheck(): Promise<HealthCheckResponse> {
    return retryWithBackoff(() => electronAPI.get('/health'));
  }

  async post<T = unknown>(endpoint: string, data: unknown): Promise<T> {
    return retryWithBackoff(() => electronAPI.post(endpoint, data));
  }

  async put<T = unknown>(endpoint: string, data: unknown): Promise<T> {
    return retryWithBackoff(() => electronAPI.put(endpoint, data));
  }

  async delete<T = unknown>(endpoint: string): Promise<T> {
    return retryWithBackoff(() => electronAPI.delete(endpoint));
  }

  async get<T = unknown>(endpoint: string): Promise<T> {
    return deduplicateGet(endpoint, () => retryWithBackoff(() => electronAPI.get(endpoint)));
  }

  async uploadFile(filePath: string): Promise<UploadResponse> {
    return retryWithBackoff(() => electronAPI.upload('/api/upload', [filePath]));
  }

  async uploadFiles(filePaths: string[]): Promise<UploadResponse> {
    return retryWithBackoff(() => electronAPI.upload('/api/upload', filePaths));
  }
}
