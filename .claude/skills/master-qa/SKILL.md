---
name: master-qa
description: >
  Comprehensive 20-dimension QA audit that extends deep-audit with: UI flow
  analysis (step reachability, loading/empty/error states, dead buttons, orphan
  components), 4 expert sub-agents (UI/UX, Backend/API, LLM/AI, Test Quality),
  E2E coverage mapping (Playwright gap matrix), API contract validation
  (TypeScript types vs service signatures), and logging/observability audit.
  Runs deep-audit as its foundation, then adds 5 new scored dimensions. Tracks
  a Known Issues Registry that escalates persisting issues across runs.
  Persists all results to docs/AUDIT_HISTORY.md with full history preserved.
user-invocable: true
args:
  - name: focus
    description: >
      Optional: comma-separated phases to run (deep-audit, ui-flow, sub-agents,
      e2e-coverage, api-contract, logging). Omit to run everything.
    required: false
  - name: fix
    description: "Optional: if 'true', also fix all S-effort Sprint A items after auditing."
    required: false
  - name: agent
    description: >
      Optional: run only one expert sub-agent
      (ui-ux, backend-api, llm-ai, test-quality).
    required: false
---

# master-qa

Comprehensive QA audit for ProfStudio Desktop. Runs deep-audit as the
foundation and adds five specialized phases covering dimensions that deep-audit
does not grade.

**This is NOT a replacement for deep-audit — it is a superset.**
Deep-audit handles 15 dimensions (tests, TypeScript, security, architecture,
error handling, dependencies, performance, backend integration, code quality,
CI/CD, build & packaging, accessibility, documentation, i18n). master-qa adds
5 more (UI flow, API contract, E2E coverage, logging/observability, plus
synthesis from 4 expert sub-agents).

---

## Phase 0: Foundation — Run deep-audit

**Before doing anything else**, run the deep-audit skill and capture its full
output. Do NOT skip this phase even if `focus` is set — the 15 foundation
dimensions are required for the composite score calculation.

```
/deep-audit
```

After deep-audit completes, read `docs/AUDIT_HISTORY.md` and extract from the
newest `## Audit: YYYY-MM-DD` entry:
- Composite score (the foundation score)
- All 15 individual dimension scores
- All open issue IDs (e.g. `SEC-001`, `TEST-003`)

Store these as "foundation data" for Phase 6 (score aggregation).

If `focus` is specified and does not include `deep-audit`, skip running it and
load the most recent audit entry from `docs/AUDIT_HISTORY.md` directly.

---

## Phase 1: UI Flow Analysis

**Goal**: Verify the full step-navigation graph is intact and every view has
the minimum required UI states. This app uses a step-index model — not URL
routing — so this phase analyzes index-based navigation.

### 1A. Build the Canonical Step Map

Read `src/renderer/App.tsx`. Extract the `STEP_COMPONENTS` array (near line 76).
The expected map is:

| Index | Component | File path |
|-------|-----------|-----------|
| 0 | Welcome | `src/renderer/components/welcome/Welcome.tsx` |
| 1 | IntegrationPath | `src/renderer/components/integration/IntegrationPath.tsx` |
| 2 | ExtractSkills | `src/renderer/components/skills/ExtractSkills.tsx` |
| 3 | ConfigureProficiency | `src/renderer/components/proficiency/ConfigureProficiency.tsx` |
| 4 | RunAssessment | `src/renderer/components/proficiency/RunAssessment.tsx` |
| 5 | ReviewAssessment | `src/renderer/components/review/ReviewAssessment.tsx` |
| 6 | AssessmentHistory | `src/renderer/components/history/AssessmentHistory.tsx` |
| 7 | AnalyticsDashboard | `src/renderer/components/analytics/AnalyticsDashboard.tsx` |
| 8 | PromptEditor | `src/renderer/components/prompts/PromptEditor.tsx` |
| 9 | EnvironmentManager | `src/renderer/components/environments/EnvironmentManager.tsx` |
| 10 | Settings | `src/renderer/components/settings/Settings.tsx` |
| 11 | Documentation | `src/renderer/components/documentation/Documentation.tsx` |

