/**
 * Playwright config for live E2E tests against the running dev server.
 *
 * Requirements:
 *   - `npm run dev` must already be running (starts Electron + Vite + backend)
 *   - Backend auto-detected via globalSetup (ps aux scan + health check)
 *
 * Usage:
 *   npx playwright test --config=playwright.dev.config.ts
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    testMatch: ['**/sftp-workflow.spec.ts', '**/debug.spec.ts'],
    fullyParallel: false,    // SFTP tests mutate shared server state — run serially
    retries: 0,
    workers: 1,
    reporter: 'list',
    globalSetup: './e2e/global-setup.ts',
    use: {
        baseURL: 'http://localhost:4173',
        trace: 'on',
        screenshot: 'on',
        video: 'on',
        // Extra time for SFTP operations
        actionTimeout: 20_000,
        navigationTimeout: 30_000,
    },
    projects: [
        {
            name: 'chromium-dev',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    // Build renderer then serve via vite preview (same pattern as playwright.config.ts)
    webServer: {
        command: 'npm run build:renderer && npx vite preview --port 4173',
        url: 'http://localhost:4173',
        reuseExistingServer: true,
        timeout: 90_000,
    },
});
