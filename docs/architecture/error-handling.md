# Error Handling Guide

This document describes the error handling patterns used in ProfStudio Desktop.

## Error Types

ProfStudio uses a standardized error type system defined in `src/renderer/lib/errors.ts`:

| Type | Description | Common Causes |
|------|-------------|---------------|
| `NETWORK` | Network connectivity issues | No internet, DNS failure |
| `STORAGE` | localStorage quota exceeded | Large files, too much cached data |
| `VALIDATION` | Invalid user input | Malformed data, missing fields |
| `BACKEND` | Backend server unavailable | Server down, wrong URL |
| `ENCODING` | File encoding issues | Non-UTF8 files |
| `TIMEOUT` | Request timeout | Slow network, large payloads |
| `ABORT` | Operation cancelled | User navigation, unmount |
| `FILE` | File validation errors | Wrong format, too large |
| `UNKNOWN` | Unexpected errors | Bugs, edge cases |

## AppError Interface

```typescript
interface AppError {
  type: ErrorType;       // Error category
  message: string;       // Technical message
  details?: string;      // Additional context
  recoverable: boolean;  // Can user retry?
  userAction?: string;   // Suggested fix
  originalError?: Error; // Original exception
}
```

## Error Utilities

### createAppError

Normalizes any error into an AppError:

```typescript
import { createAppError } from '@/lib/errors';

try {
  await someOperation();
} catch (error) {
  const appError = createAppError(error, 'Context: Loading skills');
  // appError.type, appError.message, appError.recoverable, etc.
}
```

**Automatic Detection:**
- `QuotaExceededError` → STORAGE
- `AbortError` → ABORT
- `TypeError` with 'fetch' → NETWORK
- Message contains 'timeout' → TIMEOUT
- Message contains 'Backend' → BACKEND

### safeStorage

Safe localStorage wrapper that handles quota limits:

```typescript
import { safeStorage } from '@/lib/errors';

// Set with quota checking
const result = safeStorage.setItem('key', largeData);
if (!result.success) {
  console.error(result.error.message);
  // "Storage limit exceeded"
}

// Check available space
const available = safeStorage.getAvailableSpace();
console.log(`${available} bytes available`);

// Get usage stats
const stats = safeStorage.getUsageStats();
// { used: 1000000, available: 3000000, total: 4000000, percentage: 25 }
```

### fetchWithTimeout

Fetch wrapper with automatic timeout:

```typescript
import { fetchWithTimeout } from '@/lib/errors';

// Default 30 second timeout
const response = await fetchWithTimeout('/api/data');

// Custom timeout
const response = await fetchWithTimeout('/api/slow', {}, 60000);
```

### readFileWithEncoding

Automatic encoding detection for file reading:

```typescript
import { readFileWithEncoding } from '@/lib/errors';

const { content, encoding } = await readFileWithEncoding(file);
// encoding: 'UTF-8', 'ISO-8859-1', 'UTF-16LE', etc.
```

### validateFile

Validate files before processing:

```typescript
import { validateFile } from '@/lib/errors';

const validation = validateFile(file, {
  maxSize: 100 * 1024 * 1024, // 100MB
  allowedExtensions: ['.csv']
});

if (!validation.valid) {
  toast({
    title: 'Invalid File',
    description: validation.error.details
  });
}
```

## Error Handling Patterns

### Component Level

```typescript
const [error, setError] = useState<string | null>(null);

const loadData = async () => {
  try {
    setError(null);
    const data = await api.getData();
    // handle success
  } catch (err) {
    const appError = createAppError(err);
    setError(getUserFriendlyMessage(appError));
    toast({
      title: 'Error',
      description: appError.message,
      variant: 'destructive'
    });
  }
};
```

### With useAsyncOperation Hook

```typescript
const { execute, loading, error, abort } = useAsyncOperation();

const handleLoad = async () => {
  const result = await execute(async (signal) => {
    return api.getData({ signal });
  });

  if (result) {
    // handle success
  }
  // error is automatically set if failed
};

// Cleanup on unmount
useEffect(() => () => abort(), [abort]);
```