Read `src/renderer/components/layout/Sidebar.tsx`. Extract `WORKFLOW_ITEMS`
(steps 0-5) and `TOOLS_ITEMS` (steps 6-11). Verify every step index 0-11
appears in BOTH `STEP_COMPONENTS` and the Sidebar nav arrays with a matching
`step` field mapped to `setCurrentStep(item.step)`.

**Finding**: Any index present in one list but absent in the other is a
navigation defect → issue ID `UIFLOW-001`, `UIFLOW-002`, etc.

Also verify `App.tsx`'s `menu:goto-step` IPC channel handler calls
`setCurrentStep(args[0])` — this enables keyboard/menu navigation.

### 1B. UI State Coverage per Step

For each of the 12 step components, read its source file and check for all
three required states:

**Loading state** — must find at least one of:
- `isLoading`, `loading`, `isPending`, `isFetching` state variable rendered conditionally in JSX
- Import of `Skeleton` from `@/components/ui/skeleton`
- `<Loader2`, `<LoadingSpinner`, `<Skeleton` in JSX

**Empty state** — must find at least one of:
- JSX branch rendered when primary data array/value is empty
- String patterns: `no results`, `no data`, `no skills`, `no assessments`, `nothing here`, `get started`
- Conditional on `items.length === 0` or `!data` rendering user-facing content

**Error state** — must find at least one of:
- `error` or `errorMessage` state variable rendered in JSX
- `<ErrorDisplay`, `<Alert variant="destructive"`, `role="alert"` in JSX
- A catch block that calls `setError(...)` or `setErrorMessage(...)`

Step 4 (RunAssessment) is a thin wrapper — also read:
`src/renderer/components/proficiency/useAssessment.ts`
`src/renderer/components/proficiency/AssessmentConfig.tsx`
`src/renderer/components/proficiency/AssessmentProgress.tsx`
`src/renderer/components/proficiency/AssessmentResults.tsx`

Record which states are present and which are absent per step. Missing states
in primary workflow steps 0-5 are HIGH priority. Missing in tools 6-11 are
MEDIUM priority.

### 1C. Dead Button Detection

For each step component, search for unhandled buttons:

```bash
grep -rn "onClick={undefined}\|onClick={null}\|onClick={() => {}}" \
  src/renderer/components/ --include="*.tsx"
```

```bash
grep -rn "disabled={true}" src/renderer/components/ --include="*.tsx" \
  | grep -v "disabled={is" | grep -v "disabled={!" | grep -v "disabled={loading" \
  | grep -v "disabled={pending"
```

Hardcoded `disabled={true}` with no dynamic condition is a permanently dead
button — flag it.

Also check for `<Button>` or `<button>` with no `onClick` and no
`type="submit"`:
```bash
grep -n "<Button\b" src/renderer/components/*/**.tsx | grep -v "onClick\|type="
```
(Approximate — read suspicious matches in context to confirm.)

### 1D. Workflow Chain Continuity

Trace the primary workflow chain (steps 0-5):
- Step 0 (Welcome) → must offer a path to step 1 (button, link, or auto-advance)
- Step 1 (IntegrationPath) → must offer a path to step 2
- Step 2 (ExtractSkills) → must populate skills and offer step 3
- Step 3 (ConfigureProficiency) → must configure and offer step 4
- Step 4 (RunAssessment) → must run and offer step 5
- Step 5 (ReviewAssessment) → must export and show completion or loop

Check that `nextStep()` from `useAppStore` is called at the end of each
workflow step, OR that a "Continue" / "Next" button calls `setCurrentStep(n+1)`.

Read `src/renderer/stores/app-store.ts` — confirm `nextStep` correctly caps
at `STEP_COMPONENTS.length - 1` and `previousStep` floors at 0.

### 1E. Orphan Component Detection

```bash
find src/renderer/components -name "*.tsx" | grep -v ".test." | grep -v "/ui/"
```

For each non-UI component found, check if it is imported anywhere:
```bash
grep -rn "ComponentName" src/renderer/ --include="*.tsx" --include="*.ts" \
  | grep -v ".test."
```

A component with zero non-test imports is an orphan. Flag it as `UIFLOW-NNN`.
(Components in `src/renderer/components/ui/` are design system primitives —
skip those.)

### 1F. Score — UI Flow Analysis (weight: 8%)

