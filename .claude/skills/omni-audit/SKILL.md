---
name: omni-audit
description: >
  Ultimate 25-dimension project audit that supersedes both deep-audit and
  master-qa. Covers all 15 deep-audit foundations, all 5 master-qa extended
  phases, plus 5 new expert dimensions: Modern Design & Visual Excellence
  (glassmorphism, glass buttons, micro-interactions), SFDLC Compliance (OWASP
  Electron Top 10, CSP, SBOM, branch protection), Per-Page Deep Scan (all 12
  pages individually scored), API Surface Audit (every endpoint reviewed), and
  Developer Experience (VS Code config, git hooks, onboarding). Self-learning
  with persistent Known Issues Registry (severity escalation: 2 runs→HIGH,
  3+→CRITICAL), score velocity tracking, and sub-agent effectiveness history.
  All results persisted to docs/OMNI_AUDIT_HISTORY.md.
user-invocable: true
args:
  - name: focus
    description: >
      Optional: comma-separated phases to run. Options: deep-audit, ui-flow,
      sub-agents, e2e-coverage, api-contract, logging, modern-design, sfdlc,
      per-page, api-surface, dx. Omit to run everything.
    required: false
  - name: fix
    description: "Optional: if 'true', fix all S-effort Sprint A items after auditing."
    required: false
---

# omni-audit

The most comprehensive project audit available for ProfStudio Desktop.
Combines **15 deep-audit dimensions** + **5 master-qa dimensions** + **5 new
expert dimensions** = **25 total dimensions**, all scored 0–100 and weighted
into a single composite.

**Supersedes**: `/deep-audit` and `/master-qa`. You only need to run this one.

**Self-learning**: Tracks a Known Issues Registry across every run. Issues
that persist escalate in severity automatically. Sub-agent effectiveness is
measured and reported. Score velocity tracks whether improvement is
accelerating or plateauing.

---

## Phase 0: Load History

Before doing anything, read `docs/OMNI_AUDIT_HISTORY.md` from the project root.

If the file exists, parse the most recent `## Omni-Audit: YYYY-MM-DD` entry
and extract:
- All 25 dimension scores
- Full Known Issues Registry (all open issue IDs, severities, first-seen dates,
  consecutive-run counts)
- Sub-agent effectiveness table (issues-found per agent per run)
- Composite score

Store as "previous data" for use in Phase 9 (comparison & learning).

If the file does not exist, this is the first omni-audit run. Note that and
proceed — Phase 9 will create the baseline entry.

---

## Phase 1: Foundation — Run deep-audit

Run the `/deep-audit` skill. Do NOT skip this phase even if `focus` is set.

After deep-audit completes, read `docs/AUDIT_HISTORY.md` and extract from the
newest `## Audit: YYYY-MM-DD` entry ALL 15 dimension scores. These are the
Group A foundation scores used in Phase 8's composite formula.

Store the 15 scores:
- `da_tests`, `da_build`, `da_security`, `da_typescript`, `da_architecture`
- `da_error_handling`, `da_deps`, `da_performance`, `da_backend`, `da_code_quality`
- `da_cicd`, `da_build_pkg`, `da_a11y`, `da_docs`, `da_i18n`

If `focus` is specified and does not include `deep-audit`, skip running it
and load the most recent scores from `docs/AUDIT_HISTORY.md` directly.

---

## Phase 2A: UI Flow Analysis

**Goal**: Verify the full step-navigation graph is intact and every view has
the minimum required UI states.

### Build the Canonical Step Map

Read `src/renderer/App.tsx`. Extract the `STEP_COMPONENTS` array. The
expected map is:

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

Read `src/renderer/components/layout/Sidebar.tsx`. Verify every step 0–11
appears in BOTH `STEP_COMPONENTS` and Sidebar nav arrays.

Any index present in one list but absent in the other → flag `UIFLOW-NNN`.

Verify `App.tsx`'s `menu:goto-step` IPC handler calls `setCurrentStep(args[0])`.

### UI State Coverage

For each of the 12 step components, read its source and check for:

**Loading state** — at least one of: `isLoading`/`loading`/`isPending`
rendered in JSX, `<Skeleton`, `<Loader2`, `<LoadingSpinner`

**Empty state** — JSX branch when primary data array/value is empty, patterns
`no results`, `no data`, `no skills`, `no assessments`, `get started`, or
conditional on `items.length === 0` rendering user-facing content

**Error state** — `error`/`errorMessage` rendered in JSX, `<ErrorDisplay`,
`<Alert variant="destructive"`, `role="alert"`, or catch block calling
`setError()`

Step 4 (RunAssessment) is a thin wrapper — also read:
`src/renderer/components/proficiency/useAssessment.ts`
`src/renderer/components/proficiency/AssessmentConfig.tsx`
`src/renderer/components/proficiency/AssessmentProgress.tsx`
`src/renderer/components/proficiency/AssessmentResults.tsx`

Missing states in primary workflow steps 0–5 are HIGH priority.
Missing in tools 6–11 are MEDIUM priority.

### Dead Button Detection

```bash
grep -rn "onClick={undefined}\|onClick={null}\|onClick={() => {}}" \
  src/renderer/components/ --include="*.tsx"
grep -rn "disabled={true}" src/renderer/components/ --include="*.tsx" \
  | grep -v "disabled={is" | grep -v "disabled={!" | grep -v "disabled={loading" \
  | grep -v "disabled={pending"
```

Hardcoded `disabled={true}` with no dynamic condition = permanently dead button.

### Workflow Chain Continuity

Trace primary workflow (steps 0–5): each step must offer a path to the next via
`nextStep()` from `useAppStore` or a "Continue"/"Next" button.

Read `src/renderer/stores/app-store.ts` — confirm `nextStep` caps at
`STEP_COMPONENTS.length - 1` and `previousStep` floors at 0.

### Orphan Component Detection

```bash
find src/renderer/components -name "*.tsx" | grep -v ".test." | grep -v "/ui/"
```

For each non-UI component, check if imported anywhere outside test files.
Zero imports = orphan. Flag as `UIFLOW-NNN`.

