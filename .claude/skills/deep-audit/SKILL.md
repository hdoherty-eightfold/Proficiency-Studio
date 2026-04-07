---
name: deep-audit
description: Full-stack project audit with persistent learning loop. Grades 15 dimensions (tests, deps, TypeScript, architecture, security, performance, error handling, build, backend, code quality, CI/CD, docs, accessibility, i18n, build & packaging), tracks history, and generates prioritized action plans to reach 100.
user-invocable: true
args:
  - name: focus
    description: "Optional: comma-separated dimensions to audit (e.g., 'tests,security,build'). Omit to audit everything."
    required: false
  - name: fix
    description: "Optional: if 'true', also fix low-hanging-fruit issues found during audit."
    required: false
---

Run a comprehensive full-stack audit of the entire project. This is NOT a UI-only audit — it covers tests, dependencies, TypeScript, architecture, security, performance, error handling, builds, backend integration, code quality, CI/CD, documentation, accessibility, and i18n.

**This skill audits the PROJECT. For UI/design audits, use `/audit` instead.**

## Phase 0: Load Previous Audit State

**Before doing anything else**, read `docs/AUDIT_HISTORY.md` from the project root.

- If the file exists, parse the most recent `## Audit: YYYY-MM-DD` entry. Extract:
  - Dimension scores table
  - Open issues list (with their IDs like `SEC-001`, `TEST-003`)
  - Composite score
- Store previous scores and issues for comparison in Phase 3.
- If the file does not exist, this is the first audit. Note that and proceed.

## Phase 1: Execute Diagnostic Commands

Run these commands and capture their output. **Execute independent commands in parallel where possible.** Every dimension MUST have real command output or file analysis as evidence — never estimate or assume.

If the `focus` argument was provided, only run diagnostics for the specified dimensions. Otherwise, run all.

### 1A. Build Health (weight: 10%)
```bash
npm run build:renderer 2>&1
npm run build:main 2>&1
npm run build:preload 2>&1
```
- Count errors and warnings from each build.
- All three must produce zero errors for a perfect score.

### 1B. TypeScript Strictness (weight: 8%)
```bash
npm run type-check 2>&1
```
- Count type errors across all tsconfig projects.
- Search for `any` types in production code (exclude test files):
```bash
grep -rn ": any" src/ --include="*.ts" --include="*.tsx" | grep -v ".test." | grep -v "test/" | grep -v "__mocks__"
```
- Search for `@ts-ignore` and `@ts-expect-error`:
```bash
grep -rn "@ts-ignore\|@ts-expect-error" src/ --include="*.ts" --include="*.tsx"
```
- Check tsconfig strict mode settings.

### 1C. Tests (weight: 12%)
```bash
npx vitest run 2>&1
npx vitest run --coverage 2>&1
```
- Record: total tests, passing, failing, skipped, test files count.
- Record coverage percentages (statements, branches, functions, lines).
- Identify files/directories with 0% coverage.
- Check test quality: look for tests with no assertions, snapshot-only tests, tests that only assert `toBeDefined()`.

### 1D. Dependencies (weight: 7%)
```bash
npm audit 2>&1
npm outdated 2>&1
```
- Count vulnerabilities by severity (critical, high, moderate, low).
- Count outdated packages by semver level (major, minor, patch).
- Check for unused dependencies: for each dependency in package.json, search if it's actually imported anywhere in `src/`.

### 1E. Security (weight: 10%)
Scan code for security issues by reading these files:
- `src/main/electron-main.ts` — check `webPreferences`: `contextIsolation` must be `true`, `nodeIntegration` must be `false`
- `src/preload/preload.ts` — verify `contextBridge` usage is correct
- `src/main/ipc-handlers.ts` — check for input validation on all IPC channels
- Search entire `src/` for: `eval(`, `new Function(`, `innerHTML`, `dangerouslySetInnerHTML`, `document.write`
- Search for hardcoded API keys/secrets: patterns like `sk-`, `key-`, `api_key =`, `secret =` in source files
- Verify `.env` is in `.gitignore`
- Check if Content-Security-Policy is configured anywhere in main process

### 1F. Architecture (weight: 8%)
- Find all files over 500 LOC (excluding tests): `find src/ -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn`
- Check config centralization per CLAUDE.md rules:
  - Model config in `src/renderer/config/models.ts`
  - Storage keys in `src/renderer/config/storage-keys.ts`
  - Proficiency config in `src/renderer/config/proficiency.ts`
- Search for hardcoded model names outside config files
- Check for circular imports (look for files that import from each other)
- Verify separation of concerns: stores don't contain UI, components don't contain business logic

### 1G. Performance (weight: 7%)
- Check for `React.lazy()` usage in `App.tsx` or route definitions
- Search for `React.memo`, `useMemo`, `useCallback` usage and appropriateness
- Check if large lists use pagination or virtualization
- Search for inline object/function creation in JSX (patterns like `style={{`, `onClick={() =>` in render paths)
- Check vite.config.ts chunk splitting strategy
- Look at bundle size: check if there are unnecessarily heavy dependencies

