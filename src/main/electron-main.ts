import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import log from 'electron-log';
import { setupIpcHandlers } from './ipc-handlers.js';
import { BackendManager } from './backend-manager.js';

// Configure logging
log.transports.file.level = 'info';
log.info('App starting...');

let mainWindow: BrowserWindow | null = null;

/**
 * Persistent JSON-file store that saves settings to disk.
 * Replaces the old in-memory store so settings survive app restarts.
 */
class PersistentStore {
  private data: Record<string, unknown> = {};
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.load();
  }

  private load(): void {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
      }
    } catch (err) {
      log.warn('Failed to load settings, using defaults:', err);
      this.data = {};
    }
  }

  private save(): void {
    try {
      const dir = join(this.filePath, '..');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      log.error('Failed to save settings:', err);
    }
  }

  get(key: string, defaultValue?: unknown): unknown {
    return this.data[key] !== undefined ? this.data[key] : defaultValue;
  }

  set(key: string, value: unknown): void {
    this.data[key] = value;
    this.save();
  }

  delete(key: string): void {
    delete this.data[key];
    this.save();
  }

  clear(): void {
    this.data = {};
    this.save();
  }
}

// Initialize store lazily (app.getPath not available before app.ready)
let store: PersistentStore;

// Backend manager handles the Python process lifecycle
const backendManager = new BackendManager();

// isDev is determined after app is ready to avoid issues with app.isPackaged
let isDev = true;

function createWindow(): void {
  // Determine dev mode after app is ready
  isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  // Get saved window bounds with validation
  const savedBounds = store.get('windowBounds', { width: 1400, height: 900 }) as {
    width: number; height: number; x?: number; y?: number;
  };
  const windowBounds = {
    width: Math.max(savedBounds.width || 1400, 800),
    height: Math.max(savedBounds.height || 900, 600),
    ...(savedBounds.x !== undefined && savedBounds.y !== undefined
      ? { x: savedBounds.x, y: savedBounds.y }
      : {}),
  };

  mainWindow = new BrowserWindow({
    ...windowBounds,
    minWidth: 1024,
    minHeight: 768,
    title: 'Proficiency Studio',
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
    show: false, // Don't show until ready
  });

  // Show window when ready to prevent flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Save window bounds on resize/move
  mainWindow.on('resize', () => {
    if (mainWindow && !mainWindow.isMaximized() && !mainWindow.isMinimized()) {
      store.set('windowBounds', mainWindow.getBounds());
    }
  });

  mainWindow.on('move', () => {
    if (mainWindow && !mainWindow.isMaximized() && !mainWindow.isMinimized()) {
      store.set('windowBounds', mainWindow.getBounds());
    }
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load app
  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '..', '..', 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Set up application menu
  createMenu();
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu:new-project');
          },
        },
        {
          label: 'Open Project',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu:open-project');
          },
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow?.webContents.send('menu:settings');
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Next Step',
          accelerator: 'CmdOrCtrl+Right',
          click: () => {
            mainWindow?.webContents.send('menu:next-step');
          },
        },
        {
          label: 'Previous Step',
          accelerator: 'CmdOrCtrl+Left',
          click: () => {
            mainWindow?.webContents.send('menu:previous-step');
          },
        },
        { type: 'separator' },
        {
          label: 'Go to Welcome',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            mainWindow?.webContents.send('menu:goto-step', 0);
          },
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://profstudio.dev/docs');
          },
        },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('https://github.com/profstudio/profstudio-desktop/issues');
          },
        },
        { type: 'separator' },
        {
          label: 'About Proficiency Studio',
          click: () => {
            mainWindow?.webContents.send('menu:about');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App lifecycle
app.whenReady().then(async () => {
  const storePath = join(app.getPath('userData'), 'profstudio-settings.json');
  store = new PersistentStore(storePath);
  log.info('Settings store initialized at:', storePath);

  // Start the backend process and wait for it to be healthy
  let backendUrl: string;
  try {
    await backendManager.start(store);
    backendUrl = backendManager.getUrl();
    log.info('Backend started at:', backendUrl);
  } catch (err) {
    log.error('Failed to start backend:', err);
    // Fall back to default URL so the app can at least show an error state
    backendUrl = 'http://127.0.0.1:8000';
  }

  createWindow();
  setupIpcHandlers(ipcMain, store, backendUrl);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Ensure backend is stopped when app quits.
let isQuitting = false;
app.on('will-quit', (event) => {
  if (backendManager.isRunning() && !isQuitting) {
    isQuitting = true;
    event.preventDefault();
    backendManager.stop().finally(() => {
      app.quit();
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle uncaught exceptions (ignore EPIPE from terminal disconnect on shutdown)
process.on('uncaughtException', (error) => {
  if ((error as NodeJS.ErrnoException).code === 'EPIPE') return;
  log.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason);
});
