import { describe, expect, it } from 'vitest';
import {
  assetExists,
  catalogByKey,
  chunkText,
  computeHashes,
  DISCOVERY_CATEGORIES,
  estimateGeneration,
  isExportPath,
  keysMatching,
  LEDGER_CATALOG,
  ledgerToMarkdown,
  p0Keys,
  PACK_SPEC,
  projectSlug,
  readGuide,
  readTemplate,
  readyFiles,
  taskFileName,
  taskFileSpec,
  topoOrder,
  truncate,
  validateDag,
  type PathStatus,
} from '../src';

describe('ledger catalog', () => {
  it('has unique keys and areas, all in the ten categories', () => {
    expect(new Set(LEDGER_CATALOG.map((k) => k.key)).size).toBe(LEDGER_CATALOG.length);
    expect(new Set(LEDGER_CATALOG.map((k) => k.area)).size).toBe(LEDGER_CATALOG.length);
    for (const k of LEDGER_CATALOG) expect(DISCOVERY_CATEGORIES).toContain(k.category);
    expect(LEDGER_CATALOG).toHaveLength(40);
  });

  it('has the documented P0 keys and helpers', () => {
    expect(p0Keys()).toContain('product.one_liner');
    expect(p0Keys()).not.toContain('auth.mfa');
    expect(keysMatching('stack.*')).toEqual(['stack.frontend', 'stack.backend', 'stack.database']);
    expect(catalogByKey('stack.backend')?.founderDefault).toBe('NestJS + TypeScript');
    expect(catalogByKey('product.one_liner')?.founderDefault).toBe('');
  });

  it('renders a markdown table with em dashes for empty values', () => {
    const md = ledgerToMarkdown([{ key: 'stack.backend', value: 'Express | TS', status: 'confirmed' }]);
    expect(md.split('\n')[0]).toBe('| key | area | status | value |');
    expect(md).toContain('| stack.backend | Backend | confirmed | Express / TS |');
    expect(md).toContain('| product.one_liner | Product | deferred | — |');
  });
});

describe('pack spec', () => {
  it('is a valid DAG', () => {
    expect(() => validateDag(PACK_SPEC)).not.toThrow();
    expect(topoOrder(PACK_SPEC)).toHaveLength(PACK_SPEC.length);
  });

  it('every AI file has a model, an existing guide and an existing template', () => {
    for (const s of PACK_SPEC.filter((x) => x.writer === 'ai')) {
      expect(s.model, s.path).toBeDefined();
      expect(s.guide, s.path).toBeDefined();
      expect(assetExists('forward-build', s.guide as string), `${s.path} guide`).toBe(true);
      if (s.path !== 'internal/task-plan.json') {
        expect(assetExists('templates', s.template as string), `${s.path} template`).toBe(true);
      }
    }
    expect(readGuide('03-requirements-layer-guide.md').length).toBeGreaterThan(100);
    expect(readTemplate('project-docs/09-database-design.md').length).toBeGreaterThan(100);
    expect(readGuide('missing.md')).toBe('');
  });

  it('matches docs/29 on the main edges', () => {
    const get = (p: string) => PACK_SPEC.find((s) => s.path === p);
    expect(get('docs/09-database-design.md')?.after).toEqual(['docs/06-domain-model-and-glossary.md', 'docs/08-technology-stack-and-adrs.md']);
    expect(get('docs/09-database-design.md')?.context).toContain('docs/03-cleaned-srs.md');
    expect(get('docs/01-executive-summary.md')?.after).toEqual([]);
    expect(get('docs/20-risk-register.md')?.context).not.toContain('docs/03-cleaned-srs.md');
    expect(get('docs/build/PROJECT_CONTEXT.md')?.template).toBe('codex-handoff/CODEX_PROJECT_CONTEXT.md');
    expect(get('docs/03-cleaned-srs.md')?.formatRules).toContain('FR-001');
    expect(get('CLAUDE.md')?.writer).toBe('code');
    expect(PACK_SPEC.filter((s) => s.writer === 'ai')).toHaveLength(26);
  });

  it('dag rejects missing paths and cycles', () => {
    expect(() => validateDag([{ path: 'a', title: 'a', writer: 'code', after: ['b'], keys: [], context: [] }])).toThrow(/not in the spec/);
    expect(() =>
      validateDag([
        { path: 'a', title: 'a', writer: 'code', after: ['b'], keys: [], context: [] },
        { path: 'b', title: 'b', writer: 'code', after: ['a'], keys: [], context: [] },
      ]),
    ).toThrow(/Cycle/);
  });

  it('computes the ready set', () => {
    const status = new Map<string, PathStatus>(PACK_SPEC.map((s) => [s.path, 'pending']));
    let ready = readyFiles(PACK_SPEC, status).map((s) => s.path);
    expect(ready).toEqual(['docs/00-index.md', 'docs/23-open-questions-and-assumptions.md', 'docs/01-executive-summary.md']);
    status.set('docs/01-executive-summary.md', 'done');
    ready = readyFiles(PACK_SPEC, status).map((s) => s.path);
    expect(ready).toContain('docs/02-product-requirements-document.md');
    status.set('docs/02-product-requirements-document.md', 'generating');
    expect(readyFiles(PACK_SPEC, status).map((s) => s.path)).not.toContain('docs/02-product-requirements-document.md');
  });

  it('task files depend on the task plan and are code-written', () => {
    const s = taskFileSpec({ number: 4, slug: 'core-api', title: 'Core API' });
    expect(s.path).toBe('docs/build/tasks/task-004-core-api.md');
    expect(s.after).toEqual(['internal/task-plan.json']);
    expect(s.writer).toBe('code');
    expect(isExportPath(s.path)).toBe(true);
    expect(isExportPath('internal/task-plan.json')).toBe(false);
  });
});

