#!/bin/bash
set -euo pipefail

# Build the ProfStudio Python backend using PyInstaller
# Output: backend-dist/profstudio-backend/

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DESKTOP_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$(dirname "$DESKTOP_DIR")/ProfStudio/backend"

echo "=== Building ProfStudio Backend ==="
echo "Backend source: $BACKEND_DIR"
echo "Output: $DESKTOP_DIR/backend-dist/"

# Check Python and pip are available
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 not found. Please install Python 3.10+."
    exit 1
fi

# Check if virtual env exists, create if needed
VENV_DIR="$BACKEND_DIR/venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

# Activate virtual env
source "$VENV_DIR/bin/activate"

# Install dependencies
echo "Installing backend dependencies..."
pip install -r "$BACKEND_DIR/requirements.txt" --quiet

# Install PyInstaller
echo "Installing PyInstaller..."
pip install pyinstaller --quiet

# Clean previous build
rm -rf "$BACKEND_DIR/build" "$BACKEND_DIR/dist"
rm -rf "$DESKTOP_DIR/backend-dist"

# Run PyInstaller
echo "Running PyInstaller..."
cd "$BACKEND_DIR"
pyinstaller profstudio-backend.spec --noconfirm

# Move output to desktop project
echo "Moving build output..."
mv "$BACKEND_DIR/dist/profstudio-backend" "$DESKTOP_DIR/backend-dist"

# Clean up PyInstaller build artifacts
rm -rf "$BACKEND_DIR/build" "$BACKEND_DIR/dist"

# Verify the binary exists
if [ -f "$DESKTOP_DIR/backend-dist/profstudio-backend" ]; then
    echo "=== Build successful ==="
    echo "Binary: $DESKTOP_DIR/backend-dist/profstudio-backend"
    echo "Size: $(du -sh "$DESKTOP_DIR/backend-dist" | cut -f1)"
else
    echo "Error: Build failed - binary not found"
    exit 1
fi

deactivate
