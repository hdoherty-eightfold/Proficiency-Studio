/**
 * Unit tests for IPC handlers
 *
 * Tests the setupIpcHandlers function: store operations, log bridge,
 * and path validation for file operations.
 *
 * Electron-specific APIs (BrowserWindow, dialog, safeStorage) and
 * network calls (axios) are mocked. The tests verify handler registration
 * and logic in isolation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so mock objects exist before vi.mock runs
const { mockLog, mockStore, mockAxios } = vi.hoisted(() => {
  const mockLog = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  const mockStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  };

  const mockAxios = {
    create: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({ status: 200, data: { status: 'healthy' } }),
      post: vi.fn().mockResolvedValue({ status: 200, data: {} }),
      put: vi.fn().mockResolvedValue({ status: 200, data: {} }),
      delete: vi.fn().mockResolvedValue({ status: 200, data: {} }),
    })),
    get: vi.fn().mockResolvedValue({ status: 200, data: { status: 'healthy' } }),
    isAxiosError: vi.fn(() => false),
  };

  return { mockLog, mockStore, mockAxios };
});

vi.mock('electron-log', () => ({
  default: mockLog,
  ...mockLog,
}));

vi.mock('electron', () => ({
  dialog: { showOpenDialog: vi.fn() },
  BrowserWindow: { fromWebContents: vi.fn() },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => false),
    encryptString: vi.fn(),
    decryptString: vi.fn(),
  },
  app: { getPath: vi.fn(() => '/tmp/test') },
}));

vi.mock('axios', () => ({
  default: mockAxios,
  ...mockAxios,
}));

vi.mock('form-data', () => ({
  default: class FormData {
    append = vi.fn();
    getHeaders = vi.fn(() => ({}));
  },
}));

// Mock fs/promises for file operation tests
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal();
  const mod = {
    ...(actual as Record<string, unknown>),
    readFile: vi.fn().mockResolvedValue('file content'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    mkdir: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
  };
  (mod as Record<string, unknown>).default = mod;
  return mod;
});

vi.mock('./utils/path-validator.js', () => ({
  validateAndSanitizePath: vi.fn((p: string) => p),
  isPathAllowed: vi.fn(() => true),
  sanitizeFilename: vi.fn((f: string) => f),
}));

import { setupIpcHandlers } from './ipc-handlers.js';

// Helper: create a typed mock IpcMain
function createMockIpcMain() {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const listeners = new Map<string, (...args: unknown[]) => void>();

  return {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    }),
    on: vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
      listeners.set(channel, listener);
    }),
    _handlers: handlers,
    _listeners: listeners,
    _invoke: async (channel: string, ...args: unknown[]) => {
      const handler = handlers.get(channel);
      if (!handler) throw new Error(`No handler for channel: ${channel}`);
      return handler({} as unknown, ...args);
    },
    _emit: (channel: string, ...args: unknown[]) => {
      const listener = listeners.get(channel);
      if (listener) listener({} as unknown, ...args);
    },
  };
}

describe('setupIpcHandlers', () => {
  let ipcMain: ReturnType<typeof createMockIpcMain>;

  beforeEach(() => {
    ipcMain = createMockIpcMain();
    vi.clearAllMocks();
    mockStore.get.mockReturnValue(undefined);
    setupIpcHandlers(ipcMain as never, mockStore);
  });

  describe('Store operations', () => {
    it('store:get returns stored value', async () => {
      mockStore.get.mockReturnValue('stored-value');
      const result = await ipcMain._invoke('store:get', 'theme');
      expect(mockStore.get).toHaveBeenCalledWith('theme');
      expect(result).toBe('stored-value');
    });

    it('store:set calls store.set with allowed key and value', async () => {
      await ipcMain._invoke('store:set', 'theme', 'dark');
      expect(mockStore.set).toHaveBeenCalledWith('theme', 'dark');
    });

    it('store:set rejects disallowed keys', async () => {
      await expect(ipcMain._invoke('store:set', 'arbitrary-key', 'value')).rejects.toThrow(
        'Store key not permitted'
      );
    });

    it('store:delete calls store.delete', async () => {
      await ipcMain._invoke('store:delete', 'theme');
      expect(mockStore.delete).toHaveBeenCalledWith('theme');
    });

    it('store:clear calls store.clear', async () => {
      await ipcMain._invoke('store:clear');
      expect(mockStore.clear).toHaveBeenCalled();
    });
  });

  describe('Log bridge', () => {
    it('log:renderer forwards info logs to electron-log', () => {
      ipcMain._emit('log:renderer', 'info', 'hello from renderer', 'extra-arg');
      expect(mockLog.info).toHaveBeenCalledWith('[renderer]', 'hello from renderer', 'extra-arg');
    });

    it('log:renderer forwards warn logs to electron-log', () => {
      ipcMain._emit('log:renderer', 'warn', 'warning message');
      expect(mockLog.warn).toHaveBeenCalledWith('[renderer]', 'warning message');
    });

    it('log:renderer forwards error logs to electron-log', () => {
      ipcMain._emit('log:renderer', 'error', 'something broke');
      expect(mockLog.error).toHaveBeenCalledWith('[renderer]', 'something broke');
    });
  });

  describe('Path validation (fs:is-path-allowed)', () => {
    it('returns true for allowed paths', async () => {
      const { isPathAllowed } = await import('./utils/path-validator.js');
      vi.mocked(isPathAllowed).mockReturnValue(true);
      const result = await ipcMain._invoke('fs:is-path-allowed', '/allowed/path.txt');
      expect(result).toBe(true);
    });

    it('returns false for disallowed paths', async () => {
      const { isPathAllowed } = await import('./utils/path-validator.js');
      vi.mocked(isPathAllowed).mockReturnValue(false);
      const result = await ipcMain._invoke('fs:is-path-allowed', '/etc/passwd');
      expect(result).toBe(false);
    });
  });

  describe('Secure storage fallback', () => {
    it('falls back to regular store when encryption unavailable', async () => {
      const { safeStorage } = await import('electron');
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);

      const result = await ipcMain._invoke(
        'secure:store-credential',
        'GEMINI_API_KEY',
        'sk-test-key'
      );
      expect(result).toMatchObject({ success: true, secure: false });
      expect(mockStore.set).toHaveBeenCalledWith('credentials.GEMINI_API_KEY', 'sk-test-key');
    });
  });

  describe('Handler registration', () => {
    it('registers all expected IPC channels', () => {
      const expectedHandles = [
        'store:get',
        'store:set',
        'store:delete',
        'store:clear',
        'secure:store-credential',
        'secure:get-credential',
        'secure:delete-credential',
        'secure:is-available',
        'dialog:select-file',
        'dialog:select-directory',
        'fs:read-file',
        'fs:write-file',
        'fs:is-path-allowed',
        'fs:sanitize-filename',
        'api:get',
        'api:post',
        'api:put',
        'api:delete',
        'api:upload',
        'api:stream-assessment',
        'api:cancel-assessment',
        'assessment:save-results',
        'assessment:list-saved',
        'assessment:load-saved',
        'assessment:delete-saved',
        'llm:test-key',
      ];
      for (const channel of expectedHandles) {
        expect(ipcMain._handlers.has(channel), `Missing handle: ${channel}`).toBe(true);
      }
    });

    it('registers expected IPC listeners', () => {
      const expectedListeners = [
        'window:close',
        'window:minimize',
        'window:maximize',
        'log:renderer',
      ];
      for (const channel of expectedListeners) {
        expect(ipcMain._listeners.has(channel), `Missing listener: ${channel}`).toBe(true);
      }
    });
  });
});
