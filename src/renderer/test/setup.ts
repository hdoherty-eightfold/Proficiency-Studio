/**
 * Vitest Test Setup
 *
 * This file is executed before each test file.
 * It sets up the testing environment and mocks.
 */

import '@testing-library/jest-dom/vitest';
import { vi, afterEach } from 'vitest';

// Mock window.electron for Electron API
const mockElectronApi = {
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue({ status: 'healthy' }),
  },
  store: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  },
  secure: {
    storeCredential: vi.fn(),
    getCredential: vi.fn(),
    deleteCredential: vi.fn(),
    isAvailable: vi.fn().mockResolvedValue(true),
  },
  dialog: {
    selectFile: vi.fn(),
    selectDirectory: vi.fn(),
  },
  fs: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    isPathAllowed: vi.fn(),
    sanitizeFilename: vi.fn(),
  },
  window: {
    close: vi.fn(),
    minimize: vi.fn(),
    maximize: vi.fn(),
  },
  onMenuAction: vi.fn().mockReturnValue(() => {}),
};

// Set up window.electron mock
Object.defineProperty(window, 'electron', {
  value: mockElectronApi,
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock matchMedia for theme detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  value: ResizeObserverMock,
  writable: true,
});

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  root = null;
  rootMargin = '';
  thresholds = [];
}

Object.defineProperty(window, 'IntersectionObserver', {
  value: IntersectionObserverMock,
  writable: true,
});

// Mock scrollTo
window.scrollTo = vi.fn();

// Reset mocks between tests
afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});

// Export mock for use in tests
export { mockElectronApi, localStorageMock };
