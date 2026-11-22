import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { config } from 'dotenv';

config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.DATABASE_URL_TEST;
if (!url) {
  console.error('DATABASE_URL_TEST is not set. Add it to .env.');
  process.exit(1);
}

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
execFileSync(pnpm, ['--filter', '@blueprint/db', 'exec', 'prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, DATABASE_URL: url },
});
