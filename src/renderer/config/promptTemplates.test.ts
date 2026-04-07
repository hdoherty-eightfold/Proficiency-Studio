/**
 * Tests for Prompt Templates Configuration
 */

import { describe, it, expect } from 'vitest';
import {
  promptTemplates,
  getDefaultPrompt,
  getPromptById,
  interpolateTemplate,
  PromptTemplate,
} from './promptTemplates';

describe('promptTemplates', () => {
  it('should be defined and non-empty', () => {
    expect(promptTemplates).toBeDefined();
    expect(Array.isArray(promptTemplates)).toBe(true);
    expect(promptTemplates.length).toBeGreaterThan(0);
  });

  it('should have required properties on each template', () => {
    const requiredKeys: (keyof PromptTemplate)[] = [
      'id',
      'name',
      'description',
      'template',
      'outputFormat',
      'recommended',
    ];

    for (const tmpl of promptTemplates) {
      for (const key of requiredKeys) {
        expect(tmpl[key]).toBeDefined();
      }
    }
  });

  it('should have unique IDs across all templates', () => {
    const ids = promptTemplates.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have valid outputFormat values', () => {
    for (const tmpl of promptTemplates) {
      expect(['simple', 'detailed']).toContain(tmpl.outputFormat);
    }
  });

  it('should have boolean recommended field', () => {
    for (const tmpl of promptTemplates) {
      expect(typeof tmpl.recommended).toBe('boolean');
    }
  });

  it('should have exactly one recommended template', () => {
    const recommended = promptTemplates.filter((t) => t.recommended);
    expect(recommended).toHaveLength(1);
  });

  it('should include a simple template', () => {
    const simple = promptTemplates.find((t) => t.id === 'simple');
    expect(simple).toBeDefined();
    expect(simple!.outputFormat).toBe('simple');
  });

  it('should include a detailed template', () => {
    const detailed = promptTemplates.find((t) => t.id === 'detailed');
    expect(detailed).toBeDefined();
    expect(detailed!.outputFormat).toBe('detailed');
  });

  it('should have templates with {skills} placeholder', () => {
    for (const tmpl of promptTemplates) {
      expect(tmpl.template).toContain('{skills}');
    }
  });

  it('should have non-empty name and description on all templates', () => {
    for (const tmpl of promptTemplates) {
      expect(tmpl.name.length).toBeGreaterThan(0);
      expect(tmpl.description.length).toBeGreaterThan(0);
    }
  });
});

describe('getDefaultPrompt', () => {
  it('should return the recommended template', () => {
    const defaultPrompt = getDefaultPrompt();
    expect(defaultPrompt.recommended).toBe(true);
  });

  it('should return a valid PromptTemplate', () => {
    const defaultPrompt = getDefaultPrompt();
    expect(defaultPrompt.id).toBeDefined();
    expect(defaultPrompt.name).toBeDefined();
    expect(defaultPrompt.template).toBeDefined();
    expect(defaultPrompt.outputFormat).toBeDefined();
  });

  it('should return the simple template as default', () => {
    const defaultPrompt = getDefaultPrompt();
    expect(defaultPrompt.id).toBe('simple');
  });
});

describe('getPromptById', () => {
  it('should return template for valid ID', () => {
    const result = getPromptById('simple');
    expect(result).toBeDefined();
    expect(result!.id).toBe('simple');
  });

  it('should return template for detailed ID', () => {
    const result = getPromptById('detailed');
    expect(result).toBeDefined();
    expect(result!.id).toBe('detailed');
  });

  it('should return undefined for invalid ID', () => {
    const result = getPromptById('nonexistent');
    expect(result).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    const result = getPromptById('');
    expect(result).toBeUndefined();
  });
});

describe('interpolateTemplate', () => {
  it('should replace a single placeholder', () => {
    const result = interpolateTemplate('Hello {name}!', { name: 'World' });
    expect(result).toBe('Hello World!');
  });

  it('should replace multiple placeholders', () => {
    const result = interpolateTemplate('Skills: {skills}\nLevels: {proficiency_levels}', {
      skills: 'Python, TypeScript',
      proficiency_levels: '1-Novice, 5-Expert',
    });
    expect(result).toBe('Skills: Python, TypeScript\nLevels: 1-Novice, 5-Expert');
  });

  it('should leave unknown placeholders intact', () => {
    const result = interpolateTemplate('Hello {unknown}!', { name: 'World' });
    expect(result).toBe('Hello {unknown}!');
  });

  it('should work with real prompt templates', () => {
    const simple = getPromptById('simple')!;
    const result = interpolateTemplate(simple.template, { skills: 'Python, Java' });
    expect(result).toContain('Python, Java');
    expect(result).not.toContain('{skills}');
  });
});
