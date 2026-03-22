import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockElectronApi } from '../test/setup';
import { electronAPI } from './electron-api';

describe('ElectronAPIService', () => {
  // ── 1. electronAPI object exists and has expected methods ──

  describe('service interface', () => {
    it('exports an electronAPI singleton', () => {
      expect(electronAPI).toBeDefined();
    });

    it.each([
      'get',
      'post',
      'put',
      'delete',
      'upload',
      'selectFile',
      'selectDirectory',
      'readFile',
      'writeFile',
      'getStoreValue',
      'setStoreValue',
      'streamAssessment',
      'cancelAssessment',
      'onAssessmentEvent',
    ])('has method %s', (method) => {
      expect(typeof (electronAPI as unknown as Record<string, unknown>)[method]).toBe('function');
    });

    it('has isElectron getter', () => {
      expect(typeof electronAPI.isElectron).toBe('boolean');
    });

    it('has platform getter', () => {
      expect(typeof electronAPI.platform).toBe('string');
    });

    it('has version getter', () => {
      expect(typeof electronAPI.version).toBe('string');
    });
  });

  // ── 2. get() ──

  describe('get()', () => {
    it('calls window.electron.api.get with endpoint only', async () => {
      const mockResponse = { data: [1, 2, 3] };
      mockElectronApi.api.get.mockResolvedValue(mockResponse);

      const result = await electronAPI.get('/skills');

      expect(mockElectronApi.api.get).toHaveBeenCalledWith('/skills', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('calls window.electron.api.get with endpoint and params', async () => {
      const params = { page: 1, limit: 10 };
      mockElectronApi.api.get.mockResolvedValue([]);

      await electronAPI.get('/skills', params);

      expect(mockElectronApi.api.get).toHaveBeenCalledWith('/skills', params);
    });
  });

  // ── 3. post() ──

  describe('post()', () => {
    it('calls window.electron.api.post with endpoint and data', async () => {
      const body = { name: 'TypeScript', category: 'Language' };
      const mockResponse = { id: 1, ...body };
      mockElectronApi.api.post.mockResolvedValue(mockResponse);

      const result = await electronAPI.post('/skills', body);

      expect(mockElectronApi.api.post).toHaveBeenCalledWith('/skills', body);
      expect(result).toEqual(mockResponse);
    });

    it('calls window.electron.api.post with endpoint only', async () => {
      mockElectronApi.api.post.mockResolvedValue({ ok: true });

      await electronAPI.post('/trigger');

      expect(mockElectronApi.api.post).toHaveBeenCalledWith('/trigger', undefined);
    });
  });

  // ── 4. upload() ──

  describe('upload()', () => {
    it('calls window.electron.api.upload with endpoint and file paths', async () => {
      const filePaths = ['/tmp/resume.pdf', '/tmp/cover.pdf'];
      const mockResponse = { uploaded: 2 };
      mockElectronApi.api.upload.mockResolvedValue(mockResponse);

      const result = await electronAPI.upload('/upload', filePaths);

      expect(mockElectronApi.api.upload).toHaveBeenCalledWith('/upload', filePaths);
      expect(result).toEqual(mockResponse);
    });
  });

  // ── 5. streamAssessment() ──

  describe('streamAssessment()', () => {
    beforeEach(() => {
      // streamAssessment is not in the base setup mock, add it
      (mockElectronApi.api as unknown as Record<string, unknown>).streamAssessment = vi.fn();
    });

    it('calls window.electron.api.streamAssessment with data', async () => {
      const data = { skills: ['TypeScript'], model: 'gemini-3.1-flash-lite-preview' };
      const mockResponse = { streamId: 'stream-123' };
      ((mockElectronApi.api as unknown as Record<string, unknown>).streamAssessment as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await electronAPI.streamAssessment(data);

      expect((mockElectronApi.api as unknown as Record<string, unknown>).streamAssessment).toHaveBeenCalledWith(data);
      expect(result).toEqual(mockResponse);
    });
  });

  // ── 6. onAssessmentEvent() ──

  describe('onAssessmentEvent()', () => {
    let mockCleanup: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockCleanup = vi.fn();
      (mockElectronApi as Record<string, unknown>).onAssessmentEvent = vi.fn().mockReturnValue(mockCleanup);
    });

    it('sets up listener and returns cleanup function', () => {
      const callback = vi.fn();

      const cleanup = electronAPI.onAssessmentEvent(callback);

      expect((mockElectronApi as Record<string, unknown>).onAssessmentEvent).toHaveBeenCalledWith(callback);
      expect(typeof cleanup).toBe('function');
    });

    it('cleanup function can be called', () => {
      const callback = vi.fn();

      const cleanup = electronAPI.onAssessmentEvent(callback);
      cleanup();

      expect(mockCleanup).toHaveBeenCalled();
    });
  });

  // ── 7. Fallback behavior when window.electron is unavailable ──

  describe('fallback when window.electron is not available', () => {
    let savedElectron: unknown;

    beforeEach(() => {
      savedElectron = window.electron;
      // Remove window.electron
      Object.defineProperty(window, 'electron', {
        value: undefined,
        writable: true,
      });
    });

    afterEach(() => {
      // Restore window.electron
      Object.defineProperty(window, 'electron', {
        value: savedElectron,
        writable: true,
      });
    });

    it('get() throws when electron is not available', async () => {
      await expect(electronAPI.get('/test')).rejects.toThrow('Electron API not available');
    });

    it('post() throws when electron is not available', async () => {
      await expect(electronAPI.post('/test')).rejects.toThrow('Electron API not available');
    });

    it('put() throws when electron is not available', async () => {
      await expect(electronAPI.put('/test')).rejects.toThrow('Electron API not available');
    });

    it('delete() throws when electron is not available', async () => {
      await expect(electronAPI.delete('/test')).rejects.toThrow('Electron API not available');
    });

    it('upload() throws when electron is not available', async () => {
      await expect(electronAPI.upload('/test', [])).rejects.toThrow('Electron API not available');
    });

    it('selectFile() throws when electron is not available', async () => {
      await expect(electronAPI.selectFile()).rejects.toThrow('Electron API not available');
    });

    it('selectDirectory() throws when electron is not available', async () => {
      await expect(electronAPI.selectDirectory()).rejects.toThrow('Electron API not available');
    });

    it('readFile() throws when electron is not available', async () => {
      await expect(electronAPI.readFile('/tmp/file.txt')).rejects.toThrow('Electron API not available');
    });

    it('writeFile() throws when electron is not available', async () => {
      await expect(electronAPI.writeFile('/tmp/file.txt', 'content')).rejects.toThrow(
        'Electron API not available',
      );
    });

    it('getStoreValue() throws when electron is not available', async () => {
      await expect(electronAPI.getStoreValue('key')).rejects.toThrow('Electron API not available');
    });

    it('setStoreValue() throws when electron is not available', async () => {
      await expect(electronAPI.setStoreValue('key', 'val')).rejects.toThrow('Electron API not available');
    });

    it('streamAssessment() throws when electron is not available', async () => {
      await expect(electronAPI.streamAssessment({})).rejects.toThrow('Electron API not available');
    });

    it('cancelAssessment() throws when electron is not available', async () => {
      await expect(electronAPI.cancelAssessment('stream-1')).rejects.toThrow('Electron API not available');
    });

    it('onAssessmentEvent() throws when electron is not available', () => {
      expect(() => electronAPI.onAssessmentEvent(vi.fn())).toThrow('Electron API not available');
    });

    it('isElectron returns false', () => {
      expect(electronAPI.isElectron).toBe(false);
    });

    it('platform returns "unknown"', () => {
      expect(electronAPI.platform).toBe('unknown');
    });

    it('version returns "unknown"', () => {
      expect(electronAPI.version).toBe('unknown');
    });
  });

  // ── 8. Store operations ──

  describe('store operations', () => {
    it('getStoreValue() calls store.get with key', async () => {
      const mockValue = { theme: 'dark' };
      mockElectronApi.store.get.mockResolvedValue(mockValue);

      const result = await electronAPI.getStoreValue('settings');

      expect(mockElectronApi.store.get).toHaveBeenCalledWith('settings');
      expect(result).toEqual(mockValue);
    });

    it('setStoreValue() calls store.set with key and value', async () => {
      mockElectronApi.store.set.mockResolvedValue(undefined);

      await electronAPI.setStoreValue('settings', { theme: 'light' });

      expect(mockElectronApi.store.set).toHaveBeenCalledWith('settings', { theme: 'light' });
    });

    it('getStoreValue() returns typed result', async () => {
      mockElectronApi.store.get.mockResolvedValue(42);

      const result = await electronAPI.getStoreValue<number>('count');

      expect(result).toBe(42);
    });
  });

  // ── Additional coverage ──

  describe('put()', () => {
    it('calls window.electron.api.put with endpoint and data', async () => {
      const body = { name: 'Updated Skill' };
      mockElectronApi.api.put.mockResolvedValue({ ok: true });

      const result = await electronAPI.put('/skills/1', body);

      expect(mockElectronApi.api.put).toHaveBeenCalledWith('/skills/1', body);
      expect(result).toEqual({ ok: true });
    });
  });

  describe('delete()', () => {
    it('calls window.electron.api.delete with endpoint', async () => {
      mockElectronApi.api.delete.mockResolvedValue({ deleted: true });

      const result = await electronAPI.delete('/skills/1');

      expect(mockElectronApi.api.delete).toHaveBeenCalledWith('/skills/1');
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('cancelAssessment()', () => {
    beforeEach(() => {
      (mockElectronApi.api as unknown as Record<string, unknown>).cancelAssessment = vi.fn();
    });

    it('calls window.electron.api.cancelAssessment with streamId', async () => {
      const mockResponse = { success: true };
      ((mockElectronApi.api as unknown as Record<string, unknown>).cancelAssessment as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await electronAPI.cancelAssessment('stream-abc');

      expect((mockElectronApi.api as unknown as Record<string, unknown>).cancelAssessment).toHaveBeenCalledWith('stream-abc');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('selectFile()', () => {
    beforeEach(() => {
      (mockElectronApi as Record<string, unknown>).selectFile = vi.fn();
    });

    it('calls window.electron.selectFile with options', async () => {
      const options = { title: 'Open', filters: [{ name: 'PDF', extensions: ['pdf'] }] };
      const mockPaths = ['/tmp/file.pdf'];
      ((mockElectronApi as Record<string, unknown>).selectFile as ReturnType<typeof vi.fn>).mockResolvedValue(mockPaths);

      const result = await electronAPI.selectFile(options);

      expect((mockElectronApi as Record<string, unknown>).selectFile).toHaveBeenCalledWith(options);
      expect(result).toEqual(mockPaths);
    });
  });

  describe('selectDirectory()', () => {
    beforeEach(() => {
      (mockElectronApi as Record<string, unknown>).selectDirectory = vi.fn();
    });

    it('calls window.electron.selectDirectory with options', async () => {
      const options = { title: 'Select Folder' };
      ((mockElectronApi as Record<string, unknown>).selectDirectory as ReturnType<typeof vi.fn>).mockResolvedValue('/tmp/folder');

      const result = await electronAPI.selectDirectory(options);

      expect((mockElectronApi as Record<string, unknown>).selectDirectory).toHaveBeenCalledWith(options);
      expect(result).toBe('/tmp/folder');
    });
  });

  describe('readFile()', () => {
    beforeEach(() => {
      (mockElectronApi as Record<string, unknown>).readFile = vi.fn();
    });

    it('calls window.electron.readFile with path', async () => {
      ((mockElectronApi as Record<string, unknown>).readFile as ReturnType<typeof vi.fn>).mockResolvedValue('file contents');

      const result = await electronAPI.readFile('/tmp/test.txt');

      expect((mockElectronApi as Record<string, unknown>).readFile).toHaveBeenCalledWith('/tmp/test.txt');
      expect(result).toBe('file contents');
    });
  });

  describe('writeFile()', () => {
    beforeEach(() => {
      (mockElectronApi as Record<string, unknown>).writeFile = vi.fn();
    });

    it('calls window.electron.writeFile with path and content', async () => {
      ((mockElectronApi as Record<string, unknown>).writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await electronAPI.writeFile('/tmp/out.txt', 'hello');

      expect((mockElectronApi as Record<string, unknown>).writeFile).toHaveBeenCalledWith('/tmp/out.txt', 'hello');
    });
  });

  describe('property getters', () => {
    it('isElectron returns true when window.electron exists', () => {
      expect(electronAPI.isElectron).toBe(true);
    });

    it('platform returns window.electron.platform', () => {
      (mockElectronApi as Record<string, unknown>).platform = 'darwin';
      expect(electronAPI.platform).toBe('darwin');
    });

    it('version returns window.electron.version', () => {
      (mockElectronApi as Record<string, unknown>).version = '28.0.0';
      expect(electronAPI.version).toBe('28.0.0');
    });
  });
});
