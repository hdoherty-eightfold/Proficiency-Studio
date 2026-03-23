/**
 * BackendManager - Manages the Python FastAPI backend process lifecycle.
 *
 * In dev mode: spawns `python main.py --port <port>` from the backend source directory.
 * In production: spawns the PyInstaller-built binary from app resources.
 *
 * Responsibilities:
 * - Find a free port
 * - Spawn the backend process with correct env vars
 * - Health check polling until backend is ready
 * - Graceful shutdown on app quit
 * - First-run data directory initialization
 */

import { ChildProcess, spawn } from 'child_process';
import { createServer, AddressInfo } from 'net';
import { join } from 'path';
import { mkdirSync, existsSync, copyFileSync, readdirSync } from 'fs';
import { app, BrowserWindow } from 'electron';
import log from 'electron-log';
import * as http from 'http';

/** How long to wait for backend to become healthy (ms) */
const HEALTH_TIMEOUT = 60_000;
/** Interval between health check polls (ms) */
const HEALTH_POLL_INTERVAL = 500;
/** How long to wait for graceful shutdown before SIGKILL (ms) */
const SHUTDOWN_GRACE_PERIOD = 5_000;
/** Maximum number of automatic restart attempts after crash */
const MAX_RESTART_ATTEMPTS = 3;
/** Base delay between restart attempts (doubles each time) */
const RESTART_BASE_DELAY = 2_000;

export interface SimpleStore {
  get(key: string, defaultValue?: unknown): unknown;
  set(key: string, value: unknown): void;
}

export class BackendManager {
  private process: ChildProcess | null = null;
  private port = 0;
  private _isRunning = false;
  private shutdownPromise: Promise<void> | null = null;
  private store: SimpleStore | null = null;
  private restartCount = 0;
  private intentionalStop = false;

  /**
   * Start the backend process.
   * @param store - Settings store (for reading API keys to pass as env vars)
   * @returns The port the backend is listening on.
   */
  async start(store: SimpleStore): Promise<number> {
    if (this._isRunning) {
      return this.port;
    }

    this.store = store;
    this.intentionalStop = false;

    // 1. Find a free port
    this.port = await this.findFreePort();
    log.info(`BackendManager: Assigned port ${this.port}`);

    // 2. Initialize data directories on first run
    this.initDataDirectories();

    // 3. Spawn and wait for healthy
    await this.spawnAndWait();

    return this.port;
  }

  private async spawnAndWait(): Promise<void> {
    if (!this.store) throw new Error('BackendManager: store not set');

    const env = this.buildEnv(this.store);
    const { command, args, cwd } = this.getSpawnConfig();
    log.info(`BackendManager: Spawning ${command} ${args.join(' ')}`);

    this.process = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Pipe stdout/stderr to electron-log (ignore EPIPE errors on shutdown)
    this.process.stdout?.on('data', (data: Buffer) => {
      log.info(`[backend] ${data.toString().trim()}`);
    });
    this.process.stdout?.on('error', () => { /* ignore pipe errors on shutdown */ });
    this.process.stderr?.on('data', (data: Buffer) => {
      log.warn(`[backend] ${data.toString().trim()}`);
    });
    this.process.stderr?.on('error', () => { /* ignore pipe errors on shutdown */ });

    this.process.on('error', (err) => {
      log.error('BackendManager: Process error:', err);
      this._isRunning = false;
    });

    this.process.on('exit', (code, signal) => {
      log.info(`BackendManager: Process exited (code=${code}, signal=${signal})`);
      this._isRunning = false;
      this.process = null;

      // Auto-restart on unexpected crash
      if (!this.intentionalStop && this.restartCount < MAX_RESTART_ATTEMPTS) {
        this.scheduleRestart();
      } else if (!this.intentionalStop) {
        log.error(`BackendManager: Backend crashed ${MAX_RESTART_ATTEMPTS} times, giving up`);
        // Notify all renderer windows that backend is permanently down
        BrowserWindow.getAllWindows().forEach(w => {
          if (!w.isDestroyed()) {
            w.webContents.send('backend:status', {
              status: 'crashed',
              error: `Backend stopped after ${MAX_RESTART_ATTEMPTS} failed restart attempts`
            });
          }
        });
      }
    });

    // Wait for health check to pass
    await this.waitForHealthy();
    this._isRunning = true;
    this.restartCount = 0; // Reset on successful start
    log.info(`BackendManager: Backend is healthy at port ${this.port}`);
  }

