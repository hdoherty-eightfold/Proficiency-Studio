/**
 * Tests for Error Utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createAppError,
  ErrorType,
  safeStorage,
  formatBytes,
  fetchWithTimeout,
  validateFile,
  getUserFriendlyMessage,
  AppError
} from './errors';

describe('createAppError', () => {
  it('should handle QuotaExceededError', () => {
    const error = new DOMException('QuotaExceededError', 'QuotaExceededError');
    const appError = createAppError(error);

    expect(appError.type).toBe(ErrorType.STORAGE);
    expect(appError.message).toBe('Storage limit exceeded');
    expect(appError.recoverable).toBe(true);
  });

  it('should handle AbortError', () => {
    const error = new DOMException('AbortError', 'AbortError');
    const appError = createAppError(error);

    expect(appError.type).toBe(ErrorType.ABORT);
    expect(appError.message).toBe('Operation cancelled');
    expect(appError.recoverable).toBe(true);
  });

  it('should handle timeout errors', () => {
    const error = new Error('Request timeout exceeded');
    const appError = createAppError(error);

    expect(appError.type).toBe(ErrorType.TIMEOUT);
    expect(appError.recoverable).toBe(true);
  });

  it('should handle timeout errors with capitalization', () => {
    const error = new Error('Timeout error occurred');
    const appError = createAppError(error);

    expect(appError.type).toBe(ErrorType.TIMEOUT);
    expect(appError.recoverable).toBe(true);
  });

  it('should handle backend errors', () => {
    const error = new Error('Backend server unavailable');
    const appError = createAppError(error);

    expect(appError.type).toBe(ErrorType.BACKEND);
    expect(appError.recoverable).toBe(true);
  });

  it('should handle generic errors', () => {
    const error = new Error('Something went wrong');
    const appError = createAppError(error, 'test context');

    expect(appError.type).toBe(ErrorType.UNKNOWN);
    expect(appError.message).toBe('Something went wrong');
    expect(appError.details).toBe('test context');
  });

  it('should handle non-Error objects', () => {
    const appError = createAppError('string error');

    expect(appError.type).toBe(ErrorType.UNKNOWN);
    expect(appError.recoverable).toBe(false);
  });
});

describe('formatBytes', () => {
  it('should format 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('should format bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('should format megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(5242880)).toBe('5 MB');
  });

  it('should format gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
  });
});

describe('safeStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should check if data can be stored', () => {
    // Small data should be storable
    expect(safeStorage.canStore('small data')).toBe(true);
  });

  it('should set and get items', () => {
    const result = safeStorage.setItem('test-key', 'test-value');
    expect(result.success).toBe(true);
  });

  it('should get data size', () => {
    const size = safeStorage.getDataSize('hello');
    expect(size).toBe(5);
  });

  it('should return usage stats', () => {
    const stats = safeStorage.getUsageStats();
    expect(stats).toHaveProperty('used');
    expect(stats).toHaveProperty('available');
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('percentage');
  });
});

describe('validateFile', () => {
  it('should validate file size', () => {
    const file = new File([''], 'test.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'size', { value: 1000 });

    const result = validateFile(file, { maxSize: 500 });
    expect(result.valid).toBe(false);
    expect(result.error?.type).toBe(ErrorType.FILE);
  });

  it('should validate file extension', () => {
    const file = new File([''], 'test.txt', { type: 'text/plain' });

    const result = validateFile(file, { allowedExtensions: ['.csv'] });
    expect(result.valid).toBe(false);
    expect(result.error?.type).toBe(ErrorType.FILE);
  });

  it('should validate empty files', () => {
    const file = new File([''], 'test.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'size', { value: 0 });

    const result = validateFile(file, {});
    expect(result.valid).toBe(false);
    expect(result.error?.message).toBe('File is empty');
  });

  it('should accept valid files', () => {
    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'size', { value: 1000 });

    const result = validateFile(file, {
      maxSize: 10000,
      allowedExtensions: ['.csv']
    });
    expect(result.valid).toBe(true);
  });
});

describe('getUserFriendlyMessage', () => {
  it('should return friendly network error message', () => {
    const error: AppError = {
      type: ErrorType.NETWORK,
      message: '',
      recoverable: true
    };
    expect(getUserFriendlyMessage(error)).toContain('Network');
  });

  it('should return friendly storage error message', () => {
    const error: AppError = {
      type: ErrorType.STORAGE,
      message: '',
      recoverable: true
    };
    expect(getUserFriendlyMessage(error)).toContain('Storage');
  });

  it('should return the error message if provided', () => {
    const error: AppError = {
      type: ErrorType.UNKNOWN,
      message: 'Custom error message',
      recoverable: true
    };
    expect(getUserFriendlyMessage(error)).toBe('Custom error message');
  });
});

describe('fetchWithTimeout', () => {
  it('should call fetch with abort signal', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('OK'));
    global.fetch = mockFetch;

    await fetchWithTimeout('https://example.com', {}, 5000);

    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].signal).toBeDefined();
  });

  it('should throw on timeout', async () => {
    vi.useFakeTimers();

    // Mock fetch that never resolves
    const mockFetch = vi.fn().mockImplementation((_url: string, options?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        // Listen for abort
        options?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });
    global.fetch = mockFetch;

    const fetchPromise = fetchWithTimeout('https://example.com', {}, 1000);

    // Advance timers to trigger timeout
    vi.advanceTimersByTime(1000);

    await expect(fetchPromise).rejects.toThrow('timed out');

    vi.useRealTimers();
  });
});