### Score — UI Flow Analysis (weight: 5%)

| Range | Criteria |
|-------|----------|
| 90–100 | All 12 steps reachable, all have loading+empty+error states, zero dead buttons, full workflow chain 0→5 connected, zero orphans |
| 75–89 | All steps reachable, 1–2 missing states in tools (6–11), at most one dead button |
| 55–74 | Missing states in workflow steps 0–5, or one broken chain link |
| 30–54 | Multiple missing states in primary workflow, chain discontinuities |
| 0–29 | Steps unreachable, systematic missing states, workflow broken |

Store as `mq_ui_flow`.

---

## Phase 2B: Expert Sub-Agents × 4 (Informational)

Run all four as parallel Agent invocations. Their scores are informational —
they surface issues but are NOT added to the composite formula.

### Sub-Agent 1: UI/UX Expert

Launch a new Agent with this prompt:

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
> Then run:
> ```bash
> grep -rn "window\.alert\|window\.confirm\|window\.prompt" \
>   src/renderer/ --include="*.tsx" --include="*.ts"
> ```
>
> Answer with evidence from files:
> 1. Is shadcn/ui used consistently, or are custom components duplicating shadcn?
> 2. Is prop drilling deeper than 3 levels anywhere?
> 3. Does Sidebar's NavButton use proper ARIA attributes for active state?
> 4. Are `window.alert/confirm/prompt` used anywhere in the renderer?
> 5. Is `AnimatePresence` from `motion/react` used at the right scope?
> 6. Are hover, focus, disabled, active states represented in button/input components?
>
> Output exactly:
> ```
> ## UI/UX Expert Report
> Score: XX/100
> Top Issues:
> - UIUX-001: [description] [SEVERITY: HIGH/MED/LOW]
> Positive Findings:
> - [what works well]
> ```

### Sub-Agent 2: Backend/API Expert

Launch a new Agent with this prompt:

> You are a backend and API integration expert. Read these files exactly:
> - `src/main/ipc-handlers.ts`
> - `src/preload/preload.ts`
> - `src/renderer/services/api.ts`
> - `src/renderer/services/electron-api.ts`
> - `src/renderer/types/api.ts`
> - `src/main/backend-manager.ts`
> - `src/main/electron-main.ts`
>
> Run:
> ```bash
> grep -n "ipcMain\.handle\|ipcMain\.on" src/main/ipc-handlers.ts | head -60
> grep -n "stream-assessment\|cancel-assessment" src/main/ipc-handlers.ts
> grep -n "Promise<" src/renderer/services/api.ts | head -40
> ```
>
> Answer:
> 1. Map every IPC channel in ipc-handlers.ts vs every channel in preload.ts — two-column table.
> 2. Are `api:stream-assessment` and `api:cancel-assessment` registered? Flag absent ones as IPC-GAP.
> 3. For each API method in api.ts, does the TypeScript return type match types/api.ts? Flag mismatches as CONTRACT-GAP.
> 4. Does ipc-handlers.ts validate user-supplied data on `fs:read-file`, `fs:write-file`, `store:set`?
> 5. Does backend-manager.ts implement exponential backoff for auto-restart?
>
> Output exactly:
> ```
> ## Backend/API Expert Report
> Score: XX/100
> IPC Channel Map: [two-column table]
> Contract Gaps: [list with IDs or "none"]
> Top Issues:
> - BKND-001: [description] [SEVERITY: HIGH/MED/LOW]
> Positive Findings:
> - [what works well]
> ```

### Sub-Agent 3: LLM/AI Expert

Launch a new Agent with this prompt:

> You are an LLM and AI integration expert. Read these files exactly:
> - `src/renderer/config/models.ts`
> - `src/renderer/config/proficiency.ts`
> - `src/renderer/components/proficiency/assessment-types.ts`
> - `src/renderer/components/proficiency/useAssessment.ts`
> - `src/renderer/components/proficiency/AssessmentConfig.tsx`
> - `src/renderer/components/proficiency/AssessmentResults.tsx`
> - `src/renderer/components/keys/APIKeyManager.tsx`
>
> Run:
> ```bash
> grep -rn "gemini\|kimi\|gpt\|claude\|anthropic\|openai" \
>   src/renderer/ --include="*.tsx" --include="*.ts" \
>   | grep -v "config/models.ts" | grep -v ".test."
> find src/renderer/config -name "promptTemplates*" 2>/dev/null
> ```
>
> Answer:
> 1. Are all model names imported exclusively from config/models.ts? Any hardcoded model string = CLAUDE.md violation.
> 2. Does promptTemplates.ts exist with parameterized templates?
> 3. Does useAssessment.ts forward provider, model, temperature, max_tokens to the backend?
> 4. Is token usage / estimated_cost tracked and displayed in AssessmentResults.tsx?
> 5. Is there a fallback provider if the primary fails?
> 6. Is max_tokens user-configurable in AssessmentConfig.tsx?
>
> Output exactly:
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

Launch a new Agent with this prompt:

> You are a test quality expert. Run:
> ```bash
> npx vitest run --reporter=verbose 2>&1 | tail -40
> grep -rn "test\.skip\|describe\.skip\|it\.skip\|xit\b\|xdescribe\b" \
>   src/ --include="*.test.ts" --include="*.test.tsx"
> ls src/main/*.test.ts 2>/dev/null || echo "No main tests"
> ```
>
> Also read:
> - `src/renderer/test/setup.ts`
> - `src/renderer/test/utils/render.tsx`
> - `src/renderer/test/factories/index.ts`
> - `e2e/ui-redesign.spec.ts`
> - At least 8 component test files (choose primary workflow steps 0–5)
>
> Answer:
> 1. What ratio of tests have meaningful assertions vs just `toBeDefined`/`toBeInTheDocument`?
> 2. Are test factories used consistently, or do tests define inline mock objects?
> 3. Map each step 0–11 against E2E coverage in ui-redesign.spec.ts. Produce a coverage table.
> 4. Are there any skipped tests?
> 5. Are backend-manager.ts and ipc-handlers.ts covered by unit tests?
>
> Output exactly:
> ```
> ## Test Quality Expert Report
> Score: XX/100
> E2E Step Coverage Table: [table]
> Skipped Tests: [list or "none"]
> Top Issues:
> - TESTQ-001: [description] [SEVERITY: HIGH/MED/LOW]
> Positive Findings:
> - [what works well]
> ```

