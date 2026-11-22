import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Runs before the web servers start? No: Playwright starts webServers first. The reset only clears app tables. */
export default function globalSetup(): void {
  fs.mkdirSync(path.resolve(__dirname, '.logs'), { recursive: true });
  const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  execFileSync(pnpm, ['exec', 'tsx', 'scripts/reset-test-db.ts'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}
