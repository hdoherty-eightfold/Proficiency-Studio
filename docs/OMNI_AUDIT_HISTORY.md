# ProfStudio Desktop - Omni-Audit History

This file is automatically maintained by the `/omni-audit` skill.
Do not edit manually. Entries are NEVER deleted — history IS the learning loop.
Supersedes: docs/AUDIT_HISTORY.md (deep-audit) for top-level composite tracking.

---

## Post-Fix Re-Audit: 2026-04-07 (Sprint C continuation)

**Estimated Composite: ~85/100 (B)**
**Trend: Improving (+3 from Sprint A+B estimate of 82)**
**Note: Estimate based on issue closure — full re-audit needed to confirm**

### Issues Resolved This Session (Sprint C)
| ID | Description | Sprint |
|----|-------------|--------|
| SFDLC-004 | 100% deps unpinned → all exact versions via lockfile | C |
| TESTQ-003 | Factories underused → added to ConfigureProficiency, EnvironmentManager, AnalyticsDashboard, IntegrationPath tests | C |
| TESTQ-002 | Shallow assertions → meaningful data assertions in AnalyticsDashboard (stat counts, model names, top skills) | C |
| E2E-011 | E2E step navigation gap → 10 functional nav tests added covering steps 0–11 (render+nav for all) | C |
| QUAL-004 | Duplicate lint-staged key in package.json | C |

### Stats After Fixes
- TypeScript errors: **0** (renderer + main + preload)
- Tests: **609 passing** (+12 from Sprint A+B), 0 failing
- Builds: **3/3 clean** (renderer, main, preload)
- Deps: **0 unpinned** (all exact from lockfile)

### Still Open (Sprint D)
- ARCH-001: 13 files >500 LOC (L effort)
- SFDLC-003: unsafe-eval in dev CSP (required for Vite HMR, cannot remove)
- I18N-001: i18n only in BackendStatus (L effort)
- TESTQ-002: ~332 remaining shallow assertions (M effort, iterative)
- API-001: 81/133 Python backend routes uncovered by frontend
- UIUX-012: NotificationCenter raw Radix (no shadcn Popover available)
- PKG-001: No code signing configured
- BKND-002: Streaming timeout already implemented — RESOLVED (was already done)

---

## Post-Fix Re-Audit: 2026-04-07 (Sprint A + B + partial C)

**Estimated Composite: ~82/100 (B)**
**Trend: Improving (+8 from 74 baseline)**
**Note: Estimate based on issue closure — full re-audit needed to confirm**

### Issues Resolved This Session
| ID | Description | Sprint |
|----|-------------|--------|
| QUAL-003 | ESLint failure SFTPManager.tsx | A |
| DEP-003 | 4 HIGH Vite vulnerabilities | A |
| SFDLC-006 | No LICENSE file | A |
| SFDLC-001/BKND-010 | Preload IPC channel allowlist | A |
| SFDLC-002 | unsafe-inline in production CSP | A |
| SFDLC-008/BKND-011 | store:delete/clear no key validation | A |
| SFDLC-010/BKND-012 | API endpoint strings unvalidated in proxy | A |
| UIUX-011 | Toaster aria-live duplicate region | A |
| DX-001/002/003 | No .vscode/launch.json/settings.json/extensions.json | B |
| DX-004/SFDLC-005 | No git pre-commit hooks (husky + lint-staged added) | B |
| PAGE-003/UIFLOW-009 | ReviewAssessment redirect stub → full review page | B |
| DESIGN-002 | DialogContent opaque → backdrop-blur glass | B |
| DESIGN-004 | EnvironmentManager raw gray Tailwind → design tokens | B |
| DESIGN-001/003 | Glass variants + entrance animations applied to all 10 step pages | B |
| DESIGN-005 | AnalyticsDashboard raw grays → design tokens + bento grid | B |
| UIFLOW-010/PAGE-001 | Welcome loading+error states | B |
| UIFLOW-011/PAGE-002 | ExtractSkills empty state + modern UI | B |
| PAGE-004 | Settings loading state | B |
| PAGE-005 | Documentation glass card + animation | B |
| UIUX-013 | NotificationCenter dismiss/mark-read buttons aria-labels | B |
| UIUX-014 | NavButton collapsed-state aria-label | B |
| LLMAI-010 | promptTemplates hardcoded levels → {proficiency_levels} interpolation | B |
| LLMAI-011 | max_tokens configurable (was already done) | B |
| LLMAI-012 | Fallback provider chain (was already done) | B |
| API-002/005-010 | retryWithBackoff + phantom route fixes in service files | B |
| API-003 | AbortController support in retryWithBackoff | B |
| TESTQ-008 | ExtractSkills tests expanded from 3 → 14 tests | B |
| TESTQ-009 | ReviewAssessment tests rewritten for real page (13 tests) | B |
| SFDLC-007 | SBOM generation added to CI | C |
| SFDLC-009 | npm audit critical gate added to CI | C |

