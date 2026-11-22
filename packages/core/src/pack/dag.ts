import type { PackFileSpec } from './spec';

export type PathStatus = 'pending' | 'generating' | 'done' | 'failed' | 'stale';

/** Throws when an `after` or `context` path is missing, or the graph has a cycle. */
export function validateDag(spec: PackFileSpec[]): void {
  const paths = new Set(spec.map((s) => s.path));
  if (paths.size !== spec.length) throw new Error('Duplicate paths in the pack spec.');
  for (const s of spec) {
    for (const a of s.after) {
      if (!paths.has(a)) throw new Error(`${s.path}: after-path "${a}" is not in the spec.`);
    }
    for (const c of s.context) {
      if (!paths.has(c)) throw new Error(`${s.path}: context-path "${c}" is not in the spec.`);
    }
  }
  topoOrder(spec); // throws on a cycle
}

/** Paths in dependency order (stable: spec order is kept where there is no constraint). */
export function topoOrder(spec: PackFileSpec[]): string[] {
  const byPath = new Map(spec.map((s) => [s.path, s]));
  const state = new Map<string, 'visiting' | 'done'>();
  const out: string[] = [];
  const visit = (path: string, trail: string[]): void => {
    const st = state.get(path);
    if (st === 'done') return;
    if (st === 'visiting') throw new Error(`Cycle in the pack spec: ${[...trail, path].join(' -> ')}`);
    state.set(path, 'visiting');
    const s = byPath.get(path);
    if (!s) throw new Error(`Unknown path in the pack spec: ${path}`);
    const deps = new Set([...s.after, ...s.context]);
    for (const d of deps) visit(d, [...trail, path]);
    state.set(path, 'done');
    out.push(path);
  };
  for (const s of spec) visit(s.path, []);
  return out;
}

/** Files that are `pending` and whose every `after` path is `done`. */
export function readyFiles(spec: PackFileSpec[], statusByPath: Map<string, PathStatus>): PackFileSpec[] {
  return spec.filter(
    (s) => statusByPath.get(s.path) === 'pending' && s.after.every((a) => statusByPath.get(a) === 'done'),
  );
}