| Range | Criteria |
|-------|----------|
| 90-100 | All 12 steps reachable via nav, all have loading+empty+error states, zero dead buttons, full workflow chain 0→5 connected, zero orphans |
| 75-89 | All steps reachable, 1-2 missing states in tools section (6-11), at most one dead button |
| 55-74 | Missing states in workflow steps 0-5, or one broken chain link, or multiple dead buttons |
| 30-54 | Multiple missing states in primary workflow, chain discontinuities |
| 0-29 | Steps unreachable, systematic missing states, workflow chain broken |

---

## Phase 2: Expert Sub-Agent System

**Goal**: Dispatch four focused sub-agents for domain-specialist analysis.
Each sub-agent reads specific files and answers specific diagnostic questions.
Their scores are **informational** (they surface issues feeding into the scored
dimensions — they are NOT added as separate composite weights).

If the `agent` argument is set, run only that sub-agent. Otherwise run all
four. Run each as a new Agent invocation.

---

### Sub-Agent 1: UI/UX Expert

**Launch a new Agent** with this prompt (give it read-only access):

> You are a UI/UX expert. Read these files exactly:
> - `src/renderer/App.tsx`
> - `src/renderer/components/layout/Sidebar.tsx`
> - `src/renderer/components/ui/button.tsx`
> - `src/renderer/components/ui/card.tsx`
> - `src/renderer/components/ui/alert.tsx`
> - `src/renderer/components/ui/badge.tsx`
> - `src/renderer/components/ui/toast.tsx`
> - `src/renderer/components/ui/toaster.tsx`
> - `src/renderer/styles/globals.css`
> - `src/renderer/components/common/ErrorDisplay.tsx`
> - `src/renderer/components/common/BackendStatus.tsx`
> - `src/renderer/components/common/NotificationCenter.tsx`
>
> Then run this command:
> ```bash
> grep -rn "window\.alert\|window\.confirm\|window\.prompt" \
>   src/renderer/ --include="*.tsx" --include="*.ts"
> ```
>
> Answer these questions with evidence from the files:
> 1. Is shadcn/ui used consistently, or are there custom components duplicating shadcn functionality?
> 2. Is prop drilling deeper than 3 levels in any component tree?
> 3. Does Sidebar's NavButton use proper ARIA attributes for active state (`aria-current`, `aria-pressed`, or equivalent)?
> 4. Are `window.alert/confirm/prompt` used anywhere in the renderer?
> 5. Is `AnimatePresence` from `motion/react` used only at the top level (App.tsx) or also within step components?
> 6. Are hover, focus, disabled, and active states represented visually in button/input components?
>
> Produce this exact output format:
> ```
> ## UI/UX Expert Report
> Score: XX/100
> Top Issues:
> - UIUX-001: [description] [SEVERITY: HIGH/MED/LOW]
> Positive Findings:
> - [what works well]
> ```

### Sub-Agent 2: Backend/API Expert

**Launch a new Agent** with this prompt:

> You are a backend and API integration expert. Read these files exactly:
> - `src/main/ipc-handlers.ts`
> - `src/preload/preload.ts`
> - `src/renderer/services/api.ts`
> - `src/renderer/services/electron-api.ts`
> - `src/renderer/types/api.ts`
> - `src/main/backend-manager.ts`
> - `src/main/electron-main.ts`
>
> Then run these commands:
> ```bash
> grep -n "ipcMain\.handle\|ipcMain\.on" src/main/ipc-handlers.ts | head -60
> grep -n "stream-assessment\|cancel-assessment\|cancelAssessment\|streamAssessment" \
>   src/main/ipc-handlers.ts
> grep -n "Promise<" src/renderer/services/api.ts | head -40
> ```
>
> Answer these questions with evidence:
> 1. Map every IPC channel in `ipc-handlers.ts` vs every channel exposed in `preload.ts`. Are all preload channels registered? Produce a two-column table.
> 2. Are `api:stream-assessment` and `api:cancel-assessment` registered in ipc-handlers.ts? If not, flag as IPC-GAP.
> 3. For each API method in `api.ts`, does the TypeScript return type match the corresponding interface in `types/api.ts`? Flag mismatches as CONTRACT-GAP.
> 4. Does `ipc-handlers.ts` validate user-supplied data in `fs:read-file`, `fs:write-file`, `store:set` before operating?
> 5. Does `backend-manager.ts` implement exponential backoff for auto-restart?
>
> Produce this exact output format:
> ```
> ## Backend/API Expert Report
> Score: XX/100
> IPC Channel Map: [two-column table]
> Contract Gaps: [list with IDs IPC-001, CONTRACT-001, etc. or "none"]
> Top Issues:
> - BKND-001: [description] [SEVERITY: HIGH/MED/LOW]
> Positive Findings:
> - [what works well]
> ```

