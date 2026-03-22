# Proficiency Studio Desktop

AI-Powered Proficiency Assessment Desktop Application built with Electron, React 19, TypeScript, and modern UI components.

## Features

- 🖥️ **Cross-Platform Desktop App** - Works on Windows, macOS, and Linux
- ⚡ **Modern Tech Stack** - React 19, TypeScript, Electron 33
- 🎨 **Beautiful UI** - Radix UI components with Tailwind CSS
- 🌓 **Dark Mode** - Full dark mode support with system preference detection
- 🔄 **State Management** - Zustand for efficient state management
- ✨ **Animations** - Smooth animations with Motion (Framer Motion)
- 🔒 **Secure** - Context isolation and secure IPC communication
- 🚀 **Auto-Updates** - Built-in auto-update support

## Tech Stack

### Desktop Framework
- **Electron** 33.x - Cross-platform desktop application
- **TypeScript** 5.7+ - Type-safe development
- **Vite** 7.x - Lightning-fast build tool

### Frontend
- **React** 19.2.3 - Latest React with concurrent features
- **Radix UI** - Accessible, unstyled component primitives
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - Lightweight state management
- **Motion** (Framer Motion 12.x) - Advanced animations
- **Lucide React** - Beautiful icon library

### Backend Integration
- **FastAPI** backend (Proficiency Studio backend)
- **Electron IPC** - Secure communication between processes

## Prerequisites

- Node.js >= 24.0.0
- npm >= 10.0.0
- Python 3.8+ (for backend)

## Installation

1. **Clone the repository**
   ```bash
   cd /Users/adam/code/ProfStudio/ProfStudio-Desktop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and configure your backend URL (default: `http://localhost:8000`)

4. **Start the backend** (in a separate terminal)
   ```bash
   cd ../ProfStudio/backend
   # Follow backend setup instructions
   python -m uvicorn app.main:app --reload
   ```

5. **Start the desktop app in development mode**
   ```bash
   npm run dev
   ```

## Development

### Available Scripts

- `npm run dev` - Start development mode (React dev server + Electron)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Building for Production

Build for your platform:
- **macOS**: `npm run build:mac`
- **Windows**: `npm run build:win`
- **Linux**: `npm run build:linux`
- **All platforms**: `npm run build:all`

Installers will be created in the `release/` directory.

## Project Structure

```
Proficiency-Studio-Desktop/
├── src/
│   ├── main/               # Electron main process
│   │   ├── electron-main.ts
│   │   ├── ipc-handlers.ts
│   │   └── ...
│   ├── preload/            # Preload scripts (IPC bridge)
│   │   └── preload.ts
│   └── renderer/           # React application
│       ├── components/     # React components
│       │   ├── ui/        # Radix UI wrappers
│       │   ├── layout/    # Layout components
│       │   └── ...
│       ├── stores/        # Zustand stores
│       ├── services/      # API services
│       ├── hooks/         # Custom hooks
│       ├── lib/           # Utilities
│       ├── styles/        # Global styles
│       ├── App.tsx        # Main app component
│       └── main.tsx       # React entry point
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Features Roadmap

### Currently Implemented
- [x] Project setup and configuration
- [x] Electron main process with window management
- [x] IPC communication layer
- [x] React 19 with TypeScript
- [x] Radix UI component library
- [x] Tailwind CSS design system
- [x] Zustand state management
- [x] Theme management (light/dark/system)
- [x] Sidebar navigation
- [x] Welcome page with animations
- [x] Integration Path component
- [x] Extract Skills component
- [x] Configure Proficiency component
- [x] Run Assessment component
- [x] Review & Export component
- [x] Assessment History component
- [x] Environment Manager component
- [x] Settings component

### Coming Soon (Sprint 2-4)
- [ ] CSV Review Panel (AI-powered issue detection)
- [ ] Data Quality Dashboard (A-F grades)
- [ ] Field Mapping Panel (4-tier confidence)
- [ ] Auto-Fix Dialog (AI suggestions)
- [ ] Analytics Dashboard
- [ ] Prompt Editor

## Keyboard Shortcuts

- `Cmd/Ctrl + N` - New Project
- `Cmd/Ctrl + O` - Open Project
- `Cmd/Ctrl + ,` - Settings
- `Cmd/Ctrl + →` - Next Step
- `Cmd/Ctrl + ←` - Previous Step
- `Cmd/Ctrl + 1-8` - Jump to specific step

## Architecture

### Main Process
- Window lifecycle management
- Menu system
- IPC handler registration
- Backend communication proxy
- File system operations

### Renderer Process
- React application
- UI components and layouts
- State management with Zustand
- API communication via IPC

### Preload Script
- Secure bridge between main and renderer
- Context isolation
- Exposes safe API to renderer

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linting: `npm run lint`
4. Test your changes
5. Submit a pull request

## License

MIT

## Support

For issues and questions, please visit the [GitHub repository](https://github.com/proficiencystudio/proficiency-studio-desktop).
