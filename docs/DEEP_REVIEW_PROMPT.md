# Comprehensive Code Review, Testing & Documentation Prompt

**Use this prompt when:** The application has multiple errors when stepping through the workflow, tests exist but coverage is incomplete, and documentation needs improvement.

---

## Recent Bug Fixes

### CSV Editor API Response Mismatch (FIXED)
**Issue:** CSV editor was showing JSON instead of proper CSV table editing.

**Root Cause:** The backend endpoint `/api/transform/file-data/{file_id}` returns data in the `data` field, but the CSVEditor component was expecting `transformed_data`.

**Fix Applied:** Updated `CSVEditor.tsx` loadData() function to handle both response formats:
```typescript
// Handle both response formats for compatibility
const dataArray = response.transformed_data || response.data;
```

**Location:** `src/renderer/components/csv/CSVEditor.tsx:141-167`

**Additional Enhancements (SnapMap patterns ported):**
- Column resizing with drag handles (60-800px range)
- Sticky columns (Status, Row #, Delete) for horizontal scrolling
- Enhanced validation summary with field-level issue tracking
- Hide empty columns toggle
- Validation report download
- Quick actions panel (Remove Invalid Rows, Restore Deleted)
- Performance optimizations (memoized calculations, 50-row sampling for widths)

---

## Phase 1: Deep Code Review

### 1.1 Identify All Error Sources

Systematically review these known problem areas:

#### localStorage Operations
- **Files:** Any component using `localStorage.setItem()`
- **Look for:** Missing try-catch, no size validation before storage
- **Fix:** Create `safeStorage` wrapper with quota checking (5MB limit)

#### Fetch/API Calls Without Timeout
- **Files:** Components with `fetch()` or API calls
- **Look for:** Missing AbortController, no timeout handling
- **Fix:** Create `fetchWithTimeout()` utility, apply to all fetch calls

#### File Encoding Issues
- **Files:** File upload components
- **Look for:** `readAsText()` without encoding detection
- **Fix:** Create `detectFileEncoding()` and `readFileWithEncoding()` utilities

#### Backend Connectivity
- **Files:** IPC handlers, API service layer
- **Look for:** No health check, silent failures when backend unavailable
- **Fix:** Add health check endpoint, create `useBackendHealth` hook, add status banner

#### Missing Abort Controllers
- **Files:** All components with `useEffect` + async operations
- **Look for:** No cleanup on unmount, requests continuing after navigation
- **Fix:** Add AbortController refs, abort in useEffect cleanup

#### Error Boundary Gaps
- **Files:** ErrorBoundary component, App wrapper
- **Look for:** Only React errors caught, no global promise rejection handling
- **Fix:** Add `useGlobalErrorHandler` hook for unhandled rejections

### 1.2 Create Standardized Error Infrastructure

Create `src/renderer/lib/errors.ts` with:

```typescript
// Required exports:
- ErrorType enum (NETWORK, STORAGE, VALIDATION, BACKEND, ENCODING, TIMEOUT, ABORT, FILE, UNKNOWN)
- AppError interface with type, message, details, recoverable, userAction
- createAppError() factory function
- safeStorage wrapper object
- fetchWithTimeout() function
- detectFileEncoding() function
- readFileWithEncoding() function
- validateFile() function
- getUserFriendlyMessage() function
```

---

## Phase 2: Fix Testing Infrastructure

### 2.1 Check Test Configuration

- [ ] Verify `vite.config.ts` has proper vitest configuration
- [ ] Check test root matches source structure (if root is `./src/renderer`, paths must be relative)
- [ ] Verify setupFiles path is correct relative to test root
- [ ] Check coverage include/exclude patterns match actual file structure

### 2.2 Install Missing Dependencies

```bash
npm install -D jsdom @testing-library/jest-dom @testing-library/react
```

### 2.3 Create/Verify Test Setup

Ensure `src/renderer/test/setup.ts` includes:
- `@testing-library/jest-dom/vitest` import
- Mock for `window.electron` API with all IPC methods
- Mock for `localStorage`
- Mock for `matchMedia`
- Mock for `ResizeObserver`

### 2.4 Fix Skipped/Failing Tests

- [ ] Check for missing test data files (create synthetic data if needed)
- [ ] Update step count tests if workflow steps changed
- [ ] Fix timeout-related tests using `vi.useFakeTimers()`
- [ ] Ensure all mocks match actual API signatures

### 2.5 Enable Coverage Reporting

**Backend (`pytest.ini`):**
```ini
addopts = --cov=app --cov-report=html --cov-report=term-missing --cov-fail-under=70
```

**Frontend (`vite.config.ts`):**
```typescript
coverage: {
  provider: 'v8',
  thresholds: { lines: 60, functions: 60, branches: 50, statements: 60 }
}
```

---

## Phase 3: Create Documentation Structure

### 3.1 Documentation Directory Structure

```
docs/
├── README.md                    # Navigation index with quick links
├── getting-started/
│   ├── prerequisites.md         # System requirements
│   ├── quick-start.md          # 5-minute getting started
│   └── first-run.md            # First run walkthrough
├── user-guide/
│   ├── integration-paths.md    # CSV, SFTP, Eightfold explanations
│   ├── workflow-steps.md       # All N steps documented
│   └── keyboard-shortcuts.md   # Shortcut reference
├── architecture/
│   ├── overview.md             # System architecture diagram
│   ├── electron-ipc.md         # IPC channel documentation
│   └── error-handling.md       # Error handling patterns
├── testing/
│   ├── running-tests.md        # How to run tests
│   └── verification-checklist.md # Manual verification steps
└── troubleshooting/
    └── common-errors.md        # Error messages and solutions
```

### 3.2 Key Documentation Content

**Architecture Overview must include:**
- Three-process Electron architecture diagram (Main, Preload, Renderer)
- IPC channel categories table (Window, Store, Secure, API, File System, Dialogs)
- Error flow diagram
- State management explanation
- Workflow steps table with component mapping

**Troubleshooting Guide must cover:**
- Backend connection issues (with solution steps)
- Storage limit exceeded (with clear size limits)
- File encoding issues (with conversion commands)
- Request timeout (with causes and solutions)
- SFTP connection failures
- Authentication failures

---

## Phase 4: Verification Protocol

### 4.1 Test Each Error Fix

After implementing fixes, verify:

| Test | Expected Result |
|------|-----------------|
| Upload 10MB CSV | Graceful error message (not crash) |
| Disconnect network | Timeout message within 30 seconds |
| Upload ISO-8859-1 file | Content displays correctly |
| Stop backend | Clear "Backend unavailable" banner |
| Navigate away during async operation | No console errors |
| Trigger unhandled promise rejection | Toast notification appears |

### 4.2 Run All Tests

```bash
# Frontend
cd ProfStudio-Desktop && npm test

# Backend
cd backend && pytest --cov=app
```

Both must pass with configured coverage thresholds.

### 4.3 Verify Documentation Accuracy

For each documented feature:
- [ ] Follow the documented steps exactly
- [ ] Verify the described behavior matches actual behavior
- [ ] Verify error messages match documentation
- [ ] Test all "Solutions" in troubleshooting actually work

---

## Phase 5: Adding New Workflow Steps (e.g., In-App Documentation)

When adding a new step to the workflow:

### Files to Update

| File | Change Required |
|------|-----------------|
| `src/renderer/components/layout/Sidebar.tsx` | Add NAV_ITEMS entry with icon import |
| `src/renderer/App.tsx` | Add lazy import and STEP_COMPONENTS entry |
| `src/renderer/stores/app-store.ts` | Add step name to STEP_NAMES array, update comment |
| `src/renderer/stores/app-store.test.ts` | Update max step tests |
| `docs/architecture/overview.md` | Update workflow table |
| `docs/README.md` | Update step count references |

### Verification

- [ ] New step appears in sidebar
- [ ] Clicking navigates to correct step number
- [ ] Sidebar collapsed state shows icon correctly
- [ ] All tests pass
- [ ] No TypeScript errors

---

## Implementation Order

### Week 1: Critical Fixes
1. Create error utilities (`errors.ts`)
2. Fix IPC handlers (health check, timeouts)
3. Fix component issues (localStorage, encoding, abort controllers)
4. Enhance ErrorBoundary with global handling

### Week 2: Testing
1. Fix test configuration
2. Install missing dependencies
3. Create/fix test setup
4. Write missing unit tests
5. Enable coverage, meet thresholds

### Week 3: Documentation
1. Create documentation structure
2. Write architecture docs
3. Write user guides
4. Write troubleshooting guide
5. Verify all docs against actual behavior

---

## Success Criteria

- [ ] Zero errors when stepping through complete workflow
- [ ] All tests pass (frontend and backend)
- [ ] Coverage meets thresholds (60%+ lines)
- [ ] Documentation exists for all features
- [ ] Every troubleshooting solution has been tested
- [ ] In-app help accessible (if implemented)