  private scheduleRestart(): void {
    this.restartCount++;
    const delay = RESTART_BASE_DELAY * Math.pow(2, this.restartCount - 1);
    log.warn(`BackendManager: Scheduling restart ${this.restartCount}/${MAX_RESTART_ATTEMPTS} in ${delay}ms`);

    setTimeout(async () => {
      if (this.intentionalStop) return;
      try {
        await this.spawnAndWait();
        log.info(`BackendManager: Restart ${this.restartCount}/${MAX_RESTART_ATTEMPTS} succeeded`);
      } catch (err) {
        log.error(`BackendManager: Restart ${this.restartCount}/${MAX_RESTART_ATTEMPTS} failed:`, err);
      }
    }, delay);
  }

  /**
   * Gracefully stop the backend process.
   */
  async stop(): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    if (!this.process) {
      return;
    }

    this.intentionalStop = true;
    log.info('BackendManager: Stopping backend...');

    this.shutdownPromise = new Promise<void>((resolve) => {
      const proc = this.process;
      if (!proc) {
        resolve();
        return;
      }

      proc.once('exit', () => {
        clearTimeout(killTimer);
        this.process = null;
        this._isRunning = false;
        this.shutdownPromise = null;
        log.info('BackendManager: Backend stopped');
        resolve();
      });

      // On Windows, proc.kill() calls TerminateProcess (always a hard kill).
      // On macOS/Linux, send SIGTERM first, then SIGKILL after timeout.
      if (process.platform === 'win32') {
        proc.kill();
      } else {
        proc.kill('SIGTERM');
      }

      // Set a timer for force kill (only meaningful on non-Windows)
      const killTimer = setTimeout(() => {
        log.warn('BackendManager: Graceful shutdown timed out, force killing');
        proc.kill('SIGKILL');
      }, SHUTDOWN_GRACE_PERIOD);
    });