---

## Phase 2C: E2E Coverage Matrix

Read `e2e/ui-redesign.spec.ts` in full. Build the coverage matrix:

```
| Step | Component           | Renders | Nav | Data Entry | Backend | Success | Error |
|------|---------------------|---------|-----|------------|---------|---------|-------|
| 0    | Welcome             | ?       | ?   | N/A        | ?       | ?       | ?     |
| 1    | IntegrationPath     | ?       | ?   | ?          | ?       | ?       | ?     |
| 2    | ExtractSkills       | ?       | ?   | ?          | ?       | ?       | ?     |
| 3    | ConfigureProficiency| ?       | ?   | ?          | N/A     | ?       | ?     |
| 4    | RunAssessment       | ?       | ?   | ?          | ?       | ?       | ?     |
| 5    | ReviewAssessment    | ?       | ?   | ?          | ?       | ?       | ?     |
| 6    | AssessmentHistory   | ?       | ?   | N/A        | ?       | ?       | ?     |
| 7    | AnalyticsDashboard  | ?       | ?   | N/A        | ?       | ?       | ?     |
| 8    | PromptEditor        | ?       | ?   | ?          | N/A     | ?       | ?     |
| 9    | EnvironmentManager  | ?       | ?   | ?          | ?       | ?       | ?     |
| 10   | Settings            | ?       | ?   | ?          | N/A     | ?       | ?     |
| 11   | Documentation       | ?       | ?   | N/A        | N/A     | N/A     | N/A   |
```

Mark YES/NO/N/A. Every NO = a gap. Assign IDs `E2E-001`, `E2E-002`, etc.

### Score — E2E Coverage (weight: 4%)

| Range | Criteria |
|-------|----------|
| 90–100 | All 12 steps: render + nav + data flow; happy + error path for steps 0–5 |
| 70–89 | All steps render-tested; primary workflow 0–5 has flow tests |
| 50–69 | Primary workflow partially covered; tools mostly uncovered |
| 30–49 | Only smoke tests (renders without crash) |
| 0–29 | E2E tests cover only UI chrome (colors, fonts, sidebar); zero functional coverage |

Store as `mq_e2e`.

---

## Phase 2D: API Contract Validation

### Request Type Coverage

Read `src/renderer/services/api.ts`. For each POST/PUT method, identify what
fields are sent as the request body. Check `src/renderer/types/api.ts` for
explicit request interfaces.

```bash
grep -n "\.post\|\.put" src/renderer/services/api.ts | head -30
```

Untyped object literal body = CONTRACT-NNN gap.

### Response Type Coverage

```bash
grep -n "Promise<" src/renderer/services/api.ts | head -40
```

`Promise<unknown>` with caller destructuring specific fields = gap.

### Skill Type Discrepancy

Read both `src/renderer/stores/app-store.ts` (Skill type) and
`src/renderer/types/api.ts` (Skill type). Verify the store's Skill type is
a documented superset. If not, flag `CONTRACT-GAP: Skill type superset not
documented`.

### IPC Type Safety

```bash
grep -n "Promise<unknown>" src/preload/preload.ts
grep -n "as Promise" src/renderer/services/electron-api.ts
```

Verify generics in electron-api.ts enforce type safety via generics throughout.

### Score — API Contract (weight: 3%)

| Range | Criteria |
|-------|----------|
| 90–100 | All methods have typed request + response; Skill superset documented; IPC generics consistent |
| 70–89 | Response types on all methods; 1–3 request types use unknown; Skill mismatch acknowledged |
| 50–69 | ~50% of methods typed |
| 0–49 | Types largely absent or mismatched |

Store as `mq_api_contract`.

---

## Phase 2E: Logging & Observability

### Main Process Coverage

```bash
grep -cn "log\.info\|log\.warn\|log\.error\|log\.debug" \
  src/main/ipc-handlers.ts src/main/backend-manager.ts
grep -n "catch\b" src/main/ipc-handlers.ts | head -20
grep -rn "transports\|log\.transports" src/main/ --include="*.ts"
```

No file transport = no crash logs in production → flag `LOG-001` (HIGH).

### Renderer Logging Gap

```bash
grep -rn "console\.log\|console\.warn\|console\.error\|console\.info" \
  src/renderer/ --include="*.tsx" --include="*.ts" | grep -v ".test." | wc -l
grep -n "log\|logger" src/preload/preload.ts
```

`console.*` in renderer not captured by electron-log. Missing log bridge →
flag `LOG-002` (MEDIUM).

### Assessment Flow Instrumentation

```bash
grep -n "log\.\|console\." src/renderer/components/proficiency/useAssessment.ts
```

Assessment start, completion, errors, token counts must be logged.
Missing → flag `LOG-003` (MEDIUM).

### Error Tracking Integration

```bash
grep -rn "sentry\|bugsnag\|rollbar\|@sentry\|trackError" \
  src/ --include="*.ts" --include="*.tsx" -i
```

No error tracking → flag `LOG-004` (LOW pre-production, HIGH post-launch).

### Score — Logging & Observability (weight: 3%)

| Range | Criteria |
|-------|----------|
| 90–100 | electron-log with file transport; all catch blocks log error; renderer log bridge; assessment fully instrumented; error tracking service |
| 70–89 | electron-log in main with file transport; most errors logged; renderer uses console.* (not bridged) |
| 50–69 | electron-log used but no file transport; assessment partially logged |
| 30–49 | Some logging only; no file transport; renderer unlogged |
| 0–29 | No structured logging; bare console.* only |

Store as `mq_logging`.

---

## Phase 3: Modern Design & Visual Excellence (NEW — 9%)

