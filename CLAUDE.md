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

**After EVERY code change, you MUST run these commands and check for errors:**

1. `npm run build:main` - Rebuild the Electron main process (required after changing any `src/main/` files)
2. `npm run build` - Full build (renderer + main + preload) - verify zero errors
3. `npm run type-check` - TypeScript type checking across all configs - verify zero errors
4. `npx vitest run` - Run all tests - verify all 529+ tests pass with zero failures
5. Check terminal output for any warnings or errors that need attention

**Do NOT skip these steps.** Always run them and verify clean output before considering work complete. If any command fails, fix the issue before moving on.

6. **Restart the app** - Kill any running dev process and run `npm run dev` to restart the app with your changes. Do NOT tell the user to restart — do it yourself.

## Key Files

- `src/renderer/stores/app-store.ts` - Main Zustand store with Skill interface
- `src/renderer/components/skills/ExtractSkills.tsx` - Skills extraction view
- `src/renderer/components/skills/SkillsTableEditor.tsx` - Editable skills table
- `src/renderer/components/proficiency/ConfigureProficiency.tsx` - Proficiency config
- `src/renderer/components/proficiency/RunAssessment.tsx` - Assessment runner

## Recent Changes

- Replaced JsonViewer with SkillsTableEditor for editable CSV-like skills display
- Added proficiency fields to Skill interface
- Skills now display in an editable table instead of JSON

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