    return this.shutdownPromise;
  }

  /** Get the full backend URL */
  getUrl(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  /** Whether the backend process is running */
  isRunning(): boolean {
    return this._isRunning;
  }

  /** Get the assigned port */
  getPort(): number {
    return this.port;
  }

  // ── Private helpers ────────────────────────────────────────────

  private async findFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = createServer();
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        const port = addr.port;
        server.close((err) => {
          if (err) reject(err);
          else resolve(port);
        });
      });
      server.on('error', reject);
    });
  }

  private getSpawnConfig(): { command: string; args: string[]; cwd: string } {
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

    if (isDev) {
      // Dev mode: run python directly from backend source
      // From dist/main/ → ProfStudio-Desktop/ → ProfStudio/ → ProfStudio/backend
      const backendDir = join(__dirname, '..', '..', '..', 'ProfStudio', 'backend');
      const venvPython = process.platform === 'win32'
        ? join(backendDir, 'venv', 'Scripts', 'python.exe')
        : join(backendDir, 'venv', 'bin', 'python');
      const pythonCmd = existsSync(venvPython) ? venvPython : 'python3';

      return {
        command: pythonCmd,
        args: ['main.py', '--port', String(this.port), '--host', '127.0.0.1'],
        cwd: backendDir,
      };
    }

    // Production: use the bundled PyInstaller binary
    const binaryName = process.platform === 'win32'
      ? 'profstudio-backend.exe'
      : 'profstudio-backend';
    const binaryPath = join(process.resourcesPath, 'backend', binaryName);

    return {
      command: binaryPath,
      args: ['--port', String(this.port), '--host', '127.0.0.1'],
      cwd: join(process.resourcesPath, 'backend'),
    };
  }

  private buildEnv(store: SimpleStore): Record<string, string> {
    const dataDir = this.getDataDir();
    const env: Record<string, string> = {
      PROFSTUDIO_PORT: String(this.port),
      PROFSTUDIO_HOST: '127.0.0.1',
      PROFSTUDIO_BASE_DIR: dataDir,
      DATA_DIR: join(dataDir, 'data'),
      UPLOAD_DIR: join(dataDir, 'uploads'),
      EXPORT_DIR: join(dataDir, 'exports'),
      CHROMADB_PATH: join(dataDir, 'vector_db'),
      ENVIRONMENT: 'production',
    };

    // Pass API keys from store to backend as env vars
    const keyMappings: Record<string, string> = {
      'apiKeys.gemini': 'GEMINI_API_KEY',
      'apiKeys.kimi': 'KIMI_API_KEY',
    };

    for (const [storeKey, envKey] of Object.entries(keyMappings)) {
      const value = store.get(storeKey) as string | undefined;
      if (value) {
        env[envKey] = value;
      }
    }

    // Pass Kimi base URL if set in environment
    if (process.env.KIMI_BASE_URL) {
      env.KIMI_BASE_URL = process.env.KIMI_BASE_URL;
    }

    return env;
  }

  private getDataDir(): string {
    return join(app.getPath('userData'), 'backend-data');
  }

  /**
   * Create required data directories on first run.
   */
  private initDataDirectories(): void {
    const dataDir = this.getDataDir();
    const dirs = ['data', 'uploads', 'exports', 'vector_db', 'embeddings'];

    for (const dir of dirs) {
      const fullPath = join(dataDir, dir);
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
        log.info(`BackendManager: Created directory ${fullPath}`);
      }
    }

    // Copy bundled schemas if in production and they don't exist locally
    if (app.isPackaged) {
      const schemasSource = join(process.resourcesPath, 'backend', 'schemas');
      const schemasTarget = join(dataDir, 'schemas');
      if (existsSync(schemasSource) && !existsSync(schemasTarget)) {
        this.copyDirRecursive(schemasSource, schemasTarget);
        log.info('BackendManager: Copied bundled schemas to data directory');
      }
    }
  }

  private copyDirRecursive(src: string, dest: string): void {
    mkdirSync(dest, { recursive: true });
    for (const entry of readdirSync(src, { withFileTypes: true })) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);
      if (entry.isDirectory()) {
        this.copyDirRecursive(srcPath, destPath);
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Poll the /health endpoint until backend is ready.
   */
  private async waitForHealthy(): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < HEALTH_TIMEOUT) {
      // Check if process died
      if (this.process?.exitCode !== null && this.process?.exitCode !== undefined) {
        throw new Error(`Backend process exited with code ${this.process.exitCode}`);
      }

      try {
        const healthy = await this.checkHealth();
        if (healthy) return;
      } catch {
        // Expected while backend is starting up
      }

      await this.sleep(HEALTH_POLL_INTERVAL);
    }

    // Timed out - kill the process and throw
    this.process?.kill('SIGKILL');
    throw new Error(`Backend failed to start within ${HEALTH_TIMEOUT / 1000}s`);
  }

  private checkHealth(): Promise<boolean> {
    return new Promise((resolve) => {
      // Safety: resolve false after 3s no matter what
      const safetyTimer = setTimeout(() => {
        resolve(false);
      }, 3000);

      try {
        const req = http.get(`http://127.0.0.1:${this.port}/health`, { timeout: 2000 }, (res: http.IncomingMessage) => {
          // Drain the response body to free the socket
          res.resume();
          clearTimeout(safetyTimer);
          resolve(res.statusCode === 200);
        });
        req.on('error', () => {
          clearTimeout(safetyTimer);
          resolve(false);
        });
        req.on('timeout', () => {
          req.destroy();
          clearTimeout(safetyTimer);
          resolve(false);
        });
      } catch {
        clearTimeout(safetyTimer);
        resolve(false);
      }
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
