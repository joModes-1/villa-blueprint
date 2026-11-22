import { catalogByKey, LEDGER_CATALOG } from './catalog';

export interface LedgerRow {
  key: string;
  value: string;
  status: 'confirmed' | 'assumed' | 'deferred';
  rationale?: string;
  sourceRefs?: { factIds?: string[]; questionId?: string; edited?: boolean };
  version?: number;
}

export function cell(text: string): string {
  return text.replace(/\r?\n+/g, ' ').replace(/\|/g, '/').trim();
}

/** Rows in catalog order; rows missing from `rows` are shown as deferred and empty. */
export function inCatalogOrder(rows: LedgerRow[]): LedgerRow[] {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return LEDGER_CATALOG.map((k) => byKey.get(k.key) ?? { key: k.key, value: '', status: 'deferred' as const });
}

/** `| key | area | status | value |` with em dashes for empty values (docs/27 prompt input). */
export function ledgerToMarkdown(rows: LedgerRow[]): string {
  const lines = ['| key | area | status | value |', '|---|---|---|---|'];
  for (const r of inCatalogOrder(rows)) {
    const area = catalogByKey(r.key)?.area ?? r.key;
    lines.push(`| ${r.key} | ${cell(area)} | ${r.status} | ${r.value.trim() === '' ? '—' : cell(r.value)} |`);
  }
  return lines.join('\n');
}