### 1H. Error Handling (weight: 8%)
- Search for `ErrorBoundary` components and where they're used
- Check service files (`src/renderer/services/`) for try/catch on all API calls
- Search for swallowed errors: `catch {}`, `catch(e) {}`, `.catch(() => {})` with empty bodies
- Check `src/main/backend-manager.ts` for crash recovery logic
- Verify user-facing error messages exist (not raw error objects shown to users)
- Check for loading/error states in data-fetching components

### 1I. Build & Packaging (weight: 5%)
- Check electron-builder config in `package.json` for mac/win/linux targets
- Verify `scripts/build-backend.mjs` or `scripts/build-backend.sh` exists and is configured
- Check for code signing configuration
- Check for auto-updater setup (`electron-updater` usage in main process)

### 1J. Backend Integration (weight: 7%)
- Read `src/main/backend-manager.ts`: verify health check, dynamic port, shutdown, auto-restart with backoff
- Check `src/renderer/services/` for API error handling and timeout configuration
- Verify API key flow: Electron store → env vars → backend process
- Check dev vs production path handling for backend binary

### 1K. Code Quality (weight: 7%)
```bash
npm run lint 2>&1
```
- Count lint errors and warnings.
- Search for TODO/FIXME/HACK comments: `grep -rn "TODO\|FIXME\|HACK" src/ --include="*.ts" --include="*.tsx"`
- Check for dead exports: exported functions/types never imported elsewhere
- Look for duplicated logic patterns across files
- Check naming consistency (camelCase for functions, PascalCase for components/types)

### 1L. CI/CD (weight: 5%)
- Read `.github/workflows/` files
- Check if CI runs: type-check, lint, tests, build
- Check for coverage thresholds/gates in CI
- Check for E2E tests in CI
- Check for release automation (artifact upload, GitHub Releases)

### 1M. Documentation (weight: 3%)
- Check README.md accuracy against current project state
- Check CLAUDE.md accuracy against current project state
- Verify architecture docs exist in `docs/`
- Check for JSDoc on exported functions in `src/renderer/lib/`, `src/renderer/services/`, `src/renderer/stores/`
- Check for troubleshooting documentation

### 1N. Accessibility (weight: 5%)
- Search for ARIA attributes (`aria-label`, `aria-describedby`, `role=`) on interactive elements
- Check for keyboard event handlers (`onKeyDown`, `onKeyPress`) alongside click handlers
- Search for focus management (`autoFocus`, `focus()`, `tabIndex`)
- Check for color contrast: hardcoded colors without CSS variables
- Look for images/icons without alt text or aria-label

### 1O. Internationalization (weight: 3%)
- Check if i18next is configured and initialized (look for `i18n.init` or `i18next.init`)
- Search for translation files (JSON files in `locales/` or `translations/` directories)
- Check components for `useTranslation()` hook usage vs hardcoded strings
- Search for hardcoded user-facing strings in JSX (string literals as children or in props like `placeholder=`, `title=`)
- Check for `Intl.DateTimeFormat`, `Intl.NumberFormat` usage

## Phase 2: Score Each Dimension

Use the grading rubric in `reference/grading-rubric.md`. For each dimension, assign a score 0-100 based on **concrete evidence** from Phase 1.

**Scoring principles:**
- 90-100: Excellent. Industry best practices, no issues.
- 70-89: Good. Minor issues, mostly follows best practices.
- 50-69: Acceptable. Notable gaps, some risk.
- 30-49: Poor. Significant issues requiring attention.
- 0-29: Critical. Fundamental problems, blocking quality.

**Be brutally honest.** Generous grading defeats the purpose — the goal is to identify every gap and close it.

Calculate the weighted composite score:

| Dimension | Weight |
|-----------|--------|
| Tests | 12% |
| Build Health | 10% |
| Security | 10% |
| TypeScript | 8% |
| Architecture | 8% |
| Error Handling | 8% |
| Dependencies | 7% |
| Performance | 7% |
| Backend Integration | 7% |
| Code Quality | 7% |
| CI/CD | 5% |
| Build & Packaging | 5% |
| Accessibility | 5% |
| Documentation | 3% |
| i18n | 3% |

**Letter grades:** A: 90+, B: 80+, C: 70+, D: 60+, F: <60

## Phase 3: Compare Against Previous Audit

If a previous audit exists in `docs/AUDIT_HISTORY.md`:

1. For each dimension, calculate `delta = current_score - previous_score`
2. Classify trend: **Improving** (delta > +3), **Stable** (-3 to +3), **Degrading** (delta < -3)
3. Track issues:
   - **Resolved**: Previous issue IDs no longer found in current findings
   - **Persistent**: Previous issue IDs still present — flag these prominently, they represent accumulating debt
   - **New**: Issues found for the first time, assign next available ID in their dimension prefix
4. If 3+ audit entries exist, calculate **velocity** — is improvement accelerating, plateauing, or regressing?

