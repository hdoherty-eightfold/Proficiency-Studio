/**
 * Tests for Settings Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';
import React from 'react';

// Mock stores
vi.mock('../../stores/toast-store', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
  useToastStore: vi.fn(() => ({
    addToast: vi.fn(),
  })),
}));

vi.mock('../../stores/theme-store', () => ({
  useThemeStore: vi.fn((selector) => {
    const state = {
      theme: 'system',
      setTheme: vi.fn(),
      toggleTheme: vi.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      vector_db: { type: 'chromadb', options: [{ id: 'chromadb', name: 'ChromaDB' }] },
      ai_inference: { provider: 'gemini', options: [{ id: 'gemini', name: 'Google Gemini' }] },
      api_keys: { gemini_configured: false, kimi_configured: false },
    }),
    post: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../../services/electron-api', () => ({
  electronApi: {
    store: { get: vi.fn(), set: vi.fn() },
  },
}));

let Settings: React.ComponentType;

beforeAll(async () => {
  const mod = await import('./Settings');
  Settings = mod.default;
});

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  it('should render the settings page heading', () => {
    renderWithUser(<Settings />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should show appearance tab content by default', () => {
    renderWithUser(<Settings />);
    expect(screen.getByText('Customize the look and feel of the application')).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Choose your preferred color scheme')).toBeInTheDocument();
  });

  it('should show theme options (Light, Dark, System)', () => {
    renderWithUser(<Settings />);
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('should show display options section', () => {
    renderWithUser(<Settings />);
    expect(screen.getByText('Display Options')).toBeInTheDocument();
    expect(screen.getByText('Reduced Motion')).toBeInTheDocument();
    expect(screen.getByText('Compact Mode')).toBeInTheDocument();
  });

  it('should show all sidebar navigation tabs', () => {
    renderWithUser(<Settings />);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('API Keys')).toBeInTheDocument();
    expect(screen.getByText('AI & Data')).toBeInTheDocument();
    expect(screen.getByText('Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('should show notifications tab when clicked', async () => {
    const { user } = renderWithUser(<Settings />);
    await user.click(screen.getByText('Notifications'));
    expect(screen.getByText('In-App Notifications')).toBeInTheDocument();
    expect(screen.getByText('Desktop Notifications')).toBeInTheDocument();
  });

  it('should show API Keys tab when clicked', async () => {
    const { user } = renderWithUser(<Settings />);
    await user.click(screen.getByText('API Keys'));
    expect(screen.getByText('Google Gemini API Key')).toBeInTheDocument();
    expect(screen.getByText(/Kimi API Key/)).toBeInTheDocument();
  });

  it('should show shortcuts tab when clicked', async () => {
    const { user } = renderWithUser(<Settings />);
    await user.click(screen.getByText('Shortcuts'));
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Command Palette')).toBeInTheDocument();
    expect(screen.getByText('Toggle Theme')).toBeInTheDocument();
  });

  it('should show security tab when clicked', async () => {
    const { user } = renderWithUser(<Settings />);
    await user.click(screen.getByText('Security'));
    expect(screen.getByText('Security & Privacy')).toBeInTheDocument();
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
    expect(screen.getByText('Reset Data')).toBeInTheDocument();
  });

  it('should show about tab with version info when clicked', async () => {
    const { user } = renderWithUser(<Settings />);
    await user.click(screen.getByText('About'));
    expect(screen.getByText('About Proficiency Studio')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
    expect(screen.getByText('Version')).toBeInTheDocument();
    expect(screen.getByText('Documentation')).toBeInTheDocument();
    expect(screen.getByText('Release Notes')).toBeInTheDocument();
  });
});