**Expert sub-agent** — launch a new Agent with this exact prompt:

> You are a world-class frontend design expert specializing in modern UI/UX,
> glassmorphism, and design systems. Read these files exactly:
> - `src/renderer/styles/globals.css`
> - `src/renderer/components/ui/button.tsx`
> - `src/renderer/components/ui/card.tsx`
> - `src/renderer/components/ui/badge.tsx`
> - `src/renderer/components/ui/dialog.tsx`
> - `src/renderer/components/layout/Sidebar.tsx`
> - `tailwind.config.ts` (if present)
> - `src/renderer/App.tsx`
>
> Also run these commands:
> ```bash
> grep -rn "backdrop-blur\|bg-white/\|bg-black/\|bg-opacity\|bg-slate-\|bg-zinc-" \
>   src/renderer/components/ --include="*.tsx" | grep -v ".test." | wc -l
> grep -rn "backdrop-filter\|glass\|frosted" src/renderer/styles/ --include="*.css"
> grep -n "transition\|animation\|duration-\|ease-\|animate-" src/renderer/styles/globals.css
> grep -rn "motion\|AnimatePresence\|useSpring\|useReducedMotion\|animate=" \
>   src/renderer/ --include="*.tsx" --include="*.ts" | grep -v ".test." | wc -l
> grep -n "^--" src/renderer/styles/globals.css | wc -l
> grep -rn "dark:" src/renderer/components/ --include="*.tsx" | grep -v ".test." | wc -l
> grep -rn "hover:scale\|hover:shadow\|hover:bg\|hover:border\|hover:ring\|hover:opacity\|group-hover:" \
>   src/renderer/components/ --include="*.tsx" | grep -v ".test." | wc -l
> grep -rn "transition-\|duration-\|ease-" src/renderer/components/ --include="*.tsx" | grep -v ".test." | wc -l
> grep -rn "prefers-reduced-motion" src/renderer/ --include="*.tsx" --include="*.css" --include="*.ts"
> grep -rn "bento\|grid-cols\|col-span" src/renderer/components/ --include="*.tsx" | grep -v ".test." | head -20
> ```
>
> Score 0–100 using this rubric:
>
> | Range | Criteria |
> |-------|----------|
> | 90–100 | Glassmorphism with backdrop-blur + semi-transparent bg throughout; prefers-reduced-motion respected; 20+ CSS design tokens (--variables); dark: variants on all interactive elements; micro-interactions (hover scale, shadow, border transitions) on all buttons/cards; AnimatePresence for transitions; bento grid on dashboards; glass buttons with blur+border+opacity |
> | 70–89 | Partial glass effects (some components), transitions on key interactions, 10+ CSS tokens, dark mode mostly complete, hover states on buttons |
> | 50–69 | Some transitions, minimal glass, design tokens partially implemented, dark mode incomplete, basic hover states |
> | 30–49 | Mostly flat design, few transitions, minimal dark mode, shadcn defaults unchanged |
> | 0–29 | No glass effects, no transitions, no custom design tokens, dated/flat UI with zero modern polish |
>
> List top 5 design improvement opportunities with IDs DESIGN-001..DESIGN-005.
> For each, include: what's missing, what it should look like, which file(s) to change.
>
> Output exactly:
> ```
> ## Modern Design Expert Report
> Score: XX/100
> Glass Effects: present/absent (count of backdrop-blur usages: N)
> Design Tokens: N CSS variables defined
> Dark Mode Coverage: N dark: variants
> Micro-interactions: N hover/transition classes
> Motion Library: used/unused (N animated components)
> prefers-reduced-motion: respected/not respected
> Top Issues:
> - DESIGN-001: [description] [FILE: path] [SEVERITY: HIGH/MED/LOW]
> - DESIGN-002: [description] [FILE: path] [SEVERITY: HIGH/MED/LOW]
> - DESIGN-003: [description] [FILE: path] [SEVERITY: HIGH/MED/LOW]
> - DESIGN-004: [description] [FILE: path] [SEVERITY: HIGH/MED/LOW]
> - DESIGN-005: [description] [FILE: path] [SEVERITY: HIGH/MED/LOW]
> Positive Findings:
> - [what works well]
> ```

After the sub-agent returns, record its score as `new_modern_design`.

---

## Phase 4: SFDLC Compliance (NEW — 6%)

**Expert sub-agent** — launch a new Agent with this exact prompt:

