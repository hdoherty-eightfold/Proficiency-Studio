# Deep Audit Checklist

Quick-reference checklist for each dimension. Use during Phase 1 to ensure nothing is missed.

## Tests
- [ ] `npx vitest run` exits with 0
- [ ] All test files found and executed
- [ ] Coverage report generated with `npx vitest run --coverage`
- [ ] No files with 0% coverage in `src/renderer/components/` or `src/renderer/stores/`
- [ ] No tests with zero assertions
- [ ] No snapshot-only test files
- [ ] Test factories exist and are used consistently
- [ ] No skipped tests (`test.skip`, `describe.skip`)

## Build Health
- [ ] `npm run build:renderer` — zero errors, count warnings
- [ ] `npm run build:main` — zero errors, count warnings
- [ ] `npm run build:preload` — zero errors, count warnings

## TypeScript
- [ ] `npm run type-check` — zero errors
- [ ] Search for `: any` in src/ (exclude tests)
- [ ] Search for `@ts-ignore` and `@ts-expect-error`
- [ ] Verify `strict: true` in tsconfig.json
- [ ] Verify `strict: true` in tsconfig.main.json

## Dependencies
- [ ] `npm audit` — count vulnerabilities by severity
- [ ] `npm outdated` — count outdated by semver level
- [ ] Check for unused dependencies (installed but never imported)
- [ ] Check for duplicate dependency versions

## Security
- [ ] `webPreferences` in electron-main.ts: `contextIsolation: true`
- [ ] `webPreferences` in electron-main.ts: `nodeIntegration: false`
- [ ] Preload script uses `contextBridge.exposeInMainWorld()` correctly
- [ ] No `eval()`, `new Function()` in source
- [ ] No `innerHTML` or `document.write` with user/dynamic input
- [ ] No `dangerouslySetInnerHTML` with unsanitized content
- [ ] API keys only in env vars (`.env`), never hardcoded
- [ ] `.env` listed in `.gitignore`
- [ ] IPC channels validated (whitelist or schema validation)
- [ ] Content-Security-Policy configured in main process

## Architecture
- [ ] List all files >500 LOC (excluding tests)
- [ ] Model config centralized in `src/renderer/config/models.ts`
- [ ] Storage keys centralized in `src/renderer/config/storage-keys.ts`
- [ ] Proficiency config centralized in `src/renderer/config/proficiency.ts`
- [ ] No hardcoded model names outside config
- [ ] No circular imports detected
- [ ] Stores contain only state logic (no UI rendering)
- [ ] Components don't contain business logic (delegate to stores/services)

## Performance
- [ ] `React.lazy()` used for route-level code splitting in App.tsx
- [ ] Heavy components wrapped in `React.memo` where appropriate
- [ ] Large lists use pagination or virtualization
- [ ] No inline object/function creation in hot render paths
- [ ] Vite chunk splitting configured for vendor code
- [ ] No unnecessarily heavy dependencies

## Error Handling
- [ ] `ErrorBoundary` components exist and wrap major routes
- [ ] All `fetch`/`axios` calls wrapped in try/catch
- [ ] User-facing error messages (not raw Error objects)
- [ ] Backend crash detection and notification to user
- [ ] Loading and error states in all data-fetching components
- [ ] No empty catch blocks (`catch {}`, `catch(e) {}`)

## Backend Integration
- [ ] `BackendManager` spawns correctly (dev path + prod path)
- [ ] Health check polling (`/health` endpoint)
- [ ] Auto-restart on crash (max retries with exponential backoff)
- [ ] Graceful shutdown on app quit
- [ ] API keys passed via environment variables
- [ ] Dynamic port assignment (not hardcoded)

## Code Quality
- [ ] `npm run lint` — zero errors, count warnings
- [ ] No TODO/FIXME/HACK comments without tracking
- [ ] Consistent naming: camelCase (functions/vars), PascalCase (components/types)
- [ ] No dead exports (exported but never imported)
- [ ] No duplicated logic across files
- [ ] ESLint max-warnings set to 0

## CI/CD
- [ ] GitHub Actions workflow exists and runs on push/PR
- [ ] CI runs: `type-check`
- [ ] CI runs: `lint`
- [ ] CI runs: tests (`vitest`)
- [ ] CI runs: build verification
- [ ] Coverage thresholds enforced in CI
- [ ] E2E tests configured in CI
- [ ] Release automation (artifact upload, GitHub Releases)

## Build & Packaging
- [ ] electron-builder targets: mac, win, linux
- [ ] Backend bundling script exists and works
- [ ] PyInstaller spec file configured
- [ ] Code signing configured (or documented as TODO)
- [ ] Auto-updater (`electron-updater`) configured in main process

## Accessibility
- [ ] Interactive elements have `aria-label` or `aria-labelledby`
- [ ] Custom buttons/links have proper `role` attributes
- [ ] Keyboard navigation works for main workflows
- [ ] Focus indicators visible on all focusable elements
- [ ] Color contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large)
- [ ] No information conveyed by color alone
- [ ] Images/icons have alt text or aria-label

## Documentation
- [ ] README.md matches current project state
- [ ] CLAUDE.md matches current project state
- [ ] Architecture docs exist in `docs/`
- [ ] Key exported functions have JSDoc comments
- [ ] Troubleshooting guide exists in `docs/troubleshooting/`

## i18n
- [ ] i18next configured and initialized
- [ ] Translation JSON files exist with at least 1 locale
- [ ] Components use `useTranslation()` hook
- [ ] No hardcoded user-facing strings in JSX
- [ ] Dates/numbers use `Intl` API for formatting
- [ ] Layout supports RTL (or documented as not needed)