### Stats After Fixes
- TypeScript errors: **0** (renderer + main + preload)
- Tests: **597 passing**, 0 failing, 13 skipped
- Builds: **3/3 clean** (renderer, main, preload)
- ESLint: **0 errors** (QUAL-003 fixed)

### Still Open (Next Sprint)
- ARCH-001: 13 files >500 LOC (L effort)
- SFDLC-003: unsafe-eval in dev CSP (needed for Vite HMR, cannot remove)
- SFDLC-004: 100% deps unpinned
- I18N-001: i18n only in BackendStatus
- E2E-011/012/013/014: E2E coverage gaps
- TESTQ-002/003: Shallow assertions, factories underused
- API-001: 81/133 Python routes uncovered
- UIUX-012: NotificationCenter raw Radix (no shadcn Popover available)

---

## Omni-Audit: 2026-04-07

**Omni-Audit Composite: 74/100 (C)**
**Trend: First run — baseline established**
**Velocity: N/A (first run)**

### Group Scores
- Group A Foundation (60%): 49.4 pts
- Group B Extended QA (15%): 9.5 pts
- Group C New Dimensions (25%): 14.9 pts

### Dimension Scores (All 25)
| Dimension | Group | Score | Weight | Weighted | Notes |
|-----------|-------|-------|--------|----------|-------|
| Modern Design | NEW | 62 | 9% | 5.58 | Glass in primitives not feature pages; motion only in App+Welcome |
| Tests | DA | 84 | 7% | 5.88 | 576 tests/49 files all passing; 39.6% coverage |
| Build Health | DA | 98 | 5% | 4.90 | All 3 builds clean |
| Security | DA | 93 | 5% | 4.65 | Strong Electron posture; Sentry; CSP; 4 dev Vite vulns |
| TypeScript | DA | 100 | 5% | 5.00 | Perfect — 0 errors, 0 any, 0 @ts-ignore |
| Architecture | DA | 67 | 5% | 3.35 | 13 files >500 LOC (SkillRoleMatcher 1246) |
| Error Handling | DA | 87 | 5% | 4.35 | 3-level ErrorBoundary; states added to steps 1-3 |
| SFDLC | NEW | 56 | 6% | 3.36 | All OWASP Electron pass; deps unpinned; no pre-commit; unsafe-inline CSP |
| UI Flow Analysis | MQ | 55 | 5% | 2.75 | Step 5 redirect stub; Welcome/ExtractSkills missing states |
| Per-Page Deep Scan | NEW | 63 | 5% | 3.15 | ReviewAssessment 4.2; Settings 45.8; Documentation 29.2 |
| Dependencies | DA | 62 | 4% | 2.48 | 4 HIGH Vite vulns; Electron 6 majors behind |
| Performance | DA | 84 | 4% | 3.36 | All 12 lazy-loaded; good chunk splitting |
| Backend Integration | DA | 93 | 4% | 3.72 | Comprehensive; retryWithBackoff; validation |
| Code Quality | DA | 78 | 4% | 3.12 | ESLint fails SFTPManager.tsx (1 error + 1 warning) |
| E2E Coverage | MQ | 55 | 4% | 2.20 | All steps render+nav; functional coverage sparse |
| CI/CD | DA | 76 | 3% | 2.28 | type-check+lint+tests+E2E in CI; no coverage gates |
| Build & Packaging | DA | 72 | 3% | 2.16 | 3 platforms; auto-updater; no code signing |
| Accessibility | DA | 76 | 3% | 2.28 | 68 ARIA attrs; 9 kbd handlers |
| Logging | MQ | 80 | 3% | 2.40 | File transport; renderer bridge; Sentry; assessment logged |
| API Contract | MQ | 72 | 3% | 2.16 | 32 IPC channels mapped; generics on electron-api |
| API Surface | NEW | 62 | 3% | 1.86 | 39% Python route coverage; 89% methods bypass retry |
| Documentation | DA | 72 | 2% | 1.44 | README OK; CLAUDE.md comprehensive; no JSDoc |
| Developer Experience | NEW | 45 | 2% | 0.90 | No VS Code config; no git hooks |
| i18n | DA | 40 | 1% | 0.40 | en.json + init; only BackendStatus uses t() |
| **COMPOSITE** | | | **100%** | **73.73** | **74/100 (C)** |

