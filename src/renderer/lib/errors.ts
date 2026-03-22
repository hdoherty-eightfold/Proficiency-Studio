/**
 * Error Handling Utilities for ProfStudio-Desktop
 *
 * Provides standardized error handling, safe localStorage operations,
 * fetch with timeout, and file encoding detection.
 */

// Error types for consistent error handling
export enum ErrorType {
  NETWORK = 'NETWORK',
  STORAGE = 'STORAGE',
  VALIDATION = 'VALIDATION',
  BACKEND = 'BACKEND',
  ENCODING = 'ENCODING',
  TIMEOUT = 'TIMEOUT',
  ABORT = 'ABORT',
  FILE = 'FILE',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
  recoverable: boolean;
  userAction?: string;
  originalError?: Error;
}

/**
 * Create standardized AppError from various error sources
 */
export function createAppError(error: unknown, context?: string): AppError {
  // Handle QuotaExceededError (localStorage full)
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return {
      type: ErrorType.STORAGE,
      message: 'Storage limit exceeded',
      details: 'The file is too large to store locally. Consider using a smaller file or clearing app data.',
      recoverable: true,
      userAction: 'Go to Settings > Clear Data or use a smaller file'
    };
  }

  // Handle AbortError (request cancelled)
  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      type: ErrorType.ABORT,
      message: 'Operation cancelled',
      recoverable: true
    };
  }

  // Handle network errors
  if (error instanceof TypeError && String(error.message).includes('fetch')) {
    return {
      type: ErrorType.NETWORK,
      message: 'Network error',
      details: context || 'Could not connect to the server. Check your internet connection.',
      recoverable: true,
      userAction: 'Check network connection and try again'
    };
  }

  // Handle Error instances
  if (error instanceof Error) {
    // Check for timeout
    const isTimeout = error.message.toLowerCase().includes('timeout') ||
                      error.message.includes('Timeout');
    if (isTimeout) {
      return {
        type: ErrorType.TIMEOUT,
        message: 'Request timed out',
        details: 'The operation took too long. The server may be slow or unavailable.',
        recoverable: true,
        userAction: 'Try again later'
      };
    }

    // Check for backend unavailable
    if (error.message.includes('Backend') || error.message.includes('ECONNREFUSED')) {
      return {
        type: ErrorType.BACKEND,
        message: 'Backend server unavailable',
        details: 'The backend server is not responding. Please ensure it is running.',
        recoverable: true,
        userAction: 'Start the backend server and try again'
      };
    }

    // Generic error
    return {
      type: ErrorType.UNKNOWN,
      message: error.message,
      details: context,
      recoverable: true,
      originalError: error
    };
  }

  // Unknown error type
  return {
    type: ErrorType.UNKNOWN,
    message: 'An unexpected error occurred',
    details: String(error),
    recoverable: false
  };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Safe localStorage wrapper with size checking and error handling
 */
