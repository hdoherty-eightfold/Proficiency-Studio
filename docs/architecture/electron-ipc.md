# Electron IPC Channel Reference

This document provides a complete reference of all IPC channels used in ProfStudio Desktop.

## Channel Categories

### 1. Window Controls (`window:*`)

| Channel | Direction | Description |
|---------|-----------|-------------|
| `window:close` | Send | Close the application window |
| `window:minimize` | Send | Minimize to taskbar |
| `window:maximize` | Send | Toggle maximize/restore |

**Usage in Renderer:**
```typescript
window.electron.window.close();
window.electron.window.minimize();
window.electron.window.maximize();
```

### 2. Store Operations (`store:*`)

Persistent key-value storage using electron-store.

| Channel | Direction | Parameters | Returns |
|---------|-----------|------------|---------|
| `store:get` | Invoke | `key: string` | `value: any` |
| `store:set` | Invoke | `key: string, value: any` | `void` |
| `store:delete` | Invoke | `key: string` | `void` |
| `store:clear` | Invoke | - | `void` |

**Usage in Renderer:**
```typescript
const value = await window.electron.store.get('key');
await window.electron.store.set('key', value);
await window.electron.store.delete('key');
await window.electron.store.clear();
```

### 3. Secure Storage (`secure:*`)

Encrypted credential storage using system keychain.

| Channel | Direction | Parameters | Returns |
|---------|-----------|------------|---------|
| `secure:store-credential` | Invoke | `service: string, account: string, password: string` | `boolean` |
| `secure:get-credential` | Invoke | `service: string, account: string` | `string \| null` |
| `secure:delete-credential` | Invoke | `service: string, account: string` | `boolean` |
| `secure:is-available` | Invoke | - | `boolean` |

**Usage in Renderer:**
```typescript
const available = await window.electron.secure.isAvailable();
await window.electron.secure.storeCredential('sftp', 'host.com', 'secret');
const password = await window.electron.secure.getCredential('sftp', 'host.com');
await window.electron.secure.deleteCredential('sftp', 'host.com');
```

### 4. API Proxy (`api:*`)

Backend API communication with timeout handling.

| Channel | Direction | Parameters | Returns |
|---------|-----------|------------|---------|
| `api:get` | Invoke | `endpoint: string` | `Response` |
| `api:post` | Invoke | `endpoint: string, data: any` | `Response` |
| `api:put` | Invoke | `endpoint: string, data: any` | `Response` |
| `api:delete` | Invoke | `endpoint: string` | `Response` |
| `api:upload` | Invoke | `endpoint: string, files: File[]` | `Response` |
| `api:health-check` | Invoke | - | `{ status: string }` |

**Usage in Renderer:**
```typescript
const response = await window.electron.api.get('/api/skills');
const result = await window.electron.api.post('/api/skills/extract', data);
await window.electron.api.put('/api/environments/123', updates);
await window.electron.api.delete('/api/environments/123');
```

**Error Handling:**
All API calls include:
- 30-second timeout
- Automatic retry on network errors
- Error formatting for user display

### 5. File System (`fs:*`)

Secure file operations with path validation.

| Channel | Direction | Parameters | Returns |
|---------|-----------|------------|---------|
| `fs:read-file` | Invoke | `path: string` | `{ content: string, encoding: string }` |
| `fs:write-file` | Invoke | `path: string, content: string` | `boolean` |
| `fs:is-path-allowed` | Invoke | `path: string` | `boolean` |
| `fs:sanitize-filename` | Invoke | `filename: string` | `string` |

**Security:**
- All paths are validated against allowed directories
- Path traversal attempts are rejected
- Filenames are sanitized to remove unsafe characters

### 6. Dialogs (`dialog:*`)

Native file/folder selection dialogs.

| Channel | Direction | Parameters | Returns |
|---------|-----------|------------|---------|
| `dialog:select-file` | Invoke | `options?: OpenDialogOptions` | `string[] \| undefined` |
| `dialog:select-directory` | Invoke | `options?: OpenDialogOptions` | `string[] \| undefined` |

**Options:**
```typescript
interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  multiSelections?: boolean;
}
```

**Usage:**
```typescript
const files = await window.electron.dialog.selectFile({
  title: 'Select CSV File',
  filters: [{ name: 'CSV Files', extensions: ['csv'] }]
});

const folders = await window.electron.dialog.selectDirectory({
  title: 'Select Output Folder'
});
```

### 7. Menu Actions (`menu:*`)

Application menu event handling.

| Channel | Direction | Parameters | Returns |
|---------|-----------|------------|---------|
| `menu:action` | Listen | `action: string` | - |

**Actions:**
- `preferences` - Open settings
- `import` - Open import dialog
- `export` - Open export dialog

**Usage:**
```typescript
const unsubscribe = window.electron.onMenuAction((action) => {
  if (action === 'preferences') {
    navigateToSettings();
  }
});

// Cleanup on unmount
unsubscribe();
```

## IPC Handler Implementation

Location: `src/main/ipc-handlers.ts`

### Error Response Format

```typescript
interface IPCErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
  };
}
```

### Timeout Configuration

```typescript
const API_TIMEOUT = 30000; // 30 seconds
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds
```

## Security Best Practices

1. **Never expose Node.js directly** - All Node.js access goes through preload
2. **Validate all paths** - Use `isPathAllowed` before file operations
3. **Sanitize user input** - Use `sanitizeFilename` for user-provided names
4. **Use secure storage** - Never store credentials in plain text
5. **Handle errors gracefully** - Always return structured error responses

## Debugging IPC

Enable IPC logging in development:

```typescript
// In main process
if (process.env.NODE_ENV === 'development') {
  ipcMain.on('*', (event, channel, ...args) => {
    console.log(`[IPC] ${channel}`, args);
  });
}
```

## Related Files

- `src/main/ipc-handlers.ts` - IPC handler implementations
- `src/preload/index.ts` - Context bridge definitions
- `src/renderer/services/electron-api.ts` - Renderer API wrapper
- `src/renderer/services/api.ts` - High-level API service
