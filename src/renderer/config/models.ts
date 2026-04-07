/**
 * Centralized LLM Provider and Model Configuration
 *
 * This is the SINGLE SOURCE OF TRUTH for all LLM providers and their models.
 * All other files should import from here.
 */

export interface ProviderConfig {
  name: string;
  models: string[];
  icon: string;
  color: string;
  free?: boolean;
  premium?: boolean;
  local?: boolean;
  recommended?: boolean;
  description?: string;
  noApiKey?: boolean;
}

// =============================================================================
// PROVIDER CONFIGURATIONS - EDIT HERE TO ADD/REMOVE MODELS
// =============================================================================

export const PROVIDERS: Record<string, ProviderConfig> = {
  google: {
    name: 'Google Gemini',
    icon: '✨',
    color: 'blue',
    models: ['gemini-3.1-flash-lite-preview', 'gemini-3.1-pro-preview'],
    free: true,
    recommended: true,
    description: 'Gemini 3.1, fast and FREE',
  },
  kimi: {
    name: 'Kimi (Moonshot AI)',
    icon: '🌙',
    color: 'indigo',
    models: ['kimi-k2.5'],
    recommended: true,
    description: 'Kimi K2.5 - 256K context, multimodal agentic model',
  },
};

// Default models for each provider
export const DEFAULT_MODELS: Record<string, string> = {
  google: 'gemini-3.1-flash-lite-preview',
  gemini: 'gemini-3.1-flash-lite-preview',
  kimi: 'kimi-k2.5',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getProvider(providerId: string): ProviderConfig | undefined {
  return PROVIDERS[providerId.toLowerCase()];
}

export function getDefaultModel(providerId: string): string {
  return DEFAULT_MODELS[providerId.toLowerCase()] || 'gemini-3.1-flash-lite-preview';
}

export function getModelsForProvider(providerId: string): string[] {
  const provider = PROVIDERS[providerId.toLowerCase()];
  return provider?.models || [];
}

export function getProvidersList(): Array<ProviderConfig & { id: string }> {
  return Object.entries(PROVIDERS).map(([id, config]) => ({
    id,
    ...config,
  }));
}

/**
 * Returns the fallback provider ID and default model when the primary fails.
 * Order: google → kimi → google (cycles through available providers).
 */
export function getFallbackProvider(
  primaryProviderId: string
): { provider: string; model: string } | null {
  const providers = Object.keys(PROVIDERS);
  const primaryIdx = providers.indexOf(primaryProviderId.toLowerCase());
  if (primaryIdx === -1 || providers.length < 2) return null;
  const fallbackId = providers[(primaryIdx + 1) % providers.length];
  return { provider: fallbackId, model: getDefaultModel(fallbackId) };
}
