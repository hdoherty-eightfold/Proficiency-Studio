/**
 * Dev script that starts Vite and Electron together.
 * Captures Vite's actual port (which may differ from 5173 if that port is in use)
 * and passes it to Electron via VITE_DEV_SERVER_URL env var.
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const electronBin = resolve(projectRoot, 'node_modules', '.bin', 'electron');

// Start Vite dev server
const vite = spawn('node', [resolve(projectRoot, 'node_modules', '.bin', 'vite')], {
  stdio: ['ignore', 'pipe', 'pipe'],
  cwd: projectRoot,
});

let electronProcess = null;

// Parse Vite output to find the local URL
const rl = createInterface({ input: vite.stdout });
rl.on('line', (line) => {
  process.stdout.write(`[vite] ${line}\n`);

  // Match Vite's "Local: http://localhost:XXXX/" output
  const match = line.match(/Local:\s+(http:\/\/localhost:\d+)/);
  if (match && !electronProcess) {
    const viteUrl = match[1];
    console.log(`[dev] Vite ready at ${viteUrl}, starting Electron...`);
    startElectron(viteUrl);
  }
});

vite.stderr?.on('data', (data) => {
  process.stderr.write(`[vite] ${data}`);
});

function startElectron(url) {
  // Build env: must delete ELECTRON_RUN_AS_NODE (set by VS Code/Cursor terminals)
  // otherwise Electron runs as plain Node.js and require('electron') won't work
  const env = { ...process.env, VITE_DEV_SERVER_URL: url, NODE_ENV: 'development' };
  delete env.ELECTRON_RUN_AS_NODE;

  electronProcess = spawn(electronBin, ['.'], {
    stdio: 'inherit',
    cwd: projectRoot,
    env,
  });

  electronProcess.on('exit', (code) => {
    console.log(`[dev] Electron exited with code ${code}`);
    vite.kill();
    process.exit(code ?? 0);
  });
}

// Handle cleanup
function cleanup() {
  electronProcess?.kill();
  vite.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

vite.on('exit', (code) => {
  console.log(`[dev] Vite exited with code ${code}`);
  electronProcess?.kill();
  process.exit(code ?? 1);
});