> You are a security expert specializing in Electron application security and
> Secure Software Development Lifecycle (SSDLC/SFDLC).
>
> Read these files exactly:
> - `src/main/electron-main.ts`
> - `src/main/ipc-handlers.ts`
> - `src/preload/preload.ts`
> - `src/main/backend-manager.ts`
> - `.github/workflows/test.yml` (and any other workflow files)
> - `package.json`
>
> Run:
> ```bash
> # OWASP Electron Top 10 checks
> grep -n "nodeIntegration\|contextIsolation\|webSecurity\|sandbox\|enableBlinkFeatures\|allowRunningInsecureContent\|experimentalFeatures\|nativeWindowOpen" src/main/electron-main.ts
>
> # CSP configuration
> grep -rn "Content-Security-Policy\|contentSecurityPolicy\|defaultSrc\|scriptSrc\|meta.*csp\|helmet" src/ --include="*.ts" --include="*.tsx" --include="*.html"
>
> # Hardcoded secrets scan
> grep -rn "sk-[a-zA-Z0-9]\|AIza[a-zA-Z0-9]\|api_key\s*[:=]\s*['\"][^'\"]\|secret\s*[:=]\s*['\"][^'\"]\|password\s*[:=]\s*['\"][^'\"]" src/ --include="*.ts" --include="*.tsx" | grep -v ".test." | grep -v "placeholder\|label\|comment\|\/\/"
>
> # License file
> ls LICENSE* COPYING* 2>/dev/null || echo "NO LICENSE FILE"
>
> # Git hooks / pre-commit security
> ls .husky/ 2>/dev/null && cat .husky/pre-commit 2>/dev/null || echo "No husky hooks"
> ls .pre-commit-config.yaml 2>/dev/null && cat .pre-commit-config.yaml || echo "No pre-commit config"
>
> # Branch protection evidence in CI
> grep -rn "pull_request\|branches:\|push:" .github/workflows/ --include="*.yml"
>
> # Dependency version pinning
> node -e "try{const p=require('./package.json');const d={...p.dependencies,...p.devDependencies};const t=Object.keys(d).length;const c=Object.values(d).filter(v=>v.startsWith('^')||v.startsWith('~')).length;console.log('Total deps:',t,'Pinned:',t-c,'With range (^/~):',c)}catch(e){console.log(e.message)}"
>
> # SBOM check
> ls sbom.json bom.xml cyclonedx* .sbom* 2>/dev/null || echo "No SBOM artifact"
>
> # .gitignore protects secrets
> grep -n "\.env\|secrets\|\.pem\|private_key" .gitignore 2>/dev/null || echo "No .gitignore or missing env patterns"
>
> # IPC input validation
> grep -n "validate\|sanitize\|schema\|zod\|joi\|yup\|typeof\|instanceof" src/main/ipc-handlers.ts | head -20
> ```
>
> Grade against the OWASP Electron Security Checklist:
> 1. contextIsolation: true ✓/✗
> 2. nodeIntegration: false ✓/✗ (or absent, which defaults to false in modern Electron)
> 3. webSecurity: not disabled ✓/✗
> 4. sandbox: true ✓/✗ (optional but ideal)
> 5. No allowRunningInsecureContent: true ✓/✗
> 6. No enableBlinkFeatures ✓/✗
> 7. CSP configured in main process ✓/✗
>
> Also grade:
> 8. No hardcoded secrets found ✓/✗
> 9. LICENSE file exists ✓/✗
> 10. .env in .gitignore ✓/✗
> 11. Pre-commit security hooks (secret scanning) ✓/✗
> 12. CI requires PR (branch protection evidence) ✓/✗
> 13. Dependencies mostly pinned (< 10% with ^ or ~) ✓/✗
> 14. SBOM artifact exists ✓/✗
> 15. IPC handlers validate input ✓/✗
>
> Score 0–100:
> - Items 1–2 failing = score capped at 29 (critical Electron vulnerability)
> - Items 1–6 all passing = minimum 50
> - Items 1–9 passing = 70+
> - All 15 passing = 95+
> - Perfect 100: all 15 + documented threat model in docs/
>
> Output exactly:
> ```
> ## Security/SFDLC Expert Report
> Score: XX/100
> OWASP Electron Checklist:
> 1. contextIsolation: true ✓/✗
> 2. nodeIntegration: false/absent ✓/✗
> 3. webSecurity not disabled ✓/✗
> 4. sandbox enabled ✓/✗
> 5. No allowRunningInsecureContent ✓/✗
> 6. No enableBlinkFeatures ✓/✗
> 7. CSP configured ✓/✗
> SFDLC Checklist:
> 8. No hardcoded secrets ✓/✗
> 9. LICENSE file ✓/✗
> 10. .env in .gitignore ✓/✗
> 11. Pre-commit secret scanning ✓/✗
> 12. CI requires PR ✓/✗
> 13. Deps pinned ✓/✗
> 14. SBOM artifact ✓/✗
> 15. IPC input validation ✓/✗
> Top Issues:
> - SFDLC-001: [description] [SEVERITY: CRITICAL/HIGH/MED/LOW]
> Positive Findings:
> - [what passes]
> ```

After the sub-agent returns, record its score as `new_sfdlc`.

---

## Phase 5: Per-Page Deep Scan (NEW — 5%)

For each of the 12 pages below, read the source file(s) and score it across
6 criteria (each 0–100). Average the 6 criteria → per-page score.
Average all 12 per-page scores → `new_per_page`.

**Criteria:**

| ID | Criterion | What to check |
|----|-----------|---------------|
| C1 | **Loading state** | `isLoading`/`loading`/`isPending` rendered in JSX, `<Skeleton`, `<LoadingSpinner`, or `<Loader2` |
| C2 | **Empty state** | JSX branch when primary data is empty with user-facing content (not just `null` render) |
| C3 | **Error state** | `<ErrorDisplay`, `<Alert variant="destructive"`, `role="alert"`, or `setError` catch block rendered |
| C4 | **Accessibility** | `aria-label` on interactive elements, `role` attributes on non-semantic elements, keyboard event handlers, focus management |
| C5 | **Modern UI** | At least one of: `backdrop-blur`, `transition-*`, `motion.`, `dark:` variant, `hover:scale`, `AnimatePresence` |
| C6 | **Completeness** | Renders meaningful real content (not a stub/TODO placeholder) |

**Scoring per criterion:**
- 100: Fully implemented, best practice
- 75: Present but incomplete or inconsistent
- 50: Minimal/partial implementation
- 25: Stub/placeholder that barely counts
- 0: Completely absent

**Pages to scan:**

0. Welcome → `src/renderer/components/welcome/Welcome.tsx`
1. IntegrationPath → `src/renderer/components/integration/IntegrationPath.tsx`
2. ExtractSkills → `src/renderer/components/skills/ExtractSkills.tsx`
3. ConfigureProficiency → `src/renderer/components/proficiency/ConfigureProficiency.tsx`
4. RunAssessment → `src/renderer/components/proficiency/RunAssessment.tsx` +
   `AssessmentConfig.tsx` + `AssessmentProgress.tsx` + `AssessmentResults.tsx`
5. ReviewAssessment → `src/renderer/components/review/ReviewAssessment.tsx`
6. AssessmentHistory → `src/renderer/components/history/AssessmentHistory.tsx`
7. AnalyticsDashboard → `src/renderer/components/analytics/AnalyticsDashboard.tsx`
8. PromptEditor → `src/renderer/components/prompts/PromptEditor.tsx`
9. EnvironmentManager → `src/renderer/components/environments/EnvironmentManager.tsx`
10. Settings → `src/renderer/components/settings/Settings.tsx`
11. Documentation → `src/renderer/components/documentation/Documentation.tsx`