### Sub-Agent 3: LLM/AI Expert

**Launch a new Agent** with this prompt:

> You are an LLM and AI integration expert. Read these files exactly:
> - `src/renderer/config/models.ts`
> - `src/renderer/config/promptTemplates.ts` (if it exists — check first)
> - `src/renderer/config/proficiency.ts`
> - `src/renderer/components/proficiency/assessment-types.ts`
> - `src/renderer/components/proficiency/useAssessment.ts`
> - `src/renderer/components/proficiency/AssessmentConfig.tsx`
> - `src/renderer/components/proficiency/AssessmentResults.tsx`
> - `src/renderer/components/keys/APIKeyManager.tsx`
>
> Then run this command:
> ```bash
> grep -rn "gemini\|kimi\|gpt\|claude\|anthropic\|openai" \
>   src/renderer/ --include="*.tsx" --include="*.ts" \
>   | grep -v "config/models.ts" | grep -v ".test."
> ```
>
> Answer these questions with evidence:
> 1. Are all model names/provider IDs imported exclusively from `src/renderer/config/models.ts`? Any hardcoded model string elsewhere violates CLAUDE.md centralization rules.
> 2. Does `promptTemplates.ts` exist and contain parameterized AI prompt templates?
> 3. Does `useAssessment.ts` forward `provider`, `model`, `temperature`, and `max_tokens` to the backend's assessment endpoint?
> 4. Is token usage (`total_tokens`, `estimated_cost`) tracked and displayed to users in `AssessmentResults.tsx`?
> 5. Is there a fallback provider/model if the primary provider fails?
> 6. Is `max_tokens` user-configurable in `AssessmentConfig.tsx`?
>
> Produce this exact output format:
> ```
> ## LLM/AI Expert Report
> Score: XX/100
> Model Centralization: PASS/FAIL (list violations if FAIL)
> Top Issues:
> - LLMAI-001: [description] [SEVERITY: HIGH/MED/LOW]
> Positive Findings:
> - [what works well]
> ```

### Sub-Agent 4: Test Quality Expert

**Launch a new Agent** with this prompt:

> You are a test quality expert. Run these commands:
> ```bash
> npx vitest run --reporter=verbose 2>&1 | tail -40
> ```
> ```bash
> grep -rn "test\.skip\|describe\.skip\|it\.skip\|xit\b\|xdescribe\b" \
>   src/ --include="*.test.ts" --include="*.test.tsx"
> ```
> ```bash
> ls src/main/*.test.ts 2>/dev/null || echo "No main process tests found at expected paths"
> ```
>
> Also read these files:
> - `src/renderer/test/setup.ts`
> - `src/renderer/test/utils/render.tsx`
> - `src/renderer/test/factories/index.ts`
> - `e2e/ui-redesign.spec.ts`
> - At least 8 component test files (pick ones covering the primary workflow steps 0-5)
>
> Answer these questions with evidence:
> 1. What is the ratio of tests with meaningful assertions (not just `toBeDefined` or `toBeInTheDocument` with no semantic check) to total tests?
> 2. Are test factories in `src/renderer/test/factories/index.ts` used consistently, or do tests define their own inline mock objects?
> 3. Map each step 0-11 from App.tsx against E2E coverage in `ui-redesign.spec.ts`. Produce a coverage table with columns: Step, Component, E2E Covered?, Test name (if yes).
> 4. Are there any skipped tests? List them.
> 5. Are `src/main/backend-manager.ts` and `src/main/ipc-handlers.ts` covered by unit tests?
>
> Produce this exact output format:
> ```
> ## Test Quality Expert Report
> Score: XX/100
> E2E Step Coverage Table: [table]
> Skipped Tests: [list or "none found"]
> Top Issues:
> - TESTQ-001: [description] [SEVERITY: HIGH/MED/LOW]
> Positive Findings:
> - [what works well]
> ```

