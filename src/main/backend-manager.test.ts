/**
 * Tests for BackendManager
 *
 * Tests mock all Electron/Node dependencies to verify BackendManager
 * logic in isolation: initialization, port finding, URL formatting,
 * data directories, and shutdown.
 *
 * NOTE: The full start() flow requires complex timer mocking due to
 * the health check polling loop. The start→healthy path is best tested
 * via integration/E2E tests with a real backend.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so mock objects are available in vi.mock factory functions
const { mockProcess, mockStdout, mockStderr, mockServer } = vi.hoisted(() => {
  const mockStdout = { on: vi.fn() };
  const mockStderr = { on: vi.fn() };
  const mockProcess = {
    stdout: mockStdout,
    stderr: mockStderr,
    on: vi.fn(),
    once: vi.fn(),
    kill: vi.fn(),
    exitCode: null as number | null,
    pid: 12345,
  };
  const mockServer = {
    listen: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    address: vi.fn().mockReturnValue({ port: 54321 }),
  };
  return { mockProcess, mockStdout, mockStderr, mockServer };
});

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/tmp/test-user-data'),
    isPackaged: false,
  },
}));

// Mock electron-log
vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock child_process
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal();
  const mod = { ...(actual as Record<string, unknown>) };
  mod.spawn = vi.fn().mockReturnValue(mockProcess);
  mod.default = mod;
  return mod;
});

// Mock net
vi.mock('net', async (importOriginal) => {
  const actual = await importOriginal();
  const mod = { ...(actual as Record<string, unknown>) };
  mod.createServer = vi.fn().mockReturnValue(mockServer);
  mod.default = mod;
  return mod;
});

// Mock fs
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  const mod = { ...(actual as Record<string, unknown>) };
  mod.existsSync = vi.fn().mockReturnValue(false);
  mod.mkdirSync = vi.fn();
  mod.copyFileSync = vi.fn();
  mod.readdirSync = vi.fn().mockReturnValue([]);
  mod.default = mod;
  return mod;
});

// Mock http — return healthy response immediately
vi.mock('http', async (importOriginal) => {
  const actual = await importOriginal();
  const mod = { ...(actual as Record<string, unknown>) };
  mod.get = vi.fn(
    (
      _url: string,
      _opts: Record<string, unknown>,
      callback: (res: { statusCode: number; resume: () => void }) => void
    ) => {
      // Immediately call callback with healthy response (including resume for socket drain)
      callback({ statusCode: 200, resume: vi.fn() });
      return { on: vi.fn().mockReturnThis(), destroy: vi.fn() };
    }
  );
  mod.default = mod;
  return mod;
});

import { BackendManager } from './backend-manager';
import type { SimpleStore } from './backend-manager';

describe('BackendManager', () => {
  let manager: BackendManager;
  let mockStore: SimpleStore;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new BackendManager();
    mockStore = {
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
    };

    // Reset mock process state
    mockProcess.exitCode = null;
    mockProcess.on.mockReset();
    mockProcess.once.mockReset();
    mockProcess.kill.mockReset();
    mockStdout.on.mockReset();
    mockStderr.on.mockReset();

    // Set up server.listen to call the callback
    mockServer.listen.mockImplementation((_port: number, _host: string, callback: () => void) => {
      callback();
    });
    mockServer.close.mockImplementation((callback: (err?: Error) => void) => {
      callback();
    });
  });

  describe('initialization', () => {
    it('should start in non-running state', () => {
      expect(manager.isRunning()).toBe(false);
      expect(manager.getPort()).toBe(0);
    });

    it('should return URL with port 0 before start', () => {
      expect(manager.getUrl()).toBe('http://127.0.0.1:0');
    });
  });

  describe('stop', () => {
    it('should resolve immediately if no process is running', async () => {
      await expect(manager.stop()).resolves.toBeUndefined();
    });

    it('should not throw when called multiple times', async () => {
      await manager.stop();
      await manager.stop();
    });
  });

  describe('getUrl', () => {
    it('should return localhost URL with the assigned port', () => {
      expect(manager.getUrl()).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    });
  });

  describe('start (with immediately-healthy mock)', () => {
    it('should find a free port and become running', async () => {
      await manager.start(mockStore);

      expect(manager.getPort()).toBe(54321);
      expect(manager.isRunning()).toBe(true);
      expect(manager.getUrl()).toBe('http://127.0.0.1:54321');
    });

    it('should spawn the backend process with correct args', async () => {
      const { spawn } = await import('child_process');

      await manager.start(mockStore);

      expect(spawn).toHaveBeenCalled();
      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const spawnArgs = spawnCall[1] as string[];
      expect(spawnArgs).toContain('--port');
      expect(spawnArgs).toContain('54321');
      expect(spawnArgs).toContain('--host');
      expect(spawnArgs).toContain('127.0.0.1');
    });

    it('should pass API keys from store as env vars', async () => {
      const { spawn } = await import('child_process');

      mockStore.get = vi.fn().mockImplementation((key: string) => {
        if (key === 'apiKeys.gemini') return 'test-gemini-key';
        if (key === 'apiKeys.kimi') return 'test-kimi-key';
        return undefined;
      });

      await manager.start(mockStore);

      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const spawnOptions = spawnCall[2] as { env: Record<string, string> };
      expect(spawnOptions.env.GEMINI_API_KEY).toBe('test-gemini-key');
      expect(spawnOptions.env.KIMI_API_KEY).toBe('test-kimi-key');
      expect(spawnOptions.env.PROFSTUDIO_PORT).toBe('54321');
      expect(spawnOptions.env.PROFSTUDIO_BASE_DIR).toContain('backend-data');
    });

    it('should create data directories on start', async () => {
      const { mkdirSync } = await import('fs');

      await manager.start(mockStore);

      expect(mkdirSync).toHaveBeenCalled();
      const mkdirCalls = vi.mocked(mkdirSync).mock.calls;
      const createdPaths = mkdirCalls.map((call) => String(call[0]));
      expect(createdPaths.some((p) => p.includes('data'))).toBe(true);
      expect(createdPaths.some((p) => p.includes('uploads'))).toBe(true);
      expect(createdPaths.some((p) => p.includes('exports'))).toBe(true);
      expect(createdPaths.some((p) => p.includes('vector_db'))).toBe(true);
      expect(createdPaths.some((p) => p.includes('embeddings'))).toBe(true);
    });

    it('should return same port if already running', async () => {
      const port1 = await manager.start(mockStore);
      const port2 = await manager.start(mockStore);
      expect(port1).toBe(port2);
    });

    it('should set ENVIRONMENT to development when app is not packaged', async () => {
      const { spawn } = await import('child_process');

      await manager.start(mockStore);

      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const spawnOptions = spawnCall[2] as { env: Record<string, string> };
      // app.isPackaged is false in the test mock, so ENVIRONMENT should be 'development'
      expect(spawnOptions.env.ENVIRONMENT).toBe('development');
    });

    it('should generate and pass ENCRYPTION_KEY to backend', async () => {
      const { spawn } = await import('child_process');

      await manager.start(mockStore);

      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const spawnOptions = spawnCall[2] as { env: Record<string, string> };
      expect(spawnOptions.env.ENCRYPTION_KEY).toBeDefined();
      expect(spawnOptions.env.ENCRYPTION_KEY).toHaveLength(64); // 32 bytes as hex
    });

    it('should persist ENCRYPTION_KEY in store for reuse', async () => {
      await manager.start(mockStore);

      expect(mockStore.set).toHaveBeenCalledWith('encryptionKey', expect.any(String));
    });

    it('should reuse existing ENCRYPTION_KEY from store', async () => {
      const existingKey = 'a'.repeat(64);
      mockStore.get = vi.fn().mockImplementation((key: string) => {
        if (key === 'encryptionKey') return existingKey;
        return undefined;
      });

      const { spawn } = await import('child_process');
      await manager.start(mockStore);

      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const spawnOptions = spawnCall[2] as { env: Record<string, string> };
      expect(spawnOptions.env.ENCRYPTION_KEY).toBe(existingKey);
      // Should not generate a new key
      expect(mockStore.set).not.toHaveBeenCalledWith('encryptionKey', expect.any(String));
    });
  });

  describe('stop after start', () => {
    it('should send SIGTERM to the process', async () => {
      await manager.start(mockStore);

      // Simulate the process exit handler
      const exitCallback = mockProcess.once.mock.calls.find(
        (call: unknown[]) => call[0] === 'exit'
      );

      const stopPromise = manager.stop();

      // Find the 'exit' listener added by stop() and trigger it
      const stopExitCallback = mockProcess.once.mock.calls.find(
        (call: unknown[], i: number) =>
          call[0] === 'exit' &&
          i > (exitCallback ? mockProcess.once.mock.calls.indexOf(exitCallback) : -1)
      );
      if (stopExitCallback) {
        (stopExitCallback[1] as () => void)();
      }

      await stopPromise;
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(manager.isRunning()).toBe(false);
    });
  });
});