**Output the per-page table:**

```
| Page                | Loading | Empty | Error | A11y | ModernUI | Complete | Avg   |
|---------------------|---------|-------|-------|------|----------|----------|-------|
| 0 Welcome           | XX      | XX    | XX    | XX   | XX       | XX       | XX.X  |
| 1 IntegrationPath   | XX      | XX    | XX    | XX   | XX       | XX       | XX.X  |
| 2 ExtractSkills     | XX      | XX    | XX    | XX   | XX       | XX       | XX.X  |
| 3 ConfigureProfic.  | XX      | XX    | XX    | XX   | XX       | XX       | XX.X  |
| 4 RunAssessment     | XX      | XX    | XX    | XX   | XX       | XX       | XX.X  |
| 5 ReviewAssessment  | XX      | XX    | XX    | XX   | XX       | XX       | XX.X  |
| 6 AssessmentHistory | XX      | XX    | XX    | XX   | XX       | XX       | XX.X  |
| 7 AnalyticsDashboard| XX      | XX    | XX    | XX   | XX       | XX       | XX.X  |
| 8 PromptEditor      | XX      | XX    | XX    | XX   | XX       | XX       | XX.X  |
| 9 EnvManager        | XX      | XX    | XX    | XX   | XX       | XX       | XX.X  |
| 10 Settings         | XX      | XX    | XX    | XX   | XX       | XX       | XX.X  |
| 11 Documentation    | XX      | XX    | XX    | XX   | XX       | XX       | XX.X  |
| **OVERALL AVG**     |         |       |       |      |          |          | **XX**|
```

Flag each page scoring below 60 as `PAGE-NNN` (page index + criterion that failed).
Pages 0–5 (primary workflow) failures are HIGH priority.
Pages 6–11 (tools) failures are MEDIUM priority.

---

## Phase 6: API Surface Audit (NEW — 3%)

**Expert sub-agent** — launch a new Agent with this exact prompt:

> You are an API design expert. Read these files exactly:
> - `src/renderer/services/api.ts`
> - `src/renderer/services/electron-api.ts`
> - `src/renderer/types/api.ts`
> - `src/main/ipc-handlers.ts`
>
> Run:
> ```bash
> # All frontend service methods
> grep -n "async \|export function\|export const" src/renderer/services/api.ts | head -60
> grep -n "async \|export function\|export const" src/renderer/services/electron-api.ts | head -40
>
> # Timeout configuration
> grep -n "timeout\|AbortController\|signal:\|AbortSignal" src/renderer/services/api.ts
>
> # Error handling on every call
> grep -n "\.catch\|try {" src/renderer/services/api.ts | wc -l
> grep -n "async\b" src/renderer/services/api.ts | wc -l
>
> # Python backend routes
> grep -rn "@router\.\|@app\." /Users/adam/code/ProfStudio/ProfStudio/backend/app/ --include="*.py" \
>   | grep -v ".test.\|__pycache__\|#" | head -80
>
> # Typed return values
> grep -n "Promise<" src/renderer/services/api.ts
>
> # Retry logic
> grep -rn "retry\|retries\|backoff\|attempt" src/renderer/services/ --include="*.ts"
> ```
>
> Answer:
> 1. For each Python backend route found, is there a matching frontend service method? List all gaps as API-GAP-NNN.
> 2. What % of frontend service methods have explicit TypeScript return types (not Promise<unknown>)?
> 3. Is AbortController / timeout configured on long-running calls (assessment, SFTP)?
> 4. Is retry logic present for transient network errors?
> 5. Are all API methods wrapped in try/catch with user-facing error propagation?
>
> Score 0–100:
> - 90–100: All Python routes covered; all methods typed; timeouts on long ops; retry on transient errors; all try/catch
> - 70–89: All Python routes covered; types on most; timeouts on key operations
> - 50–69: ~70% of Python routes covered; ~70% typed
> - 0–49: Multiple uncovered routes; types largely missing; no timeouts
>
> Output exactly:
> ```
> ## API Surface Expert Report
> Score: XX/100
> Python Routes Found: N
> Frontend Coverage: N/N routes covered (XX%)
> Typed Methods: N/N (XX%)
> Timeout Config: present/absent on which operations
> Retry Logic: present/absent
> Top Issues:
> - API-001: [description] [SEVERITY: HIGH/MED/LOW]
> Positive Findings:
> - [what works well]
> ```

After the sub-agent returns, record its score as `new_api_surface`.

---

## Phase 7: Developer Experience (NEW — 2%)

Run all commands and capture output:

```bash
# VS Code configuration
cat .vscode/launch.json 2>/dev/null || echo "MISSING: no .vscode/launch.json"
cat .vscode/settings.json 2>/dev/null || echo "MISSING: no .vscode/settings.json"
cat .vscode/extensions.json 2>/dev/null || echo "MISSING: no .vscode/extensions.json"

# Git hooks
ls .husky/ 2>/dev/null && cat .husky/pre-commit 2>/dev/null || echo "No git hooks"

# Available scripts
node -e "const p=require('./package.json'); Object.entries(p.scripts||{}).forEach(([k,v])=>console.log(k+': '+v))"

# README completeness
wc -l README.md 2>/dev/null || echo "No README"
grep -c "npm run\|yarn\|pnpm\|npx" README.md 2>/dev/null || echo "0"

# TypeScript path aliases (DX convenience)
grep -n "paths\|baseUrl" tsconfig*.json | head -10

# Hot reload
grep -n "hmr\|hot" vite.config.ts 2>/dev/null | head -5

# Developer debugging: source maps
grep -n "sourcemap\|source-map" vite.config.ts 2>/dev/null
```

