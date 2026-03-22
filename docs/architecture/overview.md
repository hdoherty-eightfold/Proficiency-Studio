# Architecture Overview

## Application Structure

ProfStudio Desktop is built on Electron with a three-process architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    Main Process                          │
│  (Node.js runtime - src/main/)                          │
│  ├── electron-main.ts    - Window management            │
│  ├── ipc-handlers.ts     - IPC channel handlers         │
│  └── utils/path-validator.ts - Security                 │
├─────────────────────────────────────────────────────────┤
│                   Preload Script                         │
│  (Context bridge - src/preload/)                        │
│  └── preload.ts - Exposes window.electron API           │
├─────────────────────────────────────────────────────────┤
│                  Renderer Process                        │
│  (React application - src/renderer/)                    │
│  ├── App.tsx           - Main component                 │
│  ├── components/       - UI components                  │
│  ├── stores/           - Zustand state                  │
│  ├── services/         - API services                   │
│  ├── hooks/            - Custom React hooks             │
│  └── lib/              - Utilities                      │
└─────────────────────────────────────────────────────────┘
          │
          │ HTTP API calls via IPC
          ▼
┌─────────────────────────────────────────────────────────┐
│                  Backend (FastAPI)                       │
│  http://localhost:8000                                  │
└─────────────────────────────────────────────────────────┘
```

## IPC Communication

### Channel Categories

1. **Window Controls** (send - fire and forget)
   - `window:close` - Close window
   - `window:minimize` - Minimize window
   - `window:maximize` - Toggle maximize

2. **Store Operations** (invoke - request/response)
   - `store:get` - Get persisted value
   - `store:set` - Set persisted value
   - `store:delete` - Delete key
   - `store:clear` - Clear all

3. **Secure Storage** (invoke)
   - `secure:store-credential` - Encrypt and store
   - `secure:get-credential` - Decrypt and retrieve
   - `secure:delete-credential` - Delete credential
   - `secure:is-available` - Check encryption availability

4. **Backend API Proxy** (invoke)
   - `api:get` - GET request with timeout
   - `api:post` - POST request with timeout
   - `api:put` - PUT request with timeout
   - `api:delete` - DELETE request
   - `api:upload` - File upload
   - `api:health-check` - Backend health status

5. **File System** (invoke)
   - `fs:read-file` - Read file (path validated)
   - `fs:write-file` - Write file (path validated)
   - `fs:is-path-allowed` - Check path permissions
   - `fs:sanitize-filename` - Sanitize filename

6. **Dialogs** (invoke)
   - `dialog:select-file` - Open file dialog
   - `dialog:select-directory` - Open folder dialog

## Error Handling Architecture

### Error Flow

```
User Action
    ↓
Component (try-catch)
    ↓ on error
createAppError() → AppError
    ↓
ErrorDisplay / Toast
    ↓
GlobalErrorHandler (unhandled)
    ↓
ErrorBoundary (React errors)
```

### Error Types

- `NETWORK` - Network connectivity issues
- `STORAGE` - localStorage quota exceeded
- `VALIDATION` - Invalid input
- `BACKEND` - Backend server unavailable
- `ENCODING` - File encoding issues
- `TIMEOUT` - Request timeout
- `ABORT` - Operation cancelled
- `FILE` - File validation errors
- `UNKNOWN` - Unexpected errors

### Key Utilities

Location: `src/renderer/lib/errors.ts`

- `createAppError()` - Normalize any error to AppError
- `safeStorage` - localStorage with quota checking
- `fetchWithTimeout()` - Fetch with AbortController
- `readFileWithEncoding()` - Auto-detect file encoding
- `validateFile()` - File validation

### Hooks

- `useBackendHealth` - Monitor backend connectivity
- `useAsyncOperation` - Async operations with abort support
- `useGlobalErrorHandler` - Catch unhandled errors

## State Management

### Zustand Store

Location: `src/renderer/stores/app-store.ts`

```typescript
interface AppState {
  currentStep: number;      // 0-10 workflow step
  isSidebarCollapsed: boolean;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  skillsState: SkillsState;
  uploadedFile: UploadResponse | null;
  autoAdvanceEnabled: boolean;
}
```

### Persistence

Selected state is persisted via `zustand/middleware/persist` to localStorage.

## 12-Step Workflow

| Step | Name | Component |
|------|------|-----------|
| 0 | Welcome | Welcome.tsx |
| 1 | Integration Path | IntegrationPath.tsx |
| 2 | Extract Skills | ExtractSkills.tsx |
| 3 | Configure Proficiency | ConfigureProficiency.tsx |
| 4 | Run Assessment | RunAssessment.tsx |
| 5 | Review | ReviewAssessment.tsx |
| 6 | History | AssessmentHistory.tsx |
| 7 | Analytics | AnalyticsDashboard.tsx |
| 8 | Prompts | PromptEditor.tsx |
| 9 | Environments | EnvironmentManager.tsx |
| 10 | Settings | Settings.tsx |
| 11 | Documentation | Documentation.tsx |

## Security

### Credential Storage
- Uses Electron's `safeStorage` for encryption
- Falls back to plain storage with warning if unavailable
- All credentials encrypted at rest

### Path Validation
- All file operations validate paths
- Restricted to allowed directories
- Prevents path traversal attacks

### IPC Security
- Context isolation enabled
- Node integration disabled
- Preload script as only bridge
