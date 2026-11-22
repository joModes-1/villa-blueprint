import fs from 'node:fs';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from '@playwright/test';

loadEnv({ path: path.resolve(__dirname, '.env') });

const testDb = process.env.DATABASE_URL_TEST;
if (!testDb) throw new Error('DATABASE_URL_TEST is not set. Add it to .env.');

const webPort = process.env.E2E_WEB_PORT ?? '3000';
const workerPort = process.env.E2E_WORKER_PORT ?? '3101';
const mcpPort = process.env.E2E_MCP_PORT ?? '3102';
const webUrl = `http://localhost:${webPort}`;

const env = {
  DATABASE_URL: testDb,
  DATABASE_URL_TEST: testDb,
  APP_URL: webUrl,
  AI_PROVIDER: 'mock',
  API_URL: webUrl,
  WORKER_HEALTH_PORT: workerPort,
  MCP_PORT: mcpPort,
  LOG_LEVEL: 'info',
};

// Server output goes to files so the AC-15 check can scan it for secrets.
const logs = 'e2e/.logs';
fs.mkdirSync(path.resolve(__dirname, logs), { recursive: true });

export default defineConfig({
  testDir: './e2e',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: { baseURL: webUrl, trace: 'retain-on-failure', acceptDownloads: true },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command: `pnpm --filter @blueprint/web exec next start -p ${webPort} > ${logs}/web.log 2>&1`,
      url: `${webUrl}/api/v1/health`,
      env,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `pnpm --filter @blueprint/worker start > ${logs}/worker.log 2>&1`,
      url: `http://localhost:${workerPort}/health`,
      env,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `pnpm --filter @blueprint/mcp start > ${logs}/mcp.log 2>&1`,
      url: `http://localhost:${mcpPort}/health`,
      env,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