Score 0–100:
| Range | Criteria |
|-------|----------|
| 90–100 | VS Code launch.json with Electron debug + renderer debug configs; settings.json with TS/ESLint/Prettier; extensions.json with 5+ recommended extensions; pre-commit hook with lint-staged; README setup in ≤5 commands; TypeScript path aliases configured; source maps in dev mode |
| 70–89 | launch.json present; no pre-commit hooks; README complete; settings.json present |
| 50–69 | No launch.json; README exists but sparse; no VS Code workspace settings |
| 30–49 | Minimal DX tooling; README incomplete; developer must figure things out |
| 0–29 | No IDE config, no hooks, no README, starting the app requires tribal knowledge |

Flag gaps as `DX-001`, `DX-002`, etc.

Store as `new_dx`.

---

## Phase 8: Composite Score Aggregation

Compute the omni-audit composite using this exact formula:

```
omni_composite =
  (da_tests          * 0.07) +
  (da_build          * 0.05) +
  (da_security       * 0.05) +
  (da_typescript     * 0.05) +
  (da_architecture   * 0.05) +
  (da_error_handling * 0.05) +
  (da_deps           * 0.04) +
  (da_performance    * 0.04) +
  (da_backend        * 0.04) +
  (da_code_quality   * 0.04) +
  (da_cicd           * 0.03) +
  (da_build_pkg      * 0.03) +
  (da_a11y           * 0.03) +
  (da_docs           * 0.02) +
  (da_i18n           * 0.01) +
  (mq_ui_flow        * 0.05) +
  (mq_api_contract   * 0.03) +
  (mq_e2e            * 0.04) +
  (mq_logging        * 0.03) +
  (new_modern_design * 0.09) +
  (new_sfdlc         * 0.06) +
  (new_per_page      * 0.05) +
  (new_api_surface   * 0.03) +
  (new_dx            * 0.02)
```

Verify weights sum to exactly 1.00 (they do: 60% + 15% + 25% = 100%).

Display the full 25-dimension table sorted by highest weighted contribution:

```
| # | Dimension              | Group | Score | Weight | Weighted | vs Previous |
|---|------------------------|-------|-------|--------|----------|-------------|
| 1 | Modern Design          | NEW   | XX    | 9%     | X.X      | +X / -X / 1st run |
| 2 | Tests                  | DA    | XX    | 7%     | X.X      | ... |
| 3 | Build Health           | DA    | XX    | 5%     | X.X      | ... |
...
| 25| i18n                   | DA    | XX    | 1%     | X.X      | ... |
|   | **OMNI-AUDIT COMPOSITE**|       |       | **100%**| **XX.X** | **±X** |
```

Letter grades: A: 90+, B: 80+, C: 70+, D: 60+, F: <60

Show sub-groups:
- Group A (Foundation 60%): DA sub-score = sum of DA weighted contributions
- Group B (Extended QA 15%): MQ sub-score
- Group C (New Dimensions 25%): NEW sub-score

---

## Phase 9: History Comparison & Learning Loop

### Trend Analysis

If previous data exists (from Phase 0), for each of the 25 dimensions:
- Compute `delta = current_score - previous_score`
- Classify: Improving (delta > +3), Stable (±3), Degrading (delta < -3)
- Show in the Phase 8 table's `vs Previous` column

If 3+ omni-audit entries exist in OMNI_AUDIT_HISTORY.md, calculate velocity:
```
velocity = (current_composite - composite_2_runs_ago) / 2
```
- velocity > +3/run = Accelerating improvement
- velocity 0–3/run = Steady improvement
- velocity < 0/run = Regressing

### Known Issues Registry

Build the registry by merging:
- All NEW issues found this run (from all phases and sub-agents)
- All PERSISTING issues (found in previous run AND this run)
- Mark RESOLVED issues (in previous run but NOT found this run)

**Severity escalation rules (CRITICAL — apply automatically):**
- Issue appearing for the **2nd consecutive run**: escalate to HIGH regardless of original severity
- Issue appearing for **3+ consecutive runs**: escalate to CRITICAL regardless of original severity
- Track `consecutive_runs` counter per issue ID

Issue ID namespace conventions:
- `UIFLOW-NNN` — UI flow (Phase 2A)
- `E2E-NNN` — E2E coverage gaps (Phase 2C)
- `CONTRACT-NNN` / `IPC-NNN` — API contract (Phase 2D)
- `LOG-NNN` — Logging (Phase 2E)
- `UIUX-NNN` — UI/UX sub-agent
- `BKND-NNN` — Backend/API sub-agent
- `LLMAI-NNN` — LLM/AI sub-agent
- `TESTQ-NNN` — Test quality sub-agent
- `DESIGN-NNN` — Modern design (Phase 3)
- `SFDLC-NNN` — SFDLC compliance (Phase 4)
- `PAGE-NNN` — Per-page scan (Phase 5)
- `API-NNN` — API surface (Phase 6)
- `DX-NNN` — Developer experience (Phase 7)

**Never reuse an issue ID.** Once assigned, it belongs to that issue permanently (even if resolved).

### Sub-Agent Effectiveness Tracking

For each of the 6 sub-agents, record how many issues they found this run.
Update the cumulative effectiveness table:

```
| Agent               | Run 1 | Run 2 | Run 3 | Avg  |
|---------------------|-------|-------|-------|------|
| UI/UX Expert        | N     | -     | -     | N    |
| Backend/API Expert  | N     | -     | -     | N    |
| LLM/AI Expert       | N     | -     | -     | N    |
| Test Quality Expert | N     | -     | -     | N    |
| Modern Design Expert| N     | -     | -     | N    |
| Security Expert     | N     | -     | -     | N    |
```

After 3+ runs, report: **"Most historically productive agent: [name] (avg X issues/run)"**

---

## Phase 10: Generate Full Report

### Executive Summary

```
OMNI-AUDIT COMPOSITE: XX/100 (Letter Grade)
Trend: Improving / Stable / Degrading / First run — baseline established
Score velocity: +X pts/run (Accelerating / Steady / Regressing)

Group A Foundation (60% weight): XX pts
Group B Extended QA (15% weight): XX pts
Group C New Dimensions (25% weight): XX pts

Top 3 Strengths:    [highest scoring dimensions]
Top 3 Weaknesses:   [lowest scoring dimensions]
Top 3 Quick Wins:   [S-effort items with highest score impact]
Most Issues Found:  [sub-agent name] (N issues)
```

