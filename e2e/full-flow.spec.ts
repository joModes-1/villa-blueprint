import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { expect, test } from '@playwright/test';

const PASSWORD = 'e2e-Password-12345';
const IDEA =
  'A notes app for small teams. People sign up with email and a password. Each user writes short notes with a title. Notes can be tagged and searched. Teams share a workspace with admins and members. Admins can remove notes and invite people.';

test('sign up, paste an idea, build the pack, download it', async ({ page, context }) => {
  const started = Date.now();
  const email = `e2e-${Date.now()}@example.com`;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // Sign up (AC-01)
  await page.goto('/signup');
  await page.getByLabel('Name').fill('E2E Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole('heading', { name: 'What do you want to build?' })).toBeVisible();

  // Paste the idea into the prompt box and send it: creates the project, adds the source and analyzes.
  await page.getByLabel('Describe your app idea').fill(IDEA);
  await page.getByRole('button', { name: 'Build my blueprint' }).click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);

  // Wait for the Interview step, then accept everything recommended.
  const accept = page.getByRole('button', { name: 'Accept all recommended' });
  await expect(accept).toBeVisible({ timeout: 90_000 });
  await accept.click();

  // The ledger shows no red P0 rows.
  await page.getByRole('button', { name: /Ledger/ }).click();
  await expect(page.getByText('Every required decision has a value.')).toBeVisible();
  await expect(page.getByText('Required', { exact: true })).toHaveCount(0);

  // Generate and wait for Ready (docs/16: within 90 s).
  await page.getByRole('button', { name: /Generate/ }).first().click();
  await page.getByRole('button', { name: 'Generate pack' }).click();
  await expect(page.getByRole('heading', { name: 'Your blueprint is ready' })).toBeVisible({ timeout: 90_000 });
  const mockFlowSeconds = Math.round((Date.now() - started) / 1000);
  console.log(`NFR-003 mock flow, signup to ready: ${mockFlowSeconds}s`);

  // Documents step renders 00-index.
  await page.getByRole('button', { name: /Documents/ }).click();
  await expect(page.getByRole('heading', { name: /Documentation Index/ })).toBeVisible();

  // Gates step: no blockers.
  await page.getByRole('button', { name: /Gates and export/ }).click();
  await expect(page.getByText('All 11 quality checks passed ✓')).toBeVisible();

  // Download and inspect the zip.
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: /Download pack/ }).click()]);
  const file = path.resolve(__dirname, '.logs', 'pack.zip');
  await download.saveAs(file);
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const names = Object.keys(zip.files);
  const root = names[0]!.split('/')[0]!;
  for (const n of ['START-HERE.md', 'AGENTS.md', 'CLAUDE.md', 'docs/build/tasks/task-001-project-setup.md', 'docs/26-production-readiness-runbook.md']) {
    expect(names, n).toContain(`${root}/${n}`);
  }
  expect(names.some((n) => n.includes('internal/'))).toBe(false);
  expect(errors).toEqual([]);

  // AC-15: nothing secret in the server logs (password, session token).
  const cookies = await context.cookies();
  const session = cookies.find((c) => c.name === 'bp_session')?.value;
  expect(session).toBeTruthy();
  for (const f of ['web.log', 'worker.log']) {
    const log = fs.readFileSync(path.resolve(__dirname, '.logs', f), 'utf8');
    expect(log, `${f} has output`).toContain('{');
    expect(log).not.toContain(PASSWORD);
    expect(log).not.toContain(session as string);
    expect(log).not.toMatch(/bp_[A-Za-z0-9_-]{43}/);
    expect(log).not.toContain(IDEA.slice(0, 40));
  }
});
