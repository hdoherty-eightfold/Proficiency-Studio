/**
 * Playwright Global Setup
 * Detects the running backend port and writes it to process.env for tests.
 */
import { execSync } from 'child_process';
import { request } from '@playwright/test';

async function findBackendPort(): Promise<number> {
    // Find the most recently started Python backend process
    try {
        const output = execSync(
            "ps aux | grep 'main.py --port' | grep -v grep | awk '{for(i=1;i<=NF;i++) if($i==\"--port\") print $(i+1)}' | tail -1",
            { encoding: 'utf8' }
        ).trim();
        const port = parseInt(output, 10);
        if (!isNaN(port) && port > 0) {
            // Verify it's actually alive
            const ctx = await request.newContext();
            try {
                const resp = await ctx.get(`http://127.0.0.1:${port}/health`, { timeout: 3000 });
                if (resp.ok()) {
                    await ctx.dispose();
                    return port;
                }
            } catch { /* fall through */ }
            await ctx.dispose();
        }
    } catch { /* fall through */ }

    // Fallback: scan common dev ports
    const candidates = [64744, 63439, 59610, 8000, 8001, 8080];
    const ctx = await request.newContext();
    for (const port of candidates) {
        try {
            const resp = await ctx.get(`http://127.0.0.1:${port}/health`, { timeout: 2000 });
            if (resp.ok()) {
                await ctx.dispose();
                return port;
            }
        } catch { /* try next */ }
    }
    await ctx.dispose();
    throw new Error('Could not find a running backend. Run `npm run dev` first.');
}

export default async function globalSetup() {
    const port = await findBackendPort();
    process.env.BACKEND_PORT = String(port);
    console.log(`\n[global-setup] Backend found at port ${port}`);
}
