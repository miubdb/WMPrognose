import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const DB = process.env.E2E_DATABASE_URL ?? 'postgres://rtm:rtm@localhost:5432/rtm_e2e';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'], browserName: 'chromium', defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 240000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: DB,
      ALLOW_REGISTRATION: 'true',
      SESSION_SECRET: 'e2e-secret-e2e-secret-e2e-secret-1234',
      DATABASE_SSL: 'disable',
      NODE_ENV: 'production',
      COOKIE_SECURE: 'false',
    },
  },
});
