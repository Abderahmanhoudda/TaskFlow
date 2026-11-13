// TaskFlow - Playwright configuration
// E2E tests run against the dev servers on http://localhost:5173
// (Vite proxies /api to the Express backend on port 5000)
//
// Prerequisite: both servers must be running
//   cd server && node index.js
//   cd client && npm run dev
//
// Uses the system Chromium when available (no browser download required).

import { defineConfig, devices } from '@playwright/test';

const SYSTEM_CHROMIUM = '/usr/bin/chromium';

export default defineConfig({
    testDir: './e2e',
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    workers: 1, // serial: screenshots and shared demo account must be deterministic
    retries: 0,
    reporter: [['list']],

    use: {
        baseURL: 'http://localhost:5173',
        screenshot: 'off',
        video: 'off',
        trace: 'off',
        launchOptions: {
            executablePath: SYSTEM_CHROMIUM,
            args: ['--disable-dev-shm-usage', '--no-sandbox'],
        },
    },

    projects: [
        {
            name: 'desktop',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1440, height: 900 },
            },
        },
    ],
});
