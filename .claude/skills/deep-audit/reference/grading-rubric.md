# Deep Audit Grading Rubric

Concrete criteria for scoring each dimension 0-100. Use evidence from diagnostic commands — never guess.

## Tests (weight: 12%)
- **95-100**: All tests pass, >90% coverage, tests cover edge cases and error paths, good assertion quality, factories used consistently
- **85-94**: All tests pass, >80% coverage, good assertion quality, minor gaps in edge case coverage
- **70-84**: All tests pass, >60% coverage, some thin tests (only `toBeDefined`, snapshot-only)
- **50-69**: Some test failures OR <60% coverage OR many low-quality tests
- **30-49**: Many failures OR <40% coverage OR test infrastructure issues
- **0-29**: Tests mostly broken, <20% coverage, or no test infrastructure

## Build Health (weight: 10%)
- **95-100**: Zero errors AND zero warnings across all 3 builds (renderer, main, preload)
- **80-94**: Zero errors, 1-5 warnings total
- **60-79**: Zero errors, >5 warnings
- **40-59**: 1-3 errors in any build
- **0-39**: Build failures or >3 errors

## TypeScript (weight: 8%)
- **95-100**: Zero type errors, zero `any` in production code, strict mode on all configs, zero `@ts-ignore`
- **85-94**: Zero type errors, 1-3 `any` usages, zero `@ts-ignore`
- **70-84**: Zero type errors, 4-10 `any` usages or 1-2 `@ts-ignore`
- **50-69**: 1-5 type errors OR >10 `any` usages
- **0-49**: >5 type errors or widespread `any` / disabled strict mode

## Security (weight: 10%)
- **95-100**: contextIsolation=true + nodeIntegration=false, CSP configured, no XSS vectors (eval/innerHTML/dangerouslySetInnerHTML), IPC channels validated, API keys in env only, no hardcoded secrets, .env gitignored
- **80-94**: Most security measures in place, 1-2 minor gaps (e.g., missing CSP but everything else solid)
- **60-79**: Basic security present but notable gaps (e.g., no CSP, partial IPC validation)
- **40-59**: Multiple security gaps (e.g., no IPC validation + XSS vectors found)
- **0-39**: Critical vulnerabilities (exposed nodeIntegration, hardcoded API keys, eval with user input)

## Architecture (weight: 8%)
- **95-100**: Clean separation of concerns, no file >300 LOC (excl. tests), no circular deps, all config centralized per CLAUDE.md rules, stores/components/services properly layered
- **80-94**: Good separation, <3 files >500 LOC, config mostly centralized, minor violations
- **60-79**: Reasonable structure, some large files (>500 LOC), 1-2 centralization violations
- **40-59**: Poor separation, many large files, scattered config, components doing too much
- **0-39**: No discernible architecture, monolithic files, circular dependencies

## Error Handling (weight: 8%)
- **95-100**: Error boundaries at route level, all API calls have try/catch with user-friendly messages, backend crash recovery verified, loading/error states in all data-fetching components, no swallowed errors
- **80-94**: Error boundaries exist, most API errors handled, backend recovery works, minor gaps
- **60-79**: Some error handling, gaps in API layer or missing loading states
- **40-59**: Minimal error handling, errors swallowed or shown as raw objects
- **0-39**: No error handling strategy, app crashes on errors

## Dependencies (weight: 7%)
- **95-100**: Zero vulnerabilities, all deps current (no major versions behind), no unused deps
- **80-94**: Zero critical/high vulns, <5 outdated (minor/patch), no unused deps
- **60-79**: No critical vulns, <3 major versions behind, possibly 1-2 unused deps
- **40-59**: Has high vulnerabilities OR >3 major versions behind OR many unused deps
- **0-39**: Critical vulnerabilities or severely outdated core deps (Electron, React)

## Performance (weight: 7%)
- **95-100**: Routes code-split with React.lazy, heavy components lazy loaded, proper memoization, large lists virtualized/paginated, no inline object/function abuse, good chunk splitting
- **80-94**: Most routes split, some lazy loading, reasonable memoization, pagination exists
- **60-79**: Some code splitting, basic optimization, known performance gaps
- **40-59**: No code splitting, obvious performance issues, unnecessary re-renders
- **0-39**: Major performance problems, app sluggish under normal use

## Backend Integration (weight: 7%)
- **95-100**: Health check polling, auto-restart with exponential backoff, graceful shutdown, dynamic port, API keys via env vars, dev/prod path handling correct
- **80-94**: Core integration solid (health check + auto-restart + shutdown), minor gaps
- **60-79**: Integration works but has fragile areas (e.g., no auto-restart or hardcoded port)
- **40-59**: Integration has reliability issues, missing health checks or crash recovery
- **0-39**: Backend integration broken, no health monitoring

## Code Quality (weight: 7%)
- **95-100**: Zero lint errors/warnings, no DRY violations, no dead code, consistent naming (camelCase/PascalCase), SOLID principles followed
- **80-94**: <5 lint warnings, minor DRY violations, consistent naming
- **60-79**: Some lint issues (<20), noticeable DRY violations, mostly consistent
- **40-59**: Many lint issues or quality problems, inconsistent patterns
- **0-39**: No quality standards, widespread issues

## CI/CD (weight: 5%)
- **95-100**: CI runs type-check + lint + tests + coverage gates + E2E + build verification, CD with release automation and artifact upload
- **80-94**: CI runs type-check + lint + tests + build, missing coverage gates or E2E
- **60-79**: CI runs tests + build only
- **40-59**: CI exists but incomplete (missing lint or type-check)
- **0-39**: No CI or broken CI

## Build & Packaging (weight: 5%)
- **95-100**: All 3 platforms configured (mac/win/linux), backend bundled via PyInstaller, code signing configured, auto-updater with electron-updater working
- **80-94**: All platforms build, backend bundled, missing code signing or auto-updater
- **60-79**: Primary platform builds work, backend bundled, others untested
- **40-59**: Builds partially work, backend bundling has issues
- **0-39**: Build pipeline broken or missing

## Accessibility (weight: 5%)
- **95-100**: WCAG 2.1 AA compliant, keyboard nav complete for all flows, ARIA labels on all interactive elements, focus management correct, color contrast verified
- **80-94**: Most ARIA in place, keyboard nav works for main flows, focus indicators visible
- **60-79**: Basic accessibility, some ARIA attributes, keyboard nav partial
- **40-59**: Minimal accessibility consideration, few ARIA attributes
- **0-39**: No accessibility effort, keyboard-only usage impossible

## Documentation (weight: 3%)
- **95-100**: README accurate and comprehensive, architecture docs in docs/, JSDoc on all public APIs in lib/services/stores, troubleshooting guide exists, CLAUDE.md current
- **80-94**: README accurate, some docs exist, CLAUDE.md current
- **60-79**: README exists but incomplete, CLAUDE.md mostly current
- **40-59**: Minimal documentation, some outdated info
- **0-39**: No documentation or severely outdated

## i18n (weight: 3%)
- **95-100**: i18next configured, all user-facing strings externalized to translation files, RTL layout support, dates/numbers use Intl API, multiple locales available
- **80-94**: i18next configured, most strings externalized, locale-aware formatting
- **60-79**: i18n library installed, partial string externalization (>50%)
- **40-59**: i18n library present but barely used (<20% strings externalized)
- **0-39**: No i18n effort, all strings hardcoded in JSX
