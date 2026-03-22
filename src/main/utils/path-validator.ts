/**
 * File Path Validation Utility
 * Prevents path traversal attacks by validating file paths against allowed directories.
 */

import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { stat } from 'fs/promises';
import log from 'electron-log';

/**
 * Allowed base paths for file operations.
 * Only paths under these directories are permitted.
 */
function getAllowedPaths(): string[] {
  return [
    app.getPath('userData'),
    app.getPath('documents'),
    app.getPath('downloads'),
    app.getPath('temp'),
    app.getPath('desktop'),
  ];
}

/**
 * Dangerous path patterns that should never be allowed.
 */
const DANGEROUS_PATTERNS = [
  '..', // Parent directory traversal
  '~', // Home directory shortcut
  '$', // Environment variable expansion
  '%', // Windows environment variable
  '\0', // Null byte
];

/**
 * Sensitive directories that should never be accessed.
 */
const SENSITIVE_DIRECTORIES = [
  '/etc',
  '/var',
  '/usr',
  '/bin',
  '/sbin',
  '/root',
  '/private/etc', // macOS
  'C:\\Windows',
  'C:\\Program Files',
  'C:\\Program Files (x86)',
  'System32',
];

/**
 * Check if a path contains dangerous patterns.
 */
function containsDangerousPattern(filePath: string): boolean {
  const normalizedPath = path.normalize(filePath);
  return DANGEROUS_PATTERNS.some(pattern => filePath.includes(pattern) || normalizedPath.includes(pattern));
}

/**
 * Check if a path is under a sensitive directory.
 */
function isUnderSensitiveDirectory(filePath: string): boolean {
  const resolvedPath = path.resolve(filePath).toLowerCase();
  return SENSITIVE_DIRECTORIES.some(dir => resolvedPath.startsWith(dir.toLowerCase()));
}

/**
 * Check if a file path is allowed based on security rules.
 *
 * @param filePath - The file path to validate
 * @returns true if the path is allowed, false otherwise
 */
export function isPathAllowed(filePath: string): boolean {
  try {
    // Check for dangerous patterns
    if (containsDangerousPattern(filePath)) {
      log.warn(`Path contains dangerous pattern: ${filePath}`);
      return false;
    }

    // Check for sensitive directories
    if (isUnderSensitiveDirectory(filePath)) {
      log.warn(`Path is under sensitive directory: ${filePath}`);
      return false;
    }

    // Resolve symlinks to prevent symlink-based path traversal attacks.
    // If the file exists, use its real path; otherwise fall back to path.resolve.
    let resolvedPath: string;
    try {
      resolvedPath = fs.realpathSync(filePath);
    } catch {
      // File may not exist yet (e.g., writing a new file) - resolve without symlink check
      resolvedPath = path.resolve(filePath);
    }

    // Re-check the resolved real path against dangerous/sensitive patterns
    if (isUnderSensitiveDirectory(resolvedPath)) {
      log.warn(`Symlink resolves to sensitive directory: ${filePath} -> ${resolvedPath}`);
      return false;
    }

    // Check if under an allowed base directory
    const allowedPaths = getAllowedPaths();
    const isAllowed = allowedPaths.some(basePath => {
      const resolvedBase = path.resolve(basePath);
      return resolvedPath.startsWith(resolvedBase);
    });

    if (!isAllowed) {
      log.warn(`Path not under allowed directories: ${filePath}`);
    }

    return isAllowed;
  } catch (error) {
    log.error(`Error validating path: ${error}`);
    return false;
  }
}

/**
 * Validate and sanitize a file path.
 *
 * @param filePath - The file path to validate
 * @returns The sanitized absolute path
 * @throws Error if the path is not allowed
 */
export async function validateAndSanitizePath(filePath: string): Promise<string> {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path: path must be a non-empty string');
  }

  // Normalize the path
  const sanitized = path.normalize(filePath);

  // Check if allowed (includes symlink resolution)
  if (!isPathAllowed(sanitized)) {
    throw new Error('Access to this path is not allowed');
  }

  // Resolve to absolute path, following symlinks if the file exists
  try {
    return fs.realpathSync(sanitized);
  } catch {
    return path.resolve(sanitized);
  }
}

/**
 * Sanitize a filename by removing potentially dangerous characters.
 *
 * @param filename - The filename to sanitize
 * @returns The sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed';
  }

  // Remove path separators and dangerous characters
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Control chars and reserved chars
    .replace(/\.\.+/g, '.') // Multiple dots
    .replace(/^\.+|\.+$/g, '') // Leading/trailing dots
    .slice(0, 255); // Max filename length
}

/**
 * Check if a path exists and optionally verify it's a file or directory.
 *
 * @param filePath - The path to check
 * @param expectType - Optional: 'file' or 'directory'
 * @returns true if the path exists and matches the expected type
 */
export async function pathExists(filePath: string, expectType?: 'file' | 'directory'): Promise<boolean> {
  try {
    const stats = await stat(filePath);

    if (expectType === 'file') {
      return stats.isFile();
    }
    if (expectType === 'directory') {
      return stats.isDirectory();
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get the safe user data path for storing application data.
 */
export function getSafeUserDataPath(): string {
  return app.getPath('userData');
}

/**
 * Join paths safely, ensuring the result is under an allowed directory.
 *
 * @param basePath - The base path (must be an allowed directory)
 * @param segments - Path segments to join
 * @returns The joined path
 * @throws Error if the result is outside the base path
 */
export function safeJoinPath(basePath: string, ...segments: string[]): string {
  const resolvedBase = path.resolve(basePath);
  const joined = path.resolve(basePath, ...segments);

  // Ensure the result is still under the base path (prevent traversal)
  if (!joined.startsWith(resolvedBase)) {
    throw new Error('Path traversal detected');
  }

  return joined;
}
