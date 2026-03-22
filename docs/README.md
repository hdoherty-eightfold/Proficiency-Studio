# ProfStudio Desktop Documentation

Welcome to the ProfStudio Desktop documentation. This guide covers the Electron-based desktop application for AI-powered skills proficiency assessment.

## Quick Links

- [Getting Started](./getting-started/quick-start.md)
- [Architecture Overview](./architecture/overview.md)
- [Integration Paths](./user-guide/integration-paths.md)
- [Testing Guide](./testing/running-tests.md)
- [Troubleshooting](./troubleshooting/common-errors.md)

## Documentation Structure

```
docs/
├── getting-started/       # Installation and setup
│   ├── prerequisites.md
│   ├── quick-start.md
│   └── first-run.md
├── user-guide/            # How to use the app
│   ├── integration-paths.md
│   ├── workflow-steps.md
│   └── keyboard-shortcuts.md
├── architecture/          # Technical documentation
│   ├── overview.md
│   ├── electron-ipc.md
│   └── error-handling.md
├── testing/               # Testing documentation
│   ├── running-tests.md
│   └── verification-checklist.md
└── troubleshooting/       # Problem solving
    └── common-errors.md
```

## Application Overview

ProfStudio Desktop is a 12-step workflow application for:
1. **Importing Skills Data** - Via CSV, SFTP, or Eightfold API
2. **Extracting Skills** - Parsing and identifying skills
3. **Configuring Assessment** - Setting proficiency levels and LLM providers
4. **Running Assessment** - AI-powered proficiency evaluation
5. **Reviewing Results** - Analyzing assessment outcomes
6. **Exporting Data** - Multiple format support

## Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Desktop Framework**: Electron 28
- **State Management**: Zustand
- **UI Components**: Radix UI + Tailwind CSS
- **Backend Communication**: IPC channels to FastAPI

## Key Features

- Multi-provider LLM support (OpenAI, Gemini, Anthropic, Grok)
- Secure credential storage (Electron safeStorage)
- Parallel batch processing
- Confidence scoring and reasoning
- Export to CSV/XLSX/JSON

## Version

Current version: See [package.json](../package.json)

## Support

For issues, see [Troubleshooting](./troubleshooting/common-errors.md) or file an issue in the repository.
