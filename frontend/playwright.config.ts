import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const configuration = defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: { baseURL: 'http://localhost:5174', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @financy/backend dev',
      url: 'http://localhost:3001/health',
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        NODE_ENV: 'test',
        HOST: '127.0.0.1',
        PORT: '3001',
        DATABASE_URL: 'postgresql://app:app@localhost:5432/app_test',
        JWT_SECRET: 'financy-e2e-only-secret-not-for-production-2026',
        FRONTEND_URL: 'http://localhost:5174',
        CORS_ORIGINS: 'http://localhost:5174',
        AVATAR_DIRECTORY: resolve(import.meta.dirname, 'test-results/avatars'),
      },
    },
    {
      command:
        'pnpm --filter @financy/frontend exec vite --host 127.0.0.1 --port 5174',
      url: 'http://localhost:5174',
      reuseExistingServer: false,
      timeout: 30_000,
      env: { VITE_BACKEND_URL: 'http://localhost:3001/graphql' },
    },
  ],
});

export { configuration as default };
