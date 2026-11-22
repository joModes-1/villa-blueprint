import fs from 'node:fs';
import path from 'node:path';

function isCoreRoot(dir: string): boolean {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')) as { name?: string };
    return pkg.name === '@blueprint/core';
  } catch {
    return false;
  }
}

function findCoreRoot(): string {
  const fromEnv = process.env.BLUEPRINT_CORE_ROOT;
  if (fromEnv && isCoreRoot(fromEnv)) return fromEnv;
  // Walk up from the working directory looking for the repository checkout.
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, 'packages', 'core');
    if (isCoreRoot(candidate)) return candidate;
    if (isCoreRoot(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('Cannot locate packages/core. Deploy the whole repository checkout, or set BLUEPRINT_CORE_ROOT.');
}

let cachedRoot: string | undefined;

export function getCoreRoot(): string {
  cachedRoot ??= findCoreRoot();
  return cachedRoot;
}

/** Absolute path of `packages/core` (resolved lazily so importing core never touches the disk). */
export const CORE_ROOT_LAZY = getCoreRoot;

function readAsset(...segments: string[]): string {
  try {
    return fs.readFileSync(path.join(getCoreRoot(), 'assets', ...segments), 'utf8');
  } catch {
    return '';
  }
}

/** A guide from assets/forward-build/. Returns '' when missing. */
export function readGuide(file: string): string {
  return readAsset('forward-build', file);
}

/** A template from assets/templates/ (path relative to that folder). Returns '' when missing. */
export function readTemplate(relPath: string): string {
  return readAsset('templates', ...relPath.split('/'));
}

export function assetExists(kind: 'forward-build' | 'templates', relPath: string): boolean {
  return fs.existsSync(path.join(getCoreRoot(), 'assets', kind, ...relPath.split('/')));
}

export function truncate(text: string, max: number, marker = '…(truncated)'): string {
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - marker.length)) + marker;
}