export const safeStorage = {
  // Conservative limit (leave 1MB buffer from typical 5MB limit)
  STORAGE_LIMIT: 4 * 1024 * 1024, // 4MB

  // Warning threshold
  WARNING_THRESHOLD: 3 * 1024 * 1024, // 3MB

  /**
   * Get approximate available space in localStorage
   */
  getAvailableSpace(): number {
    try {
      let total = 0;
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          const value = localStorage.getItem(key);
          if (value) {
            total += key.length + value.length;
          }
        }
      }
      // Multiply by 2 for UTF-16 encoding
      return Math.max(0, this.STORAGE_LIMIT - (total * 2));
    } catch {
      return 0;
    }
  },

  /**
   * Get size of data in bytes
   */
  getDataSize(data: string): number {
    return new Blob([data]).size;
  },

  /**
   * Check if data can be stored
   */
  canStore(data: string): boolean {
    const dataSize = this.getDataSize(data);
    return dataSize < this.getAvailableSpace();
  },

  /**
   * Check if storage is near capacity
   */
  isNearCapacity(): boolean {
    return this.getAvailableSpace() < this.WARNING_THRESHOLD;
  },

  /**
   * Safely set item with size checking
   */
  setItem(key: string, value: string): { success: boolean; error?: AppError; warning?: string } {
    try {
      const dataSize = this.getDataSize(value);
      const availableSpace = this.getAvailableSpace();

      // Check if data is too large
      if (dataSize > availableSpace) {
        return {
          success: false,
          error: {
            type: ErrorType.STORAGE,
            message: 'Storage limit exceeded',
            details: `Data size: ${formatBytes(dataSize)}, Available: ${formatBytes(availableSpace)}`,
            recoverable: true,
            userAction: 'Clear old data or use a smaller file'
          }
        };
      }

      // Store the data
      localStorage.setItem(key, value);

      // Check for warning
      if (this.isNearCapacity()) {
        return {
          success: true,
          warning: `Storage is nearly full. ${formatBytes(this.getAvailableSpace())} remaining.`
        };
      }

      return { success: true };
    } catch (error) {
      // Handle actual quota exceeded error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        return {
          success: false,
          error: createAppError(error)
        };
      }
      return {
        success: false,
        error: createAppError(error, 'Failed to save to storage')
      };
    }
  },

  /**
   * Safely get item
   */
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  /**
   * Safely remove item
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail on removal
    }
  },

  /**
   * Clear all ProfStudio items
   */
  clearProfStudioData(): void {
    try {
      const keysToRemove: string[] = [];
      for (const key in localStorage) {
        if (key.startsWith('profstudio_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch {
      // Silently fail
    }
  },

  /**
   * Get storage usage stats
   */
  getUsageStats(): { used: number; available: number; total: number; percentage: number } {
    const available = this.getAvailableSpace();
    const used = this.STORAGE_LIMIT - available;
    return {
      used,
      available,
      total: this.STORAGE_LIMIT,
      percentage: Math.round((used / this.STORAGE_LIMIT) * 100)
    };
  }
};

/**
 * Fetch with timeout wrapper using AbortController
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Detect file encoding by checking BOM markers and content
 */
export async function detectFileEncoding(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const arr = new Uint8Array(e.target?.result as ArrayBuffer);

      // Check for UTF-8 BOM
      if (arr[0] === 0xEF && arr[1] === 0xBB && arr[2] === 0xBF) {
        resolve('UTF-8');
        return;
      }

      // Check for UTF-16 LE BOM
      if (arr[0] === 0xFF && arr[1] === 0xFE) {
        resolve('UTF-16LE');
        return;
      }

      // Check for UTF-16 BE BOM
      if (arr[0] === 0xFE && arr[1] === 0xFF) {
        resolve('UTF-16BE');
        return;
      }

      // Check for UTF-32 LE BOM
      if (arr[0] === 0xFF && arr[1] === 0xFE && arr[2] === 0x00 && arr[3] === 0x00) {
        resolve('UTF-32LE');
        return;
      }

      // Analyze content for encoding hints
      let hasHighBytes = false;
      let invalidUtf8Sequences = 0;

      for (let i = 0; i < Math.min(arr.length, 4096); i++) {
        const byte = arr[i];

        // Check for bytes in extended ASCII range
        if (byte > 127) {
          hasHighBytes = true;

          // Check for valid UTF-8 multi-byte sequence
          if (byte >= 0xC0 && byte <= 0xDF && i + 1 < arr.length) {
            // 2-byte sequence
            if ((arr[i + 1] & 0xC0) !== 0x80) {
              invalidUtf8Sequences++;
            }
          } else if (byte >= 0xE0 && byte <= 0xEF && i + 2 < arr.length) {
            // 3-byte sequence
            if ((arr[i + 1] & 0xC0) !== 0x80 || (arr[i + 2] & 0xC0) !== 0x80) {
              invalidUtf8Sequences++;
            }
          } else if (byte >= 0x80 && byte <= 0xBF) {
            // Unexpected continuation byte
            invalidUtf8Sequences++;
          }
        }
      }

      // If we have high bytes but many invalid UTF-8 sequences, assume Latin-1
      if (hasHighBytes && invalidUtf8Sequences > 5) {
        resolve('ISO-8859-1');
        return;
      }

      // Default to UTF-8
      resolve('UTF-8');
    };

    reader.onerror = () => resolve('UTF-8'); // Default to UTF-8 on error

    // Read first 4KB to detect encoding
    reader.readAsArrayBuffer(file.slice(0, 4096));
  });
}

/**
 * Read file with proper encoding detection
 */
export async function readFileWithEncoding(file: File): Promise<{ content: string; encoding: string }> {
  const encoding = await detectFileEncoding(file);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      resolve({
        content: e.target?.result as string,
        encoding
      });
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file with encoding ${encoding}`));
    };

    // Map encoding names to what FileReader expects
    const encodingMap: Record<string, string> = {
      'UTF-8': 'UTF-8',
      'UTF-16LE': 'UTF-16LE',
      'UTF-16BE': 'UTF-16BE',
      'UTF-32LE': 'UTF-32LE',
      'ISO-8859-1': 'ISO-8859-1',
      'windows-1252': 'windows-1252'
    };

    reader.readAsText(file, encodingMap[encoding] || 'UTF-8');
  });
}

/**
 * Validate file before processing
 */
export function validateFile(file: File, options: {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}): { valid: boolean; error?: AppError } {
  const {
    maxSize = 100 * 1024 * 1024, // 100MB default
    allowedExtensions = ['.csv']
  } = options;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: {
        type: ErrorType.FILE,
        message: 'File too large',
        details: `Maximum size is ${formatBytes(maxSize)}. Your file is ${formatBytes(file.size)}.`,
        recoverable: true,
        userAction: 'Use a smaller file'
      }
    };
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (allowedExtensions.length > 0 && !allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: {
        type: ErrorType.FILE,
        message: 'Invalid file type',
        details: `Allowed types: ${allowedExtensions.join(', ')}`,
        recoverable: true,
        userAction: `Upload a file with extension: ${allowedExtensions.join(', ')}`
      }
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      valid: false,
      error: {
        type: ErrorType.FILE,
        message: 'File is empty',
        details: 'The selected file contains no data.',
        recoverable: true,
        userAction: 'Select a file with data'
      }
    };
  }

  return { valid: true };
}

/**
 * Create an error message suitable for user display
 */
export function getUserFriendlyMessage(error: AppError): string {
  const messages: Record<ErrorType, string> = {
    [ErrorType.NETWORK]: 'Network connection issue. Please check your internet.',
    [ErrorType.STORAGE]: 'Storage is full. Please clear some data.',
    [ErrorType.VALIDATION]: 'Invalid input. Please check your data.',
    [ErrorType.BACKEND]: 'Server is unavailable. Please try again later.',
    [ErrorType.ENCODING]: 'File encoding issue. Try saving as UTF-8.',
    [ErrorType.TIMEOUT]: 'Request took too long. Please try again.',
    [ErrorType.ABORT]: 'Operation was cancelled.',
    [ErrorType.FILE]: 'File error. Please check the file.',
    [ErrorType.UNKNOWN]: 'Something went wrong. Please try again.'
  };

  return error.message || messages[error.type] || messages[ErrorType.UNKNOWN];
}
