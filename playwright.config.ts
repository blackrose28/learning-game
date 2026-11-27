import { defineConfig, devices } from '@playwright/test';

// E2E tests run against the local dev servers. `pnpm dev` starts both the
// web app (http://localhost:3010) and the Worker API (http://localhost:8787);
// the web dev server proxies /api to the Worker. Run `pnpm build` once first
// if the API refuses to start: wrangler needs apps/web/dist to exist.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3010',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3010',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
