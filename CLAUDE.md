# CLAUDE.md - ProfStudio Desktop (Electron App)

**IMPORTANT: This is the ACTIVE project we are working on.**

The web-based frontend at `/Users/adam/code/ProfStudio/ProfStudio/frontend/` is the OLD version.
All development should be done in this Electron Desktop app.

## Project Overview

ProfStudio Desktop is an Electron-based desktop application for AI-powered skills proficiency assessment.

## Project Structure

```
ProfStudio-Desktop/
├── src/
│   ├── main/           # Electron main process
│   ├── preload/        # Preload scripts
│   └── renderer/       # React frontend
│       ├── components/ # UI components
│       ├── stores/     # Zustand state stores
│       └── services/   # API services
├── package.json
└── vite.config.ts
```

## Windows Development

The app runs on Windows with the same commands. Prerequisites:
- Node.js 18+
- Python 3.10+ on PATH (as `python`, not `python3`)
- `npm run dev` starts everything (frontend + electron + backend)
- `npm run build:win` builds the Windows installer (NSIS)

## Development Commands

```bash
# Start development (frontend + electron + backend)
npm run dev

# Build for production
npm run build

# Build for specific platform (includes backend PyInstaller build)
npm run build:mac
npm run build:win
npm run build:linux

# Type check all configs
npm run type-check

# Run all tests
npx vitest run
```

## Verification Requirements (IMPORTANT)

**After EVERY code change, Claude MUST run these commands autonomously — never ask the user to do it:**

1. `npm run build:main` - Rebuild the Electron main process (required after changing any `src/main/` files)
2. `npm run build` - Full build (renderer + main + preload) - verify zero errors
3. `npm run type-check` - TypeScript type checking across all configs - verify zero errors
4. `npx vitest run` - Run all tests - verify all passing with zero failures
5. Check terminal output for any warnings or errors that need attention

**Do NOT skip these steps.** Always run them and verify clean output before considering work complete. If any command fails, fix the issue before moving on.

6. **Restart the app** - Kill any running dev process and run `npm run dev` to restart the app with your changes. Do NOT tell the user to restart — do it yourself. Use `pkill -f "electron"` and `pkill -f "vite"` to kill existing processes before restarting.

## Key Files

- `src/renderer/stores/app-store.ts` - Main Zustand store with Skill interface
- `src/renderer/components/skills/ExtractSkills.tsx` - Skills extraction view
- `src/renderer/components/skills/SkillsTableEditor.tsx` - Editable skills table
- `src/renderer/components/proficiency/ConfigureProficiency.tsx` - Proficiency config
- `src/renderer/components/proficiency/RunAssessment.tsx` - Assessment runner

## E2E Testing (Playwright)

End-to-end tests cover the full SFTP → Extract Skills → Configure → Assessment workflow.

### Running E2E tests

**Prerequisites**: `npm run dev` must be running first (starts Electron + Vite + Python backend).

```bash
# Run the full SFTP workflow E2E test suite
npx playwright test --config=playwright.dev.config.ts

# Run with browser visible (headed mode)
npx playwright test --config=playwright.dev.config.ts --headed
```

### E2E test files

| File | Purpose |
|------|---------|
| `e2e/sftp-workflow.spec.ts` | Full SFTP workflow (11 tests, all passing) |
| `e2e/global-setup.ts` | Auto-detects running backend port via `ps aux` + health check |
| `playwright.dev.config.ts` | Config: serial workers, vite preview at `:4173`, API proxy via `page.route()` |

### How it works

- The renderer is built and served via `vite preview` at `localhost:4173`
- `page.route()` intercepts all `/api/**` calls from the preview and proxies them to the real backend
- `window.electron` is mocked via `addInitScript` (IPC is not available in browser mode)
- `global-setup.ts` detects the dynamic backend port on each run

### SFTP Test Credential

The tests use a real SFTP connection stored in the backend's database:

| Field | Value |
|-------|-------|
| Credential name | `Eightfold Demo SFTP` |
| Credential ID | `c8994973-bbec-4c50-a90d-5d55f22bdf4a` |
| Host | `sftp.eightfold.ai` |
| Username | `eightfolddemoadohertycom` |
| Remote path (home) | `/ef-sftp/eightfolddemoadohertycom/home` |
| Test file | `data_science_skills.csv` (at home dir root) |

`data_science_skills.csv` (40 ML/data science skills, 1 KB) was uploaded to the SFTP home directory for E2E testing. It exercises the full extraction pipeline without long runtimes.

> **Note**: A stale directory `employee_sample.csv/` also exists at the home path (artefact from a previous upload attempt). It can be ignored or deleted — the tests use `data_science_skills.csv`.

## Recent Changes

- Replaced JsonViewer with SkillsTableEditor for editable CSV-like skills display
- Added proficiency fields to Skill interface
- Skills now display in an editable table instead of JSON
- SFTP file browser: click-to-select with highlighted border (removed inline "Use This File" button from CSV-only rows)
- Fixed "Unknown Source" bug: SFTP integration type now persisted to localStorage on file selection
- `skillsState` added to Zustand `partialize` so skills survive page reload
- Added Playwright E2E test suite for SFTP → Extract → Configure → Assessment workflow
- Removed "Employee Data" from CSV upload sample files (was not a skills file)
- Added `delete_file` to SFTP manager + `DELETE /api/sftp/file/{credential_id}` endpoint
- SFTP test file: `data_science_skills.csv` (40 ML/AI skills) at home dir root

## Backend

The Python backend auto-starts inside the Electron app via `BackendManager` (`src/main/backend-manager.ts`).

- **Dev mode**: Spawns Python from `../ProfStudio/backend/` using the venv, on a dynamic port
- **Production**: Spawns the PyInstaller binary bundled in app resources
- Auto-restarts on crash (up to 3 retries with exponential backoff)
- The `scripts/dev.mjs` script handles the `ELECTRON_RUN_AS_NODE` env var that VS Code/Cursor sets

**You do NOT need to start the backend manually.** `npm run dev` handles everything.

## LLM Model Configuration (IMPORTANT)

**CRITICAL: All LLM model configurations MUST be centralized in ONE place.**

- **Desktop app**: `src/renderer/config/models.ts` - Single source of truth for desktop
- **Backend**: `../ProfStudio/backend/app/core/models_config.py` - Backend config

**Rules:**
1. **NO Gemini 2.5 models** - Only use Gemini 3 models (`gemini-3-flash-preview`, `gemini-3-pro-preview`)
2. **Single source of truth** - All model lists, defaults, and fallbacks must be defined in `src/renderer/config/models.ts`
3. **Import from central config** - All components should import from `../../config/models`, never hardcode model names
4. When adding new models, update both Desktop and Backend config files to stay in sync