Display comparison table:
```
| Dimension        | Previous | Current | Delta | Trend       |
|------------------|----------|---------|-------|-------------|
| Tests            | 72       | 85      | +13   | Improving   |
| Security         | 60       | 58      | -2    | Stable      |
| ...              |          |         |       |             |
| **COMPOSITE**    | **68**   | **76**  | **+8**| **Improving** |
```

If this is the first audit, skip comparison and note "First audit — baseline established."

## Phase 4: Generate Report

### Executive Summary
- **Composite score** (0-100) with letter grade
- **Trend** since last audit (or "First audit — baseline")
- **Top 3 strengths** (highest-scoring dimensions)
- **Top 3 weaknesses** (lowest-scoring dimensions)
- **Single most impactful improvement** to make next

### Dimension Scores Table
All 15 dimensions with score, weight, weighted contribution, and one-line summary.

### Critical Findings
Issues that are security-related, causing test/build failures, or blocking production readiness. These MUST be fixed first.

### Persistent Issues (Learning Loop)
Issues found in previous audits that still exist. These represent growing technical debt and should be highlighted with urgency.

### New Issues
Issues found for the first time in this audit.

### Resolved Issues
Issues from the previous audit that are now fixed. **Celebrate these** — they show progress.

### Positive Findings
What is working well. Patterns to maintain and replicate.

## Phase 5: Generate Action Plan to 100

For each open issue, document:
- **Issue ID**: `DIM-NNN` format (e.g., `SEC-001`, `TEST-003`)
- **Issue**: What needs fixing
- **Dimension**: Which audit dimension
- **Score impact**: Estimated points this costs the dimension
- **Effort**: S (< 1 hour), M (1-4 hours), L (4+ hours)
- **Suggested skill/command**: Which existing skill can help (from: `/animate`, `/quieter`, `/optimize`, `/adapt`, `/clarify`, `/distill`, `/delight`, `/onboard`, `/normalize`, `/audit`, `/harden`, `/polish`, `/extract`, `/bolder`, `/arrange`, `/typeset`, `/critique`, `/colorize`, `/overdrive`, or "manual fix")

Group into sprint-sized batches:
- **Sprint A (Quick Wins)**: All S-effort items. Maximum score improvement per hour.
- **Sprint B (High Impact)**: M-effort items sorted by score impact descending.
- **Sprint C (Foundation)**: L-effort structural improvements.
- **Sprint D (Polish)**: Remaining items for perfection.

For each sprint, estimate the composite score after completion:
```
Current: 76/100
After Sprint A: ~82/100 (+6)
After Sprint B: ~90/100 (+8)
After Sprint C: ~97/100 (+7)
After Sprint D: ~100/100 (+3)
```

## Phase 6: Persist Results

**CRITICAL**: After generating the report, update `docs/AUDIT_HISTORY.md`.

If the file does not exist, create it with this header:
```markdown
# ProfStudio Desktop - Deep Audit History

This file is automatically maintained by the `/deep-audit` skill. Do not edit manually.
Previous entries are never deleted — the history IS the learning loop.
```

Prepend (newest first) a new entry with this exact format:

```markdown
## Audit: YYYY-MM-DD

**Composite Score: XX/100 (Letter Grade)**
**Trend: Improving/Stable/Degrading/First audit**

### Dimension Scores
| Dimension | Score | Weight | Weighted | Notes |
|-----------|-------|--------|----------|-------|
| Tests | XX | 12% | X.X | ... |
| Build Health | XX | 10% | X.X | ... |
| ... | | | | |
| **COMPOSITE** | | | **XX.X** | |

### Open Issues
- ID: Description [SEVERITY]
- SEC-001: No Content-Security-Policy configured [CRITICAL]
- TEST-003: Coverage below 70% threshold [MEDIUM]

### Resolved Issues (since last audit)
- ID: Description — RESOLVED

### Action Plan Summary
- Sprint A (Quick Wins): +X points estimated → XX/100
- Sprint B (High Impact): +X points estimated → XX/100
- Sprint C (Foundation): +X points estimated → XX/100
- Sprint D (Polish): +X points estimated → 100/100
```

**Never delete previous entries.** The history enables trend analysis and learning across sessions.

If the `fix` argument is `true`, after persisting results:
1. Proceed to fix all S-effort items from Sprint A automatically
2. Re-run affected diagnostic commands to verify fixes
3. Update scores and persist again with a note: "Post-fix re-audit"

---

## Rules

**NEVER**:
- Skip running actual commands — always execute, never estimate
- Give a score without evidence from command output or file analysis
- Delete previous audit history entries
- Grade leniently — be brutally honest, this is how we improve
- Report on UI/design aesthetics here — that is what `/audit` and `/critique` are for
- Invent skills/commands that do not exist
- Persist results before showing the full report to the user

**ALWAYS**:
- Run every diagnostic command and capture real output
- Show exact error counts, not approximations
- Compare against previous audit when history exists
- Generate concrete, actionable items (not vague advice)
- Persist results to the history file after every audit
- Assign persistent issue IDs so issues can be tracked across audits
- Follow the verification requirements in CLAUDE.md after any fixes
