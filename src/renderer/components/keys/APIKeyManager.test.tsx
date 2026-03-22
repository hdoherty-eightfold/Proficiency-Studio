/**
 * Tests for APIKeyManager Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';
import React from 'react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock api service
vi.mock('../../services/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

// Mock electron-api
vi.mock('../../services/electron-api', () => ({
  electronAPI: {},
}));

// Dynamic import to apply mocks first
let APIKeyManager: React.FC<{
  onKeySelect?: (provider: string, keyId: string) => void;
  selectedProvider?: string;
  selectedKeyId?: string;
}>;

beforeAll(async () => {
  const mod = await import('./APIKeyManager');
  APIKeyManager = mod.APIKeyManager;
});

describe('APIKeyManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('should render the heading and description', () => {
    renderWithUser(<APIKeyManager />);
    expect(screen.getByText('LLM API Keys')).toBeInTheDocument();
    expect(screen.getByText('Manage your API keys for different LLM providers')).toBeInTheDocument();
  });

  it('should render the Add Key button', () => {
    renderWithUser(<APIKeyManager />);
    expect(screen.getByText('+ Add Key')).toBeInTheDocument();
  });

  it('should show empty state when no keys are configured', () => {
    renderWithUser(<APIKeyManager />);
    expect(screen.getByText('No API keys configured.')).toBeInTheDocument();
    expect(screen.getByText(/Click "\+ Add Key" above/)).toBeInTheDocument();
  });

  it('should show add form with provider, model, name, and key fields when Add Key is clicked', async () => {
    const { user } = renderWithUser(<APIKeyManager />);
    await user.click(screen.getByText('+ Add Key'));

    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByText('Model')).toBeInTheDocument();
    expect(screen.getByText('Key Name')).toBeInTheDocument();
    expect(screen.getByText('API Key')).toBeInTheDocument();
  });

  it('should show input fields for key name and API key in the add form', async () => {
    const { user } = renderWithUser(<APIKeyManager />);
    await user.click(screen.getByText('+ Add Key'));

    expect(screen.getByPlaceholderText('e.g., Production Gemini Key')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your API key...')).toBeInTheDocument();
  });

  it('should show Add Key and Cancel buttons in the add form', async () => {
    const { user } = renderWithUser(<APIKeyManager />);
    await user.click(screen.getByText('+ Add Key'));

    // There are now two "Add Key" elements: the top button (disabled) and the form submit button
    const addKeyButtons = screen.getAllByText('Add Key');
    expect(addKeyButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should render existing keys with Test and Delete buttons', async () => {
    const existingKeys = [
      {
        id: 'google-123',
        provider: 'google',
        name: 'My Gemini Key',
        key: 'AIzaSyABCDEFGH123456',
        model: 'gemini-3.1-flash-lite-preview',
        status: 'untested',
        created_at: '2026-01-01T00:00:00Z',
      },
    ];
    // Mock PersistentStore to return existing keys
    (window.electron.store.get as ReturnType<typeof vi.fn>).mockResolvedValue(existingKeys);

    renderWithUser(<APIKeyManager />);

    expect(await screen.findByText('My Gemini Key')).toBeInTheDocument();
    expect(screen.getByText('untested')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('should show the model badge for a saved key', async () => {
    const existingKeys = [
      {
        id: 'kimi-456',
        provider: 'kimi',
        name: 'My Kimi Key',
        key: 'sk-abcdefghijklmnop',
        model: 'kimi-k2.5',
        status: 'valid',
        created_at: '2026-01-01T00:00:00Z',
      },
    ];
    // Mock PersistentStore to return existing keys
    (window.electron.store.get as ReturnType<typeof vi.fn>).mockResolvedValue(existingKeys);

    renderWithUser(<APIKeyManager />);

    expect(await screen.findByText('My Kimi Key')).toBeInTheDocument();
    expect(screen.getByText('kimi-k2.5')).toBeInTheDocument();
    expect(screen.getByText('valid')).toBeInTheDocument();
  });

  it('should show toggle visibility button for the API key input', async () => {
    const { user } = renderWithUser(<APIKeyManager />);
    await user.click(screen.getByText('+ Add Key'));

    expect(screen.getByLabelText('Show API key')).toBeInTheDocument();
  });
});
