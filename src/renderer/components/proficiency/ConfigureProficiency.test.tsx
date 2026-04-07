/**
 * Tests for ConfigureProficiency Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';
import { createSkills } from '../../test/factories';
import React from 'react';

// Mock stores
vi.mock('../../stores/app-store', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      skillsState: {
        skills: createSkills(3),
        totalCount: 3,
        extractionStatus: 'success',
        extractionSource: 'csv',
        extractionError: null,
        extractedAt: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
      nextStep: vi.fn(),
      previousStep: vi.fn(),
      setError: vi.fn(),
      setCurrentStep: vi.fn(),
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
    google: {
      name: 'Google Gemini',
      models: ['gemini-3.1-flash-lite-preview', 'gemini-3.1-pro-preview'],
      icon: '✨',
      color: 'blue',
    },
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

  it('shows the three confidence mode radio buttons', () => {
    renderWithUser(<ConfigureProficiency />);
    // Each button has an explicit aria-label matching its title
    expect(screen.getByRole('radio', { name: 'Basic' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Confidence' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Full Detail' })).toBeInTheDocument();
  });

  it('Confidence mode is selected by default', () => {
    renderWithUser(<ConfigureProficiency />);
    expect(screen.getByRole('radio', { name: 'Confidence' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByRole('radio', { name: 'Basic' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: 'Full Detail' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('shows the confidence explanation callout when Confidence mode is active', () => {
    renderWithUser(<ConfigureProficiency />);
    expect(screen.getByText(/What is confidence/i)).toBeInTheDocument();
  });

  it('hides the confidence callout when Basic mode is selected', async () => {
    const { user } = renderWithUser(<ConfigureProficiency />);
    await user.click(screen.getByRole('radio', { name: 'Basic' }));
    expect(screen.queryByText(/What is confidence/i)).not.toBeInTheDocument();
  });

  it('shows reasoning note in callout when Full Detail is selected', async () => {
    const { user } = renderWithUser(<ConfigureProficiency />);
    await user.click(screen.getByRole('radio', { name: 'Full Detail' }));
    expect(screen.getByText(/What is confidence/i)).toBeInTheDocument();
    expect(screen.getByText(/Reasoning explains/i)).toBeInTheDocument();
  });

  it('switching to Full Detail mode updates the live preview to include reasoning field', async () => {
    const { user } = renderWithUser(<ConfigureProficiency />);
    await user.click(screen.getByRole('radio', { name: 'Full Detail' }));
    // The detailed template includes "reasoning" in its output format instructions
    const preview = document.querySelector('pre');
    expect(preview?.textContent).toMatch(/reasoning/i);
  });

  it('switching to Basic mode updates the live preview — no confidence field', async () => {
    const { user } = renderWithUser(<ConfigureProficiency />);
    await user.click(screen.getByRole('radio', { name: 'Basic' }));
    const preview = document.querySelector('pre');
    // Basic template only has proficiency_level, no confidence_score line
    expect(preview?.textContent).not.toMatch(/confidence_score/i);
  });
});