---

## Phase 3: E2E Coverage Analysis

**Goal**: Build a definitive step × test-category coverage matrix and produce
a numbered gap list for the engineering backlog.

Read `e2e/ui-redesign.spec.ts` in full. The 12 steps from App.tsx are the rows.
Test categories are: Renders, Navigation/Click, Data Entry, Backend Call,
Success State, Error State.

Build the matrix:
```
| Step | Component | Renders | Nav | Data Entry | Backend | Success | Error |
|------|-----------|---------|-----|------------|---------|---------|-------|
| 0    | Welcome   | ?       | ?   | N/A        | ?       | ?       | ?     |
| ...  |           |         |     |            |         |         |       |
```

Mark `YES` if `ui-redesign.spec.ts` has a test exercising that step+category.
Mark `NO` if absent. Mark `N/A` if category doesn't apply to this step.

Every cell marked `NO` is an E2E gap. Assign IDs: `E2E-001`, `E2E-002`, etc.

**Expected baseline**: The current spec covers branding/CSS/sidebar (no
functional workflow tests) → expect most cells to be `NO`, score ~15-25/100.

### Score — E2E Coverage (weight: 6%)

| Range | Criteria |
|-------|----------|
| 90-100 | All 12 steps have render + nav + data flow tests; happy path and error path covered for workflow steps 0-5 |
| 70-89 | All steps render-tested; primary workflow (0-5) has flow tests; tools (6-11) partially covered |
| 50-69 | Primary workflow partially covered; tools mostly uncovered |
| 30-49 | Only smoke tests (renders without crash) for most steps |
| 0-29 | E2E tests exist but cover only UI chrome (colors, fonts, sidebar appearance); zero functional coverage |

---

## Phase 4: API Contract Validation

**Goal**: Verify TypeScript types match actual service usage.

### 4A. Request Type Coverage

Read `src/renderer/services/api.ts`. For each POST/PUT method, identify what
fields are sent as the request body. Check `src/renderer/types/api.ts` — is
there an explicit request interface for each method?

```bash
grep -n "\.post\|\.put" src/renderer/services/api.ts | head -30
```

An untyped object literal sent as body (no corresponding interface) is a gap.
Flag as `CONTRACT-001`, `CONTRACT-002`, etc.

### 4B. Response Type Coverage

For each interface in `src/renderer/types/api.ts`, find the service method
that returns it. Verify the return type annotation matches:

```bash
grep -n "Promise<" src/renderer/services/api.ts | head -40
```

Flag any service method whose return type is `Promise<unknown>` while the
caller destructures it with specific field expectations.

### 4C. Skill Type Discrepancy

The `Skill` interface in `src/renderer/stores/app-store.ts` includes
`proficiency` and `proficiency_name` fields that the `Skill` in
`src/renderer/types/api.ts` does NOT have (these are added client-side).

Read both files and verify:
- `app-store.ts` Skill type is a documented superset of `api.ts` Skill type
- Components reading `proficiency`/`proficiency_name` only access them after
  the store's enrichment logic runs, not directly from the API response

If this is not clearly documented, flag as `CONTRACT-GAP: Skill type superset
not documented`.

### 4D. IPC Type Safety in Preload

```bash
grep -n "Promise<unknown>" src/preload/preload.ts
grep -n "as Promise" src/renderer/services/electron-api.ts
```

The preload correctly uses `Promise<unknown>` for raw IPC — type safety should
be enforced via generics in `electron-api.ts`. Verify this pattern is
consistent throughout `electron-api.ts`.

### Score — API Contract (weight: 6%)

| Range | Criteria |
|-------|----------|
| 90-100 | All API methods have typed request + response, Skill superset documented, IPC type safety via generics throughout |
| 70-89 | Response types present for all methods, 1-3 request types use `unknown`, Skill mismatch acknowledged |
| 50-69 | ~50% of methods typed, some unknown returns used with destructuring in components |
| 30-49 | Types exist but mismatches between service types and store types are widespread |
| 0-29 | No API types or types never imported |

---

## Phase 5: Logging and Observability

### 5A. Main Process Logging Coverage

