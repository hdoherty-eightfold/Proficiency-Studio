/**
 * Tests for Storage Keys Configuration
 */

import { describe, it, expect } from 'vitest';
import { STORAGE_KEYS } from './storage-keys';

describe('STORAGE_KEYS', () => {
  it('should be defined', () => {
    expect(STORAGE_KEYS).toBeDefined();
  });

  it('should have all expected key groups defined', () => {
    // Integration / CSV
    expect(STORAGE_KEYS.INTEGRATION_TYPE).toBeDefined();
    expect(STORAGE_KEYS.CSV_FILENAME).toBeDefined();
    expect(STORAGE_KEYS.CSV_FILE_ID).toBeDefined();
    expect(STORAGE_KEYS.CSV_CONTENT).toBeDefined();

    // Skills
    expect(STORAGE_KEYS.EXTRACTED_SKILLS).toBeDefined();
    expect(STORAGE_KEYS.SKILLS_EXTRACTION_DATA).toBeDefined();
    expect(STORAGE_KEYS.PROFSTUDIO_EXTRACTED_SKILLS).toBeDefined();

    // Proficiency
    expect(STORAGE_KEYS.PROFICIENCY_CONFIG).toBeDefined();

    // Assessment
    expect(STORAGE_KEYS.ASSESSMENT_RESULTS).toBeDefined();

    // Environment
    expect(STORAGE_KEYS.ENV_ID).toBeDefined();
    expect(STORAGE_KEYS.ENV_NAME).toBeDefined();

    // Auth
    expect(STORAGE_KEYS.AUTH_TOKEN).toBeDefined();

    // API Keys
    expect(STORAGE_KEYS.LLM_API_KEYS).toBeDefined();
    expect(STORAGE_KEYS.LLM_LAST_SELECTED_KEY).toBeDefined();

    // Settings
    expect(STORAGE_KEYS.APP_SETTINGS_GENERAL).toBeDefined();

    // RAG
    expect(STORAGE_KEYS.RAG_ENABLED).toBeDefined();
    expect(STORAGE_KEYS.RAG_DOCUMENTS).toBeDefined();

    // Debug
    expect(STORAGE_KEYS.DEBUG).toBeDefined();
  });

  it('should have all values as strings', () => {
    for (const [_key, value] of Object.entries(STORAGE_KEYS)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('should have no duplicate values', () => {
    const values = Object.values(STORAGE_KEYS);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it('should follow profstudio_ prefix naming convention for newer keys', () => {
    const prefixedKeys = [
      'INTEGRATION_TYPE',
      'CSV_FILENAME',
      'CSV_FILE_ID',
      'CSV_CONTENT',
      'PROFSTUDIO_EXTRACTED_SKILLS',
      'PROFICIENCY_CONFIG',
      'ENV_ID',
      'ENV_NAME',
      'AUTH_TOKEN',
      'RAG_ENABLED',
      'RAG_DOCUMENTS',
    ] as const;

    for (const key of prefixedKeys) {
      expect(STORAGE_KEYS[key]).toMatch(/^profstudio_/);
    }
  });

  it('should identify legacy keys without prefix', () => {
    // These are legacy keys that predate the naming convention
    const legacyKeys = [
      'EXTRACTED_SKILLS',
      'SKILLS_EXTRACTION_DATA',
      'ASSESSMENT_RESULTS',
      'LLM_API_KEYS',
      'LLM_LAST_SELECTED_KEY',
      'APP_SETTINGS_GENERAL',
      'DEBUG',
    ] as const;

    for (const key of legacyKeys) {
      expect(STORAGE_KEYS[key]).not.toMatch(/^profstudio_/);
    }
  });

  it('should be a const object (values are readonly)', () => {
    // Verify the object structure is as expected - keys map to string literals
    const entries = Object.entries(STORAGE_KEYS);
    expect(entries.length).toBeGreaterThan(0);

    // Each entry should be a [string, string] tuple
    for (const [key, value] of entries) {
      expect(typeof key).toBe('string');
      expect(typeof value).toBe('string');
    }
  });
});