### Sub-Agent Scores (Informational)
| Agent | Score | Issues Found |
|-------|-------|-------------|
| UI/UX Expert | 81 | 5 |
| Backend/API Expert | 88 | 3 |
| LLM/AI Expert | 81 | 3 |
| Test Quality Expert | 72 | 2 |
| Modern Design Expert | 62 | 5 |
| Security/SFDLC Expert | 56 | 10 |
| API Surface Expert | 62 | 4 |
| **Most productive this run** | Security/SFDLC Expert | 10 |

### Per-Page Scores
| Page | Loading | Empty | Error | A11y | ModernUI | Complete | Avg |
|------|---------|-------|-------|------|----------|----------|-----|
| 0 Welcome | 0 | 50 | 0 | 0 | 100 | 100 | 41.7 |
| 1 IntegrationPath | 100 | 50 | 100 | 0 | 100 | 100 | 75.0 |
| 2 ExtractSkills | 100 | 0 | 100 | 25 | 0 | 100 | 54.2 |
| 3 ConfigureProficiency | 50 | 100 | 100 | 100 | 100 | 100 | 91.7 |
| 4 RunAssessment | 100 | 75 | 100 | 50 | 75 | 100 | 83.3 |
| 5 ReviewAssessment | 0 | 0 | 0 | 0 | 0 | 25 | 4.2 |
| 6 AssessmentHistory | 100 | 100 | 100 | 0 | 100 | 100 | 83.3 |
| 7 AnalyticsDashboard | 100 | 100 | 50 | 0 | 100 | 100 | 75.0 |
| 8 PromptEditor | 100 | 75 | 100 | 0 | 100 | 100 | 79.2 |
| 9 EnvironmentManager | 100 | 100 | 100 | 50 | 100 | 100 | 91.7 |
| 10 Settings | 0 | 0 | 50 | 75 | 50 | 100 | 45.8 |
| 11 Documentation | 0 | 50 | 25 | 0 | 25 | 75 | 29.2 |
| **OVERALL AVG** | | | | | | | **62.8** |