### Full 25-Dimension Table
From Phase 8.

### Sub-Agent Reports
Include each of the 6 expert sub-agent reports verbatim.

### Per-Page Score Table
From Phase 5 — all 12 pages with 6 criteria each.

### E2E Gap Matrix
From Phase 2C — all 12 steps × 6 categories.

### Known Issues Registry

```
| ID          | Description                  | Severity  | First Seen | Runs | Status     |
|-------------|------------------------------|-----------|------------|------|------------|
| DESIGN-001  | No backdrop-blur on buttons  | HIGH      | 2026-04-07 | 1    | OPEN       |
| SFDLC-001   | No CSP configured            | HIGH      | 2026-04-07 | 1    | OPEN       |
| LOG-001     | No file transport on logger  | HIGH      | 2026-03-01 | 3    | CRITICAL ⚠ |
```

Issues with `CRITICAL ⚠` (3+ runs) must appear at the TOP of the table.

### Resolved Issues
Issues from previous run no longer found — celebrate these.

### Action Plan to 100

For every open issue across all 25 dimensions and all 6 sub-agents:

| Issue ID | Description | Dimension | Score Impact | Effort | Suggested Skill |
|----------|-------------|-----------|-------------|--------|-----------------|
| DESIGN-001 | Add backdrop-blur to button.tsx | Modern Design | -2.0 pts | S | `/animate` + `/normalize` |
| SFDLC-001 | Configure CSP in electron-main.ts | SFDLC | -1.5 pts | M | `manual fix` |
| ... | | | | | |

Grouped:
- **Sprint A (Quick Wins)**: All S-effort items — maximum score per hour
- **Sprint B (High Impact)**: M-effort items sorted by score impact descending
- **Sprint C (Foundation)**: L-effort structural work
- **Sprint D (Polish)**: Remaining items for perfection

Estimated composite score progression:
```
Current:        XX/100
After Sprint A: ~XX/100 (+X estimated)
After Sprint B: ~XX/100 (+X estimated)
After Sprint C: ~XX/100 (+X estimated)
After Sprint D: ~100/100 (+X estimated)
```

---

## Phase 11: Persist Results

**CRITICAL**: After showing the full report, update `docs/OMNI_AUDIT_HISTORY.md`.
If the file does not exist, create it with this header:

```markdown
# ProfStudio Desktop - Omni-Audit History

This file is automatically maintained by the `/omni-audit` skill.
Do not edit manually. Entries are NEVER deleted — history IS the learning loop.
Supersedes: docs/AUDIT_HISTORY.md (deep-audit) for top-level composite tracking.
```

Prepend (newest first) a new entry:

```markdown
## Omni-Audit: YYYY-MM-DD

**Omni-Audit Composite: XX/100 (Letter Grade)**
**Trend: Improving/Stable/Degrading/First run**
**Velocity: +X pts/run (Accelerating/Steady/Regressing) | First run: N/A**

### Group Scores
- Group A Foundation (60%): XX pts
- Group B Extended QA (15%): XX pts
- Group C New Dimensions (25%): XX pts

### Dimension Scores (All 25)
| Dimension | Group | Score | Weight | Weighted | Notes |
|-----------|-------|-------|--------|----------|-------|
| Modern Design | NEW | XX | 9% | X.X | ... |
| Tests | DA | XX | 7% | X.X | ... |
[all 25 dimensions]
| **COMPOSITE** | | | 100% | **XX.X** | |

### Sub-Agent Scores (Informational)
| Agent | Score | Issues Found |
|-------|-------|-------------|
| UI/UX Expert | XX | N |
| Backend/API Expert | XX | N |
| LLM/AI Expert | XX | N |
| Test Quality Expert | XX | N |
| Modern Design Expert | XX | N |
| Security/SFDLC Expert | XX | N |
| **Most productive this run** | [name] | N |

### Per-Page Scores
[12-row table from Phase 5]

### Known Issues Registry
| ID | Description | Severity | First Seen | Consecutive Runs | Status |
|----|-------------|----------|------------|-----------------|--------|
[all open issues, CRITICAL first]

### Resolved Issues (Since Last Omni-Audit)
- ID: Description — RESOLVED YYYY-MM-DD

### New Issues (First Seen This Run)
- ID: Description [SEVERITY]

### Action Plan Summary
- Sprint A (Quick Wins): +X pts → XX/100
- Sprint B (High Impact): +X pts → XX/100
- Sprint C (Foundation): +X pts → XX/100
- Sprint D (Polish): +X pts → 100/100

### Agent Effectiveness History (updated each run)
| Agent | Run 1 | Run 2 | Run 3 | Avg |
|-------|-------|-------|-------|-----|
[cumulative table]
```

If `fix=true`, after persisting:
1. Fix all S-effort Sprint A items
2. Re-run affected diagnostic commands to verify fixes
3. Append a "Post-fix re-audit note" with updated scores
4. Follow ALL CLAUDE.md verification requirements (npm run build:main, npm run build,
   npm run type-check, npx vitest run — all must pass with zero errors)

---

## Rules

**NEVER**:
- Skip Phase 1 (deep-audit) — the 15 foundation dimensions are required
- Add sub-agent scores to the composite (they are informational only)
- Invent issue IDs — always use the next available number in each prefix
- Delete or overwrite any previous OMNI_AUDIT_HISTORY.md entries
- Grade without reading actual source files or running commands
- Persist results before showing the full report to the user
- Reuse an issue ID once assigned (even for resolved issues)

**ALWAYS**:
- Run deep-audit first and use its real output
- Give sub-agents exact file lists and exact questions
- Track the Known Issues Registry — this IS the enhanced learning loop
- Escalate severity of persisting issues (2 runs = HIGH, 3+ = CRITICAL)
- Show the full per-page table — it is the primary UX backlog deliverable
- Show the full E2E gap matrix — it is the primary test backlog deliverable
- Persist results AFTER showing the full report
- Follow CLAUDE.md verification requirements for any fixes made