```bash
grep -cn "log\.info\|log\.warn\|log\.error\|log\.debug" \
  src/main/ipc-handlers.ts src/main/backend-manager.ts
```

Check whether error paths always use `log.error`:
```bash
grep -n "catch\b" src/main/ipc-handlers.ts | head -20
```

For each `catch` block, verify a `log.error(...)` call follows.

Check if file transport is configured (persistent logs for crash diagnosis):
```bash
grep -rn "transports\|log\.transports" src/main/ --include="*.ts"
```

No file transport = no crash logs in production. Flag as `LOG-001` (HIGH).

### 5B. Renderer Logging Gap

```bash
grep -rn "console\.log\|console\.warn\|console\.error\|console\.info" \
  src/renderer/ --include="*.tsx" --include="*.ts" \
  | grep -v ".test." | wc -l
```

Check for a renderer → main log bridge in preload:
```bash
grep -n "log\|logger" src/preload/preload.ts
```

`console.*` in the renderer is NOT captured by `electron-log`. A log bridge
is required for production diagnostics. If absent, flag as `LOG-002` (MEDIUM).

### 5C. Assessment Flow Instrumentation

The assessment workflow is the most critical business flow. Check:
```bash
grep -n "log\.\|console\." \
  src/renderer/components/proficiency/useAssessment.ts
```

At minimum, assessment start, completion, and errors must be logged.
Token counts (`total_tokens`) and `estimated_cost` should be logged at
completion. Missing → flag as `LOG-003` (MEDIUM).

### 5D. Error Tracking Integration

```bash
grep -rn "sentry\|bugsnag\|rollbar\|@sentry\|trackError" \
  src/ --include="*.ts" --include="*.tsx" -i
```

No error tracking service = zero production crash reports. Flag as
`LOG-004` (LOW for now, but HIGH after first production release).

### Score — Logging and Observability (weight: 5%)

| Range | Criteria |
|-------|----------|
| 90-100 | `electron-log` with file transport, all error paths logged with context, renderer log bridge in preload, assessment flow fully instrumented, error tracking service integrated |
| 70-89 | `electron-log` in main process with file transport, most errors logged, renderer uses `console.*` (not bridged) |
| 50-69 | `electron-log` used but no file transport, assessment partially logged |
| 30-49 | Logging in some files only, no file transport, renderer unlogged |
| 0-29 | No structured logging, bare console.* only |

---

## Phase 6: Score Aggregation

Compute the master-qa composite using a 75/25 split between the deep-audit
foundation and the 5 new dimensions:

```
master_qa_composite =
  (deep_audit_composite × 0.75)
  + (ui_flow_score × 0.08)
  + (api_contract_score × 0.06)
  + (e2e_coverage_score × 0.06)
  + (logging_score × 0.05)
```

The sub-agent scores (UI/UX, Backend/API, LLM/AI, Test Quality) are
**informational** — they surface issues captured in the 5 scored dimensions
above. Do NOT add them as additional weights (that would double-count).

Display the full 20-dimension table:

| Dimension | Source | Score | Weight | Weighted |
|-----------|--------|-------|--------|----------|
| Tests | deep-audit | XX | 9.0% | X.X |
| Build Health | deep-audit | XX | 7.5% | X.X |
| Security | deep-audit | XX | 7.5% | X.X |
| TypeScript | deep-audit | XX | 6.0% | X.X |
| Architecture | deep-audit | XX | 6.0% | X.X |
| Error Handling | deep-audit | XX | 6.0% | X.X |
| Dependencies | deep-audit | XX | 5.25% | X.X |
| Performance | deep-audit | XX | 5.25% | X.X |
| Backend Integration | deep-audit | XX | 5.25% | X.X |
| Code Quality | deep-audit | XX | 5.25% | X.X |
| CI/CD | deep-audit | XX | 3.75% | X.X |
| Build & Packaging | deep-audit | XX | 3.75% | X.X |
| Accessibility | deep-audit | XX | 3.75% | X.X |
| Documentation | deep-audit | XX | 2.25% | X.X |
| i18n | deep-audit | XX | 2.25% | X.X |
| **UI Flow Analysis** | master-qa | XX | **8.0%** | X.X |
| **API Contract** | master-qa | XX | **6.0%** | X.X |
| **E2E Coverage** | master-qa | XX | **6.0%** | X.X |
| **Logging/Observability** | master-qa | XX | **5.0%** | X.X |
| **MASTER-QA COMPOSITE** | | | **100%** | **XX.X** |