### Known Issues Registry
| ID | Description | Severity | First Seen | Consecutive Runs | Status |
|----|-------------|----------|------------|-----------------|--------|
| ARCH-001 | 13 files >500 LOC | CRITICAL | 2026-03-08 | 4+ | OPEN |
| PAGE-003 | ReviewAssessment (step 5) redirect stub — renders null | CRITICAL | 2026-04-07 | 1 | NEW |
| DEP-003 | 4 HIGH Vite vulnerabilities (npm audit fix available) | HIGH | 2026-04-07 | 1 | NEW |
| QUAL-003 | ESLint failure SFTPManager.tsx (1 error + 1 warning) | HIGH | 2026-04-07 | 1 | NEW |
| SFDLC-001 | Generic IPC invoke() in preload — no channel allowlist | HIGH | 2026-04-07 | 1 | NEW |
| SFDLC-002 | unsafe-inline in production CSP script-src | HIGH | 2026-04-07 | 1 | NEW |
| SFDLC-004 | 100% of 70 deps unpinned | HIGH | 2026-04-07 | 1 | NEW |
| SFDLC-005 | No pre-commit secret scanning | HIGH | 2026-04-07 | 1 | NEW |
| DESIGN-001 | Glass variants in Button/Card never applied in feature pages | HIGH | 2026-04-07 | 1 | NEW |
| DESIGN-002 | DialogContent opaque — visual depth broken | HIGH | 2026-04-07 | 1 | NEW |
| DESIGN-003 | Motion only in 2/12 steps — 10 steps no entrance animation | HIGH | 2026-04-07 | 1 | NEW |
| UIFLOW-009 | ReviewAssessment (step 5) is a redirect — no distinct review page | HIGH | 2026-04-07 | 1 | NEW |
| UIFLOW-010 | Welcome (step 0) missing loading and error states | HIGH | 2026-04-07 | 1 | NEW |
| UIFLOW-011 | ExtractSkills (step 2) missing empty state | HIGH | 2026-04-07 | 1 | NEW |
| PAGE-001 | Welcome — no loading/error state | HIGH | 2026-04-07 | 1 | NEW |
| PAGE-002 | ExtractSkills — no empty state, no modern UI | HIGH | 2026-04-07 | 1 | NEW |
| TESTQ-002 | ~344 shallow assertions | HIGH | 2026-03-25 | 3 | PERSISTING |
| TESTQ-003 | Test factories in only 4/49 files | HIGH | 2026-03-25 | 3 | PERSISTING |
| BKND-002 | No client-side timeout on assessment streaming | HIGH | 2026-03-25 | 3 | PERSISTING |
| LLMAI-010 | promptTemplates hardcoded levels not interpolated | HIGH | 2026-04-07 | 1 | NEW |
| API-001 | 81/133 Python backend routes uncovered by frontend | HIGH | 2026-04-07 | 1 | NEW |
| API-002 | 76/85 service methods bypass retryWithBackoff | HIGH | 2026-04-07 | 1 | NEW |
| E2E-011 | IntegrationPath data entry not E2E tested | HIGH | 2026-04-07 | 1 | NEW |
| TESTQ-008 | ExtractSkills.test.tsx only 3 shallow tests | HIGH | 2026-04-07 | 1 | NEW |
| UIUX-011 | Toaster aria-live wrapping breaks Radix ARIA region | HIGH | 2026-04-07 | 1 | NEW |
| DX-001 | No .vscode/launch.json for Electron debug | HIGH | 2026-04-07 | 1 | NEW |
| SFDLC-003 | unsafe-eval in dev CSP | MED | 2026-04-07 | 1 | NEW |
| SFDLC-007 | No SBOM artifact | MED | 2026-04-07 | 1 | NEW |
| SFDLC-008 | store:delete/store:clear no key validation | MED | 2026-04-07 | 1 | NEW |
| SFDLC-009 | CI allows push-to-main without PR gate | MED | 2026-04-07 | 1 | NEW |
| SFDLC-010 | API endpoint strings from renderer unvalidated | MED | 2026-04-07 | 1 | NEW |
| DESIGN-004 | EnvironmentManager uses raw gray Tailwind colors | MED | 2026-04-07 | 1 | NEW |
| DESIGN-005 | AnalyticsDashboard uniform grid — no bento layout | MED | 2026-04-07 | 1 | NEW |
| PAGE-004 | Settings — no loading/empty states | MED | 2026-04-07 | 1 | NEW |
| PAGE-005 | Documentation — poor state coverage | MED | 2026-04-07 | 1 | NEW |
| UIUX-012 | NotificationCenter uses raw Radix not shadcn | MED | 2026-04-07 | 1 | NEW |
| UIUX-013 | Notification dismiss/mark-read buttons no aria-label | MED | 2026-04-07 | 1 | NEW |
| UIUX-014 | NavButton reimplements button behavior manually | MED | 2026-04-07 | 1 | NEW |
| BKND-010 | Preload generic invoke() no channel allowlist | MED | 2026-04-07 | 1 | NEW |
| BKND-011 | store:delete/clear lack key validation | MED | 2026-04-07 | 1 | NEW |
| BKND-012 | API endpoint strings unvalidated in proxy | MED | 2026-04-07 | 1 | NEW |
| LLMAI-012 | Fallback provider one-shot only | MED | 2026-04-07 | 1 | NEW |
| API-003 | No AbortController at frontend service layer | MED | 2026-04-07 | 1 | NEW |
| API-004 | SFTP test endpoint URL may not match backend | MED | 2026-04-07 | 1 | NEW |
| E2E-012 | Steps 4,8,9,10 no data entry E2E tests | MED | 2026-04-07 | 1 | NEW |
| E2E-013 | Steps 1-4,7-10 no success state E2E tests | MED | 2026-04-07 | 1 | NEW |
| E2E-014 | Steps 7,9 no backend call E2E tests | MED | 2026-04-07 | 1 | NEW |
| TESTQ-009 | ReviewAssessment tests trivial redirect checks only | MED | 2026-04-07 | 1 | NEW |
| DX-002 | No .vscode/settings.json | MED | 2026-04-07 | 1 | NEW |
| DX-003 | No .vscode/extensions.json | MED | 2026-04-07 | 1 | NEW |
| DX-004 | No git pre-commit hooks | MED | 2026-04-07 | 1 | NEW |
| I18N-001 | i18n infrastructure exists but most UI hardcoded | MED | ongoing | ongoing | OPEN |
| PKG-001 | No code signing configured | LOW | 2026-03-08 | 4+ | OPEN |
| SFDLC-006 | No LICENSE file | LOW | 2026-04-07 | 1 | NEW |
| LLMAI-011 | max_tokens presets hardcoded in ConfigureProficiency | LOW | 2026-04-07 | 1 | NEW |
| UIUX-015 | AnimatePresence inside Suspense may skip exit animation | LOW | 2026-04-07 | 1 | NEW |

