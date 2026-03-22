/**
 * Tests for Models Configuration
 */

import { describe, it, expect } from 'vitest';
import {
  PROVIDERS,
  DEFAULT_MODELS,
  getProvider,
  getDefaultModel,
  getModelsForProvider,
  getProvidersList,
} from './models';

describe('Models Configuration', () => {
  describe('PROVIDERS', () => {
    it('should have all expected providers', () => {
      const providerIds = Object.keys(PROVIDERS);
      expect(providerIds).toContain('google');
      expect(providerIds).toContain('kimi');
      expect(providerIds).toHaveLength(2);
    });

    it('should use Gemini 3.1 models for Google', () => {
      const googleModels = PROVIDERS.google.models;
      for (const model of googleModels) {
        expect(model).not.toMatch(/gemini-2\.5/);
        expect(model).not.toMatch(/gemini-1/);
      }
      expect(googleModels).toContain('gemini-3.1-flash-lite-preview');
      expect(googleModels).toContain('gemini-3.1-pro-preview');
    });

    it('should have Kimi K2.5 model', () => {
      expect(PROVIDERS.kimi.models).toContain('kimi-k2.5');
    });

    it('should have required fields for each provider', () => {
      for (const [id, config] of Object.entries(PROVIDERS)) {
        expect(config.name, `${id} missing name`).toBeDefined();
        expect(config.models, `${id} missing models`).toBeDefined();
        expect(config.models.length, `${id} has no models`).toBeGreaterThan(0);
        expect(config.icon, `${id} missing icon`).toBeDefined();
        expect(config.color, `${id} missing color`).toBeDefined();
      }
    });

    it('should mark both providers as recommended', () => {
      expect(PROVIDERS.google.recommended).toBe(true);
      expect(PROVIDERS.kimi.recommended).toBe(true);
    });
  });

  describe('DEFAULT_MODELS', () => {
    it('should have a default model for each provider', () => {
      for (const providerId of Object.keys(PROVIDERS)) {
        expect(DEFAULT_MODELS[providerId], `Missing default for ${providerId}`).toBeDefined();
      }
    });

    it('should reference valid models from provider config', () => {
      for (const [providerId, defaultModel] of Object.entries(DEFAULT_MODELS)) {
        if (providerId === 'gemini') continue; // alias for google
        const provider = PROVIDERS[providerId];
        if (provider) {
          expect(
            provider.models,
            `Default model '${defaultModel}' not in ${providerId} models list`
          ).toContain(defaultModel);
        }
      }
    });

    it('should use Gemini 3.1 flash-lite as Google default', () => {
      expect(DEFAULT_MODELS.google).toBe('gemini-3.1-flash-lite-preview');
    });

    it('should use kimi-k2.5 as Kimi default', () => {
      expect(DEFAULT_MODELS.kimi).toBe('kimi-k2.5');
    });
  });

  describe('getProvider', () => {
    it('should return provider config by id', () => {
      const google = getProvider('google');
      expect(google?.name).toBe('Google Gemini');
    });

    it('should be case-insensitive', () => {
      expect(getProvider('Google')).toEqual(getProvider('google'));
      expect(getProvider('Kimi')).toEqual(getProvider('kimi'));
    });

    it('should return undefined for unknown provider', () => {
      expect(getProvider('nonexistent')).toBeUndefined();
    });
  });

  describe('getDefaultModel', () => {
    it('should return default model for known provider', () => {
      expect(getDefaultModel('google')).toBe('gemini-3.1-flash-lite-preview');
      expect(getDefaultModel('kimi')).toBe('kimi-k2.5');
    });

    it('should be case-insensitive', () => {
      expect(getDefaultModel('Google')).toBe('gemini-3.1-flash-lite-preview');
    });

    it('should return gemini-3.1-flash-lite-preview for unknown provider', () => {
      expect(getDefaultModel('unknown')).toBe('gemini-3.1-flash-lite-preview');
    });
  });

  describe('getModelsForProvider', () => {
    it('should return models for known provider', () => {
      const models = getModelsForProvider('google');
      expect(models).toContain('gemini-3.1-flash-lite-preview');
      expect(models.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown provider', () => {
      expect(getModelsForProvider('unknown')).toEqual([]);
    });
  });

  describe('getProvidersList', () => {
    it('should return array of providers with ids', () => {
      const list = getProvidersList();
      expect(list.length).toBe(Object.keys(PROVIDERS).length);
      expect(list[0]).toHaveProperty('id');
      expect(list[0]).toHaveProperty('name');
      expect(list[0]).toHaveProperty('models');
    });
  });
});