Letter grades: A: 90+, B: 80+, C: 70+, D: 60+, F: <60

---

## Phase 7: Compare Against Previous Master-QA Run

Read `docs/AUDIT_HISTORY.md`. Look for the most recent `## Master-QA:` entry
(distinct from `## Audit:` entries which are deep-audit only).

**If a previous master-qa entry exists**:
- For each of the 20 dimensions, compute `delta = current - previous`
- Show trend: Improving (delta > +3), Stable (-3 to +3), Degrading (delta < -3)
- Build Known Issues Registry:
  - Issues in previous entry still found now = PERSISTING (escalate severity)
  - Issues from previous entry no longer found = RESOLVED
  - Issues found for first time = NEW

**Severity escalation rules**:
- Issue appearing in 2 consecutive runs: upgrade to HIGH (regardless of original)
- Issue appearing in 3+ consecutive runs: upgrade to CRITICAL

**Sub-agent effectiveness tracking** (after 2+ runs):
- Record how many issues each sub-agent found per run
- After 3+ runs, report: "Most historically productive agent: [name] (avg X issues/run)"

**If no previous master-qa entry exists**: Note "First master-qa run — 20-dimension baseline established."

---

## Phase 8: Generate Report

### Executive Summary
- Master-QA composite score with letter grade
- Deep-audit sub-score (foundation 15 dimensions × 0.75)
- New dimensions sub-score (5 new dimensions)
- Trend (or "First run — baseline")
- Top 3 critical issues across all 20 dimensions
- Top 3 quick wins (S-effort, highest score impact)
- Which sub-agent found the most issues this run

### Full 20-Dimension Table
From Phase 6 — all dimensions, scores, weights, weighted contributions.

### Sub-Agent Reports
Include each expert sub-agent's full report verbatim as subsections.

### Known Issues Registry
All issues with IDs, severity (with escalation applied), first-seen date,
consecutive-run count, and PERSISTING/ESCALATED labels.

### E2E Gap Table
The full step × category matrix from Phase 3. Ready to copy into a GitHub
issue or sprint backlog.

### Action Plan to 100

For every open issue across all 20 dimensions and all 4 sub-agents:
- **Issue ID** (e.g. `UIUX-001`, `E2E-003`, `LOG-002`)
- **Description**
- **Dimension affected**
- **Score impact estimate** (points this costs the composite)
- **Effort**: S (< 1hr), M (1-4hr), L (4+ hr)
- **Suggested skill**: `/harden`, `/optimize`, `/normalize`, `/animate`,
  `/delight`, `/audit`, `/critique`, `/onboard`, `/polish`, `/extract`,
  `/arrange`, `/typeset`, `/colorize`, `/bolder`, `/quieter`, `/adapt`,
  `/clarify`, `/distill`, or "manual fix"

Grouped into:
- **Sprint A (Quick Wins)**: All S-effort items — maximum score per hour
- **Sprint B (High Impact)**: M-effort by score impact descending
- **Sprint C (Foundation)**: L-effort structural work
- **Sprint D (Polish)**: Remaining items for perfection

Estimated composite after each sprint:
```
Current:        XX/100
After Sprint A: ~XX/100 (+X)
After Sprint B: ~XX/100 (+X)
After Sprint C: ~XX/100 (+X)
After Sprint D: ~100/100 (+X)
```

---

## Phase 9: Persist Results

**CRITICAL**: After showing the full report to the user, update
`docs/AUDIT_HISTORY.md`. If the file does not exist, create it first.

**NEVER delete previous entries.** Prepend the new entry (newest first):

