# Running Tests

## Frontend Tests (Vitest)

### Setup

Ensure dependencies are installed:
```bash
cd ProfStudio-Desktop
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- src/renderer/lib/errors.test.ts
```

### Test Configuration

Tests are configured in `vite.config.ts`:
- **Environment**: jsdom (browser-like)
- **Setup File**: `src/renderer/test/setup.ts`
- **Coverage Provider**: v8
- **Coverage Thresholds**: 60% (lines, functions, statements), 50% (branches)

### Test Structure

```
src/renderer/
├── lib/
│   └── errors.test.ts        # Error utilities tests
├── stores/
│   └── app-store.test.ts     # Zustand store tests
├── hooks/
│   └── *.test.ts             # Hook tests
└── test/
    └── setup.ts              # Test setup and mocks
```

### Writing Tests

Example test:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { myFunction } from './my-module';

describe('myFunction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### Mocking Electron API

The test setup (`setup.ts`) provides a mock for `window.electron`. You can override it in specific tests:

```typescript
import { mockElectronApi } from '../test/setup';

it('should call electron API', async () => {
  mockElectronApi.api.get.mockResolvedValue({ data: 'test' });
  // ... test code
  expect(mockElectronApi.api.get).toHaveBeenCalledWith('/api/endpoint');
});
```

## Backend Tests (Pytest)

### Setup

```bash
cd ProfStudio/backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
pip install pytest-cov
```

### Running Tests

```bash
# Run all tests with coverage
pytest

# Run without coverage
pytest --no-cov

# Run specific test file
pytest tests/test_backend.py -v

# Run tests matching a pattern
pytest -k "test_csv" -v

# Run only unit tests
pytest -m unit

# Run only integration tests
pytest -m integration
```

### Coverage Reports

After running tests with coverage:
- **Terminal**: Shows inline coverage
- **HTML Report**: Open `coverage_html/index.html`

### Test Markers

- `@pytest.mark.unit` - Unit tests
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.slow` - Slow tests
- `@pytest.mark.requires_siemens_file` - Requires test data file

## E2E Tests (Playwright)

### Setup

```bash
cd ProfStudio/frontend
npx playwright install
```

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI
npx playwright test --ui

# Run specific test
npx playwright test tests/e2e/workflow.spec.ts
```

## Continuous Integration

Tests should be run:
1. Before committing (pre-commit hook)
2. On pull request (CI/CD)
3. Before deployment

### Recommended CI Commands

```yaml
# Frontend
npm test -- --coverage --reporter=json

# Backend
pytest --cov=app --cov-report=xml --cov-fail-under=70
```
