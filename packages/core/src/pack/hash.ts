import { createHash } from 'node:crypto';
import { keyMatches } from '../ledger/catalog';
import { topoOrder } from './dag';
import type { PackFileSpec } from './spec';

export interface HashLedgerRow {
  key: string;
  value: string;
  status: string;
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** The ledger rows a file depends on, sorted by key. */
export function ledgerSlice(spec: PackFileSpec, ledger: HashLedgerRow[]): HashLedgerRow[] {
  const rows =
    spec.keys === 'all'
      ? ledger
      : ledger.filter((r) => (spec.keys as string[]).some((pattern) => keyMatches(pattern, r.key)));
  return [...rows].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

/**
 * inputsHash per path (docs/29 "Stale tracking"): SHA-256 of the JSON of the file's ledger values and the
 * hashes of its context paths, computed in one pass in topological order so a change flows down the DAG.
 * The decision status is part of the hash because the index renders it.
 */
export function computeHashes(spec: PackFileSpec[], ledger: HashLedgerRow[]): Map<string, string> {
  const byPath = new Map(spec.map((s) => [s.path, s]));
  const out = new Map<string, string>();
  for (const path of topoOrder(spec)) {
    const s = byPath.get(path);
    if (!s) continue;
    const payload = {
      keys: ledgerSlice(s, ledger).map((r) => [r.key, r.value, r.status]),
      context: s.context.map((c) => out.get(c) ?? ''),
    };
    out.set(path, sha256Hex(JSON.stringify(payload)));
  }
  return out;
}