```markdown
## Master-QA: YYYY-MM-DD

**Master-QA Composite Score: XX/100 (Letter Grade)**
**Trend: Improving/Stable/Degrading/First run**
**Foundation (deep-audit × 0.75): XX pts | New Dimensions: XX pts**

### Dimension Scores (All 20)
| Dimension | Score | Weight | Weighted | Source | Notes |
|-----------|-------|--------|----------|--------|-------|
| Tests | XX | 9.0% | X.X | deep-audit | ... |
| Build Health | XX | 7.5% | X.X | deep-audit | ... |
| Security | XX | 7.5% | X.X | deep-audit | ... |
| TypeScript | XX | 6.0% | X.X | deep-audit | ... |
| Architecture | XX | 6.0% | X.X | deep-audit | ... |
| Error Handling | XX | 6.0% | X.X | deep-audit | ... |
| Dependencies | XX | 5.25% | X.X | deep-audit | ... |
| Performance | XX | 5.25% | X.X | deep-audit | ... |
| Backend Integration | XX | 5.25% | X.X | deep-audit | ... |
| Code Quality | XX | 5.25% | X.X | deep-audit | ... |
| CI/CD | XX | 3.75% | X.X | deep-audit | ... |
| Build & Packaging | XX | 3.75% | X.X | deep-audit | ... |
| Accessibility | XX | 3.75% | X.X | deep-audit | ... |
| Documentation | XX | 2.25% | X.X | deep-audit | ... |
| i18n | XX | 2.25% | X.X | deep-audit | ... |
| UI Flow Analysis | XX | 8.0% | X.X | master-qa | ... |
| API Contract | XX | 6.0% | X.X | master-qa | ... |
| E2E Coverage | XX | 6.0% | X.X | master-qa | ... |
| Logging/Observability | XX | 5.0% | X.X | master-qa | ... |
| **MASTER-QA COMPOSITE** | | | **XX.X** | | |

### Sub-Agent Scores (Informational)
| Agent | Score | Issues Found |
|-------|-------|-------------|
| UI/UX Expert | XX | N |
| Backend/API Expert | XX | N |
| LLM/AI Expert | XX | N |
| Test Quality Expert | XX | N |
| **Most productive this run** | [agent name] | N |

### Known Issues Registry
| ID | Description | Severity | First Seen | Consecutive Runs | Status |
|----|-------------|----------|------------|-----------------|--------|
| UIUX-001 | ... | HIGH | YYYY-MM-DD | 1 | OPEN |

### Open Issues (New This Run)
- ID: Description [SEVERITY]

### Resolved Issues (Since Last Master-QA)
- ID: Description — RESOLVED

### Action Plan Summary
- Sprint A (Quick Wins): +X pts → XX/100
- Sprint B (High Impact): +X pts → XX/100
- Sprint C (Foundation): +X pts → XX/100
- Sprint D (Polish): +X pts → 100/100

### Agent Effectiveness History (updated each run)
| Agent | Run 1 | Run 2 | Run 3 | Avg |
|-------|-------|-------|-------|-----|
| UI/UX Expert | N | - | - | N |
| Backend/API Expert | N | - | - | N |
| LLM/AI Expert | N | - | - | N |
| Test Quality Expert | N | - | - | N |
```

If `fix=true`, after persisting results:
1. Fix all S-effort Sprint A items
2. Re-run affected diagnostic commands to verify
3. Append a "Post-fix re-audit note" to the entry just written with updated scores
4. Follow all CLAUDE.md verification requirements (build, type-check, tests)

---

## Rules

**NEVER**:
- Skip Phase 0 (deep-audit) — the 15 foundation dimensions are required
- Give sub-agent scores vague prompts — provide exact file lists and exact questions
- Add sub-agent scores to the composite (they are informational only)
- Invent issue IDs — always use the next available number in the prefix
- Mix deep-audit issue namespaces (`SEC-`, `TEST-`, etc.) with master-qa namespaces (`UIUX-`, `BKND-`, `LLMAI-`, `TESTQ-`, `E2E-`, `IPC-`, `CONTRACT-`, `LOG-`, `UIFLOW-`)
- Delete or overwrite previous AUDIT_HISTORY.md entries
- Grade new dimensions without reading actual source files

**ALWAYS**:
- Run deep-audit first and use its real output
- Give sub-agents exact file lists — not directory names
- Track the Known Issues Registry across runs — this IS the enhanced learning loop
- Show the full E2E gap table — it is the primary backlog deliverable
- Escalate severity of persisting issues (2 runs = HIGH, 3+ = CRITICAL)
- Persist results AFTER showing the full report (never before)
- Follow CLAUDE.md verification requirements for any fixes