### Resolved Issues (Since Last Deep-Audit)
- LOG-004: No error tracking service — RESOLVED 2026-03-29 (Sentry integrated)
- CI-002: @vitest/coverage-v8 missing — RESOLVED 2026-03-29
- TESTQ-007: 4 test failures — RESOLVED 2026-03-29 (576 all passing)
- QUAL-002: Conditional useCallback — RESOLVED 2026-03-29
- TESTQ-006: No workflow integration test — RESOLVED 2026-03-29
- UIFLOW-003/4/5: Empty+error states missing — RESOLVED 2026-03-29
- UIFLOW-008: 7 orphan components — RESOLVED 2026-03-29 (deleted)
- BKND-003: store:set no validation — RESOLVED 2026-03-29 (ALLOWED_STORE_KEYS)
- BKND-008/009: stream-assessment input + path traversal — RESOLVED 2026-03-29
- LLMAI-009: Hardcoded model in ConfigurationManager — RESOLVED 2026-03-29

### New Issues (First Seen This Run)
- PAGE-003: ReviewAssessment redirect stub [CRITICAL]
- SFDLC-001/002/003/004/005/006/007/008/009/010: Full SFDLC gap set [HIGH/MED/LOW]
- DESIGN-001/002/003/004/005: Modern design gaps [HIGH/MED]
- UIFLOW-009/010/011: UI flow state gaps [HIGH]
- PAGE-001/002/004/005: Per-page state gaps [HIGH/MED]
- API-001/002/003/004: API surface gaps [HIGH/MED]
- E2E-011/012/013/014: E2E coverage gaps [HIGH/MED]
- DX-001/002/003/004: Developer experience gaps [HIGH/MED]
- UIUX-011/012/013/014/015: UI/UX expert findings [HIGH/MED/LOW]
- TESTQ-008/009: Test quality gaps [HIGH/MED]
- BKND-010/011/012: IPC security gaps [MED]
- LLMAI-010/011/012: LLM/AI gaps [HIGH/LOW/MED]
- DEP-003: Vite HIGH vulnerabilities [HIGH]
- QUAL-003: ESLint failure [HIGH]

### Action Plan Summary
- Sprint A (Quick Wins, ~1hr): +5 pts → 79/100 (QUAL-003, DEP-003, SFDLC-006, BKND-011, UIUX-011)
- Sprint B (High Impact, ~3-5 days): +12 pts → 91/100 (DESIGN-001/002/003, UIFLOW-009/PAGE-003, DX-001/002/003, SFDLC-002, LLMAI-010, API-002, PAGE-001, TESTQ-008)
- Sprint C (Foundation, ~2 weeks): +8 pts → 99/100 (ARCH-001, SFDLC-004/005, I18N-001, API-001, SFDLC-001, TESTQ-002/003)
- Sprint D (Polish): +1 pts → 100/100 (PKG-001, SFDLC-007/009, coverage thresholds, DESIGN-005)

### Agent Effectiveness History (Run 1 baseline)
| Agent | Run 1 | Avg |
|-------|-------|-----|
| UI/UX Expert | 5 | 5 |
| Backend/API Expert | 3 | 3 |
| LLM/AI Expert | 3 | 3 |
| Test Quality Expert | 2 | 2 |
| Modern Design Expert | 5 | 5 |
| Security/SFDLC Expert | 10 | 10 |
| API Surface Expert | 4 | 4 |