### Global Error Handler

The app includes a global error handler for unhandled promise rejections:

```typescript
// In App.tsx or similar
useEffect(() => {
  const handler = (event: PromiseRejectionEvent) => {
    event.preventDefault();
    const appError = createAppError(event.reason);
    toast({
      title: 'Unexpected Error',
      description: getUserFriendlyMessage(appError),
      variant: 'destructive'
    });
  };

  window.addEventListener('unhandledrejection', handler);
  return () => window.removeEventListener('unhandledrejection', handler);
}, []);
```

### Error Boundary

React error boundary for component errors:

```tsx
<ErrorBoundary
  fallback={<ErrorFallback />}
  onError={(error, info) => {
    console.error('Component error:', error);
    // Log to monitoring service
  }}
>
  <App />
</ErrorBoundary>
```

## User-Friendly Messages

The `getUserFriendlyMessage` function converts technical errors to user-friendly messages:

```typescript
import { getUserFriendlyMessage } from '@/lib/errors';

const message = getUserFriendlyMessage(appError);
// Returns user-friendly message based on error type
```

| Error Type | Friendly Message |
|------------|------------------|
| NETWORK | "Network connection issue. Please check your internet." |
| STORAGE | "Storage is full. Please clear some data." |
| VALIDATION | "Invalid input. Please check your data." |
| BACKEND | "Server is unavailable. Please try again later." |
| ENCODING | "File encoding issue. Try saving as UTF-8." |
| TIMEOUT | "Request took too long. Please try again." |
| ABORT | "Operation was cancelled." |
| FILE | "File error. Please check the file." |
| UNKNOWN | "Something went wrong. Please try again." |

## Backend Error Handling

API responses follow a standard format:

```typescript
// Success response
{
  status: 'success',
  data: {...}
}

// Error response
{
  status: 'error',
  message: 'Human-readable error message',
  error_code?: 'VALIDATION_ERROR', // Optional error code
  details?: {...} // Optional additional details
}
```

The API service handles these automatically:

```typescript
const response = await api.get('/endpoint');
if (response.status === 'error') {
  throw new Error(response.message);
}
```

## Common Error Scenarios

### Storage Quota Exceeded

**Cause:** Storing large CSV files in localStorage

**Solution:**
1. Use file_id reference instead of storing content
2. Clear old data: Settings → Clear Data
3. Use safeStorage wrapper

### Backend Unavailable

**Cause:** Backend server not running

**Solution:**
1. Start backend: `cd backend && uvicorn app.main:app`
2. Check backend URL in settings
3. Verify network connectivity

### File Encoding Issues

**Cause:** Non-UTF8 CSV files

**Solution:**
1. App auto-detects encoding
2. Re-save file as UTF-8 in Excel
3. Use encoding parameter in readFile

### Request Timeout

**Cause:** Large payloads, slow network

**Solution:**
1. Reduce batch size
2. Check network connection
3. Increase timeout if needed

## Testing Error Handling

```typescript
// Test error creation
it('should create STORAGE error for QuotaExceededError', () => {
  const domError = new DOMException('', 'QuotaExceededError');
  const appError = createAppError(domError);
  expect(appError.type).toBe(ErrorType.STORAGE);
});

// Test safe storage
it('should return error when storage is full', () => {
  const result = safeStorage.setItem('key', veryLargeData);
  expect(result.success).toBe(false);
  expect(result.error?.type).toBe(ErrorType.STORAGE);
});
```

## Related Files

- `src/renderer/lib/errors.ts` - Error utilities
- `src/renderer/hooks/useAsyncOperation.ts` - Async hook with error handling
- `src/renderer/hooks/useBackendHealth.ts` - Backend health monitoring
- `src/renderer/components/common/ErrorBoundary.tsx` - React error boundary
