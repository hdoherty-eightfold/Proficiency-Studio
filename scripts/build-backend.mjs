#!/usr/bin/env node

/**
 * Cross-platform build script for the ProfStudio Python backend.
 * Replaces build-backend.sh to support both macOS/Linux and Windows.
 * Output: backend-dist/profstudio-backend/
 */

import { execSync } from 'node:child_process';
import { existsSync, rmSync, renameSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const DESKTOP_DIR = dirname(SCRIPT_DIR);
const BACKEND_DIR = join(dirname(DESKTOP_DIR), 'ProfStudio', 'backend');

const isWin = process.platform === 'win32';
const pythonCmd = isWin ? 'python' : 'python3';

function run(cmd, opts = {}) {
  console.log(`  > ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function dirSize(dir) {
  // Quick size estimate — just report that it exists
  try {
    return existsSync(dir) ? 'OK' : 'missing';
  } catch {
    return 'unknown';
  }
}

console.log('=== Building ProfStudio Backend ===');
console.log(`Backend source: ${BACKEND_DIR}`);
console.log(`Output: ${join(DESKTOP_DIR, 'backend-dist')}`);
console.log(`Platform: ${process.platform}`);

// Check Python is available
try {
  execSync(`${pythonCmd} --version`, { stdio: 'pipe' });
} catch {
  console.error(`Error: ${pythonCmd} not found. Please install Python 3.10+.`);
  process.exit(1);
}

// Check/create virtual env
const venvDir = join(BACKEND_DIR, 'venv');
if (!existsSync(venvDir)) {
  console.log('Creating virtual environment...');
  run(`${pythonCmd} -m venv "${venvDir}"`);
}

// Get path to venv's pip and python (call them directly, no need to "activate")
const venvPython = isWin
  ? join(venvDir, 'Scripts', 'python.exe')
  : join(venvDir, 'bin', 'python');
const venvPip = isWin
  ? join(venvDir, 'Scripts', 'pip.exe')
  : join(venvDir, 'bin', 'pip');

// Install dependencies (skip if venv already populated — pip resolution can time out)
const venvSitePackages = isWin
  ? join(venvDir, 'Lib', 'site-packages')
  : join(venvDir, 'lib');
if (!existsSync(venvSitePackages) || existsSync(join(BACKEND_DIR, '.force-pip-install'))) {
  console.log('Installing backend dependencies...');
  run(`"${venvPip}" install -r "${join(BACKEND_DIR, 'requirements.txt')}" --quiet`);
} else {
  console.log('Skipping pip install — venv already populated.');
}

// Install PyInstaller
console.log('Installing PyInstaller...');
run(`"${venvPip}" install pyinstaller --quiet`);

// Clean previous build
for (const dir of [
  join(BACKEND_DIR, 'build'),
  join(BACKEND_DIR, 'dist'),
  join(DESKTOP_DIR, 'backend-dist'),
]) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Run PyInstaller
console.log('Running PyInstaller...');
const pyinstallerBin = isWin
  ? join(venvDir, 'Scripts', 'pyinstaller.exe')
  : join(venvDir, 'bin', 'pyinstaller');
run(`"${pyinstallerBin}" profstudio-backend.spec --noconfirm`, { cwd: BACKEND_DIR });

// Move output to desktop project
console.log('Moving build output...');
renameSync(
  join(BACKEND_DIR, 'dist', 'profstudio-backend'),
  join(DESKTOP_DIR, 'backend-dist')
);

// Clean up PyInstaller build artifacts
for (const dir of [join(BACKEND_DIR, 'build'), join(BACKEND_DIR, 'dist')]) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Verify the binary exists
const binaryName = isWin ? 'profstudio-backend.exe' : 'profstudio-backend';
const binaryPath = join(DESKTOP_DIR, 'backend-dist', binaryName);

if (existsSync(binaryPath)) {
  console.log('=== Build successful ===');
  console.log(`Binary: ${binaryPath}`);
} else {
  console.error('Error: Build failed - binary not found');
  process.exit(1);
}