describe('inputs hash', () => {
  const ledger = LEDGER_CATALOG.map((k) => ({ key: k.key, value: k.founderDefault || 'x', status: 'confirmed' }));

  it('is stable for equal input', () => {
    expect(computeHashes(PACK_SPEC, ledger)).toEqual(computeHashes(PACK_SPEC, ledger));
  });

  it('changing stack.backend changes 07, 08 and their descendants, and not 01 or 02', () => {
    const before = computeHashes(PACK_SPEC, ledger);
    const changed = ledger.map((r) => (r.key === 'stack.backend' ? { ...r, value: 'Express' } : r));
    const after = computeHashes(PACK_SPEC, changed);
    const diff = (p: string) => before.get(p) !== after.get(p);
    expect(diff('docs/07-system-architecture.md')).toBe(true);
    expect(diff('docs/08-technology-stack-and-adrs.md')).toBe(true);
    expect(diff('docs/09-database-design.md')).toBe(true); // 08 is in its context
    expect(diff('docs/19-coding-standards.md')).toBe(true);
    expect(diff('docs/01-executive-summary.md')).toBe(false);
    expect(diff('docs/02-product-requirements-document.md')).toBe(false);
    expect(diff('docs/03-cleaned-srs.md')).toBe(true); // keys: all
  });
});

describe('small helpers', () => {
  it('slugs', () => {
    expect(projectSlug('My Great App!!')).toBe('my-great-app');
    expect(projectSlug('!!!')).toBe('blueprint');
    expect(projectSlug('a'.repeat(80))).toHaveLength(50);
    expect(taskFileName(4, 'core-api')).toBe('task-004-core-api.md');
  });

  it('truncate keeps the marker', () => {
    expect(truncate('abcdef', 10)).toBe('abcdef');
    expect(truncate('a'.repeat(50), 20).endsWith('…(truncated)')).toBe(true);
    expect(truncate('a'.repeat(50), 20)).toHaveLength(20);
  });

  it('estimate follows docs/27', () => {
    const e = estimateGeneration(PACK_SPEC);
    expect(e.tokens).toBeGreaterThan(300_000);
    expect(e.aiCalls).toBeGreaterThan(26);
  });
});

describe('chunkText', () => {
  it('short text is one chunk', () => {
    expect(chunkText('hello\n\nworld')).toHaveLength(1);
    expect(chunkText('   ')).toEqual([]);
  });

  it('30k text gives 3 chunks of at most 12,000 characters, with the last paragraph carried over', () => {
    const paras = Array.from({ length: 100 }, (_, i) => `P${i} ` + 'x'.repeat(296));
    const chunks = chunkText(paras.join('\n\n'));
    expect(chunks).toHaveLength(3);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(12_000);
    const lastOfFirst = (chunks[0] as string).split('\n\n').at(-1) as string;
    expect((chunks[1] as string).startsWith(lastOfFirst)).toBe(true);
  });
});
