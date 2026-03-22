/**
 * Tests for ConfigureProficiency Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';
import React from 'react';

// Mock stores
vi.mock('../../stores/app-store', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      skillsState: {
        skills: [{ name: 'TypeScript', category: 'Programming' }],
        totalCount: 1,
        extractionStatus: 'success',
        extractionSource: 'csv',
        extractionError: null,
        extractedAt: new Date().toISOString(),
      },
      isLoading: false,
      nextStep: vi.fn(),
      markStepCompleted: vi.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

vi.mock('../../stores/toast-store', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
  useToastStore: vi.fn(() => ({
    addToast: vi.fn(),
  })),
}));

vi.mock('../../config/models', () => ({
  PROVIDERS: {
    google: { name: 'Google Gemini', models: ['gemini-3.1-flash-lite-preview', 'gemini-3.1-pro-preview'], icon: '✨', color: 'blue' },
    kimi: { name: 'Kimi (Moonshot AI)', models: ['kimi-k2.5'], icon: '🌙', color: 'indigo' },
  },
  DEFAULT_MODELS: { google: 'gemini-3.1-flash-lite-preview', kimi: 'kimi-k2.5' },
  getProvider: vi.fn(),
  getDefaultModel: vi.fn(() => 'gemini-3.1-flash-lite-preview'),
  getModelsForProvider: vi.fn(() => ['gemini-3.1-flash-lite-preview']),
  getProvidersList: vi.fn(() => []),
}));

let ConfigureProficiency: React.ComponentType;

beforeAll(async () => {
  const mod = await import('./ConfigureProficiency');
  ConfigureProficiency = mod.default;
});

describe('ConfigureProficiency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the configuration page heading', () => {
    renderWithUser(<ConfigureProficiency />);
    expect(screen.getByText('Configure Proficiency Assessment')).toBeInTheDocument();
  });

  it('should show proficiency levels', () => {
    renderWithUser(<ConfigureProficiency />);
    // Default levels include Novice through Expert
    expect(screen.getByText(/Novice/)).toBeInTheDocument();
  });

  it('should show LLM provider selection', () => {
    renderWithUser(<ConfigureProficiency />);
    const providerElements = screen.getAllByText(/Provider|Model/i);
    expect(providerElements.length).toBeGreaterThan(0);
  });

  it('should show prompt template section', () => {
    renderWithUser(<ConfigureProficiency />);
    const promptElements = screen.getAllByText(/Prompt|Template/i);
    expect(promptElements.length).toBeGreaterThan(0);
  });
});
