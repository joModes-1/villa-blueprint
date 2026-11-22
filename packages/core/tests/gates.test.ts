import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  buildZip,
  createMockClient,
  g01RequiredFiles,
  g02RequirementsTraced,
  g03NfrMeasurable,
  g04EndpointsProtected,
  g05SchemaMatchesDomain,
  g06TaskGraph,
  g07LedgerComplete,
  g08IndexCoversLedger,
  g09NoPlaceholders,
  g10SelfContained,
  g11Contradictions,
  hasHeading,
  findSection,
  isExportPath,
  LEDGER_CATALOG,
  PACK_SPEC,
  parseTables,
  renderCodeFile,
  runGates,
  stripCodeBlocks,
  taskFilePath,
  topoOrder,
  type AiClient,
  type GateInput,
  type LedgerRow,
  type TaskPlan,
} from '../src';

const ledger: LedgerRow[] = LEDGER_CATALOG.map((k) => ({
  key: k.key,
  value: k.founderDefault || `Example answer for ${k.area}`,
  status: k.priority === 'P0' ? 'confirmed' : 'assumed',
  rationale: 'r',
}));

/** Builds a full, passing pack by running the mock AI for AI files and the renderers for code files. */
async function buildPack(): Promise<GateInput> {
  const ai = createMockClient();
  const docs = new Map<string, string>();
  let plan: TaskPlan | undefined;
  for (const path of topoOrder(PACK_SPEC)) {
    const spec = PACK_SPEC.find((s) => s.path === path)!;
    if (spec.writer === 'ai') {
      const res = await ai.complete({ tag: path === 'internal/task-plan.json' ? 'task-plan' : `doc:${path}`, model: 'fast', system: '', user: '' });
      docs.set(path, res.text);
      if (path === 'internal/task-plan.json') plan = JSON.parse(res.text) as TaskPlan;
    } else {
      docs.set(path, renderCodeFile(path, { projectName: 'Notes', ledger, questions: [], docs }));
    }
    if (path === 'internal/task-plan.json') {
      for (const t of plan!.tasks) {
        const p = taskFilePath(t.number, t.slug);
        docs.set(p, renderCodeFile(p, { projectName: 'Notes', ledger, questions: [], docs }));
      }
    }
  }
  const clean = new Map(docs);
  clean.delete('internal/task-plan.json');
  return { docs: clean, ledger, questions: [], plan: plan! };
}

const clone = (i: GateInput, edit: (m: Map<string, string>) => void): GateInput => {
  const docs = new Map(i.docs);
  edit(docs);
  return { ...i, docs };
};

describe('markdown helpers', () => {
  it('parses tables without headers or separators, and ignores code blocks', () => {
    const md = '## A\n| H1 | H2 |\n|---|---|\n| a | b |\n| c |  |\n```\n| x | y |\n```\n';
    expect(parseTables(md)).toEqual([['a', 'b'], ['c', '']]);
    expect(hasHeading(md, 'A')).toBe(true);
    expect(findSection('## A\nx\n## B\ny', 'A')).toBe('x');
    expect(findSection('## A\nx', 'Z')).toBe('');
    expect(stripCodeBlocks('a ```b``` c')).toBe('a  c');
  });
});

describe('gates G01–G10', () => {
  it('a mock-built pack passes every deterministic rule', async () => {
    const pack = await buildPack();
    for (const rule of [g01RequiredFiles, g02RequirementsTraced, g03NfrMeasurable, g04EndpointsProtected, g05SchemaMatchesDomain, g06TaskGraph, g07LedgerComplete, g08IndexCoversLedger, g09NoPlaceholders, g10SelfContained]) {
      expect(rule(pack), rule.name).toEqual([]);
    }
    expect(pack.docs.size).toBe(PACK_SPEC.filter((s) => isExportPath(s.path)).length + 8);
  });

  it('G01: missing file, too short, missing heading', async () => {
    const pack = await buildPack();
    const f = g01RequiredFiles(clone(pack, (m) => { m.delete('docs/18-observability-logging-and-monitoring.md'); m.set('docs/19-coding-standards.md', '# x\n## Standards'); m.set('docs/22-readme-draft.md', '# R\n' + 'x'.repeat(400)); }));
    const msgs = f.map((x) => x.message);
    expect(msgs).toContain('Missing file docs/18-observability-logging-and-monitoring.md');
    expect(msgs).toContain('docs/19-coding-standards.md is too short');
    expect(msgs).toContain('docs/22-readme-draft.md is missing heading "Setup"');
  });

  it('G02: an FR missing from matrix, traceability or tasks', async () => {
    const pack = await buildPack();
    const f = g02RequirementsTraced(clone(pack, (m) => m.set('docs/03-cleaned-srs.md', m.get('docs/03-cleaned-srs.md')! + '\n| FR-099 | New | P0 |')));
    expect(f.map((x) => x.message)).toEqual(['FR-099 is not in the requirements matrix', 'FR-099 is not in the traceability matrix', 'FR-099 is not covered by any task']);
    expect(g02RequirementsTraced(clone(pack, (m) => m.set('docs/03-cleaned-srs.md', 'none')))[0]?.message).toContain('No FR-###');
  });

  it('G03: an NFR without a number', async () => {
    const pack = await buildPack();
    const f = g03NfrMeasurable(clone(pack, (m) => m.set('docs/05-non-functional-requirements.md', '## N\n| ID | Requirement | Target |\n|---|---|---|\n| NFR-004 | Fast | quick |')));
    expect(f[0]?.message).toBe('NFR-004 has no measurable target');
  });

  it('G04: an endpoint without an access rule', async () => {
    const pack = await buildPack();
    const f = g04EndpointsProtected(clone(pack, (m) => m.set('docs/10-api-specification.md', '## Endpoints\n| Method | Path | Purpose | Access |\n|---|---|---|---|\n| GET | /x | list |  |')));
    expect(f[0]?.message).toBe('Endpoint "GET /x" has no access rule');
  });

  it('G05: a table not described elsewhere (warning)', async () => {
    const pack = await buildPack();
    const f = g05SchemaMatchesDomain(clone(pack, (m) => m.set('docs/09-database-design.md', '## Schema Overview\n| Table | Purpose | Key notes |\n|---|---|---|\n| invoices | x | y |')));
    expect(f).toEqual([{ rule: 'G05', severity: 'warning', documentPath: 'docs/09-database-design.md', message: 'Table "invoices" is not described in the domain model or API' }]);
  });

  it('G06: index and task files out of step, bad dependency', async () => {
    const pack = await buildPack();
    const f = g06TaskGraph(clone(pack, (m) => m.set('docs/build/TASKS_INDEX.md', '| Status | Task |\n|---|---|\n| Pending | [task-001-project-setup](x) |')));
    expect(f.some((x) => x.message.includes('Task 2 is missing'))).toBe(true);
    const bad = { ...pack, plan: { tasks: pack.plan.tasks.map((t) => (t.number === 2 ? { ...t, dependsOn: [5] } : t)) } };
    expect(g06TaskGraph(bad).some((x) => x.message.includes('depends on 5'))).toBe(true);
  });

  it('G07: empty P0 and an assumed key missing from the open questions', async () => {
    const pack = await buildPack();
    const l = pack.ledger.map((r) => (r.key === 'stack.backend' ? { ...r, value: '' } : r));
    expect(g07LedgerComplete({ ...pack, ledger: l })[0]?.message).toBe('P0 decision "Backend" is missing');
    const f = g07LedgerComplete(clone(pack, (m) => m.set('docs/23-open-questions-and-assumptions.md', '## Assumptions\nnone')));
    expect(f.length).toBeGreaterThan(5);
  });

  it('G08: an area missing from the index', async () => {
    const pack = await buildPack();
    const f = g08IndexCoversLedger(clone(pack, (m) => m.set('docs/00-index.md', '## Confirmed Decisions\n| Area | Confirmed decision |\n|---|---|\n| Product | x |')));
    expect(f.some((x) => x.message === '"Backend" is missing from 00-index')).toBe(true);
  });

  it('G09: placeholders outside code fences only', async () => {
    const pack = await buildPack();
    const bad = g09NoPlaceholders(clone(pack, (m) => m.set('docs/19-coding-standards.md', '# S\nTODO: fix')));
    expect(bad[0]?.message).toBe('docs/19-coding-standards.md contains a placeholder: "TODO"');
    expect(g09NoPlaceholders(clone(pack, (m) => m.set('docs/19-coding-standards.md', '# S\n```\nTODO\n```')))).toEqual([]);
    expect(g09NoPlaceholders(clone(pack, (m) => m.set('docs/19-coding-standards.md', '# S\n[insert name]')))).toHaveLength(1);
  });

  it('G10: outside links warn; localhost, example.com and ledger hosts pass', async () => {
    const pack = await buildPack();
    const text = '# S\nSee https://evil.test/x and http://localhost:3000/a and https://docs.example.com/b and https://api.stripe.com/v1';
    const f = g10SelfContained({ ...pack, ledger: pack.ledger.map((r) => (r.key === 'integrations.payments' ? { ...r, value: 'Stripe via api.stripe.com' } : r)), docs: new Map([...pack.docs, ['docs/19-coding-standards.md', text]]) });
    expect(f).toEqual([{ rule: 'G10', severity: 'warning', documentPath: 'docs/19-coding-standards.md', message: 'docs/19-coding-standards.md links outside the pack: https://evil.test/x' }]);
  });
});

describe('G11 contradictions', () => {
  it('keeps a finding whose quote is in the document and drops one whose quote is absent', async () => {
    const pack = await buildPack();
    const docs = new Map(pack.docs);
    docs.set('docs/08-technology-stack-and-adrs.md', '# ADRs\nAuth is handled by Clerk.\n## Stack\n## ADRs');
    const ai: AiClient = {
      async complete() {
        return {
          text: JSON.stringify({
            findings: [
              { documentPath: 'docs/08-technology-stack-and-adrs.md', quote: 'Auth is   handled by Clerk.', conflictsWith: 'auth.method', explanation: 'ADR says Clerk' },
              { documentPath: 'docs/08-technology-stack-and-adrs.md', quote: 'never written', conflictsWith: 'auth.method', explanation: 'invented' },
              { documentPath: 'docs/not-in-batch.md', quote: 'x', conflictsWith: 'y', explanation: 'z' },
            ],
          }),
          model: 'm', tokensIn: 1, tokensOut: 1, costUsd: 0,
        };
      },
    };
    const f = await g11Contradictions({ ...pack, docs }, ai);
    expect(f.length).toBeGreaterThanOrEqual(1);
    expect(f[0]).toEqual({ rule: 'G11', severity: 'blocker', documentPath: 'docs/08-technology-stack-and-adrs.md', message: 'ADR says Clerk — "Auth is handled by Clerk." conflicts with auth.method' });
    expect(f.every((x) => x.message.includes('Clerk'))).toBe(true);
  });

  it('runGates sorts blockers first, then by rule, and the mock pack is clean', async () => {
    const pack = await buildPack();
    expect(await runGates(pack, createMockClient())).toEqual([]);
    const docs = new Map(pack.docs);
    docs.set('docs/19-coding-standards.md', '# S\nTODO see https://evil.test\nMOCK_CONTRADICTION');
    docs.set('docs/08-technology-stack-and-adrs.md', (docs.get('docs/08-technology-stack-and-adrs.md') ?? '') + '\nMOCK_CONTRADICTION');
    const f = await runGates({ ...pack, docs }, createMockClient());
    expect(f.map((x) => x.severity)).toEqual([...f.map((x) => x.severity)].sort((a, b) => (a === b ? 0 : a === 'blocker' ? -1 : 1)));
    expect(f.some((x) => x.rule === 'G11' && x.documentPath === 'docs/08-technology-stack-and-adrs.md')).toBe(true);
  });
});

describe('zip', () => {
  it('has the exact paths under the slug, in spec order, without internal/', async () => {
    const bytes = await buildZip('My App!', [
      { path: 'docs/build/tasks/task-001-x.md', content: 't' },
      { path: 'internal/task-plan.json', content: '{}' },
      { path: 'START-HERE.md', content: 's' },
      { path: 'docs/00-index.md', content: 'i' },
    ]);
    const zip = await JSZip.loadAsync(bytes);
    expect(Object.keys(zip.files)).toEqual(['my-app/docs/00-index.md', 'my-app/START-HERE.md', 'my-app/docs/build/tasks/task-001-x.md']);
    expect(await zip.file('my-app/START-HERE.md')!.async('string')).toBe('s');
  });
});

describe('G11 resilience', () => {
  it('a failing AI call becomes a warning, not a crash, and batches run independently', async () => {
    const pack = await buildPack();
    let calls = 0;
    const ai: AiClient = {
      async complete() {
        calls += 1;
        throw new Error('provider timeout');
      },
    };
    const f = await g11Contradictions(pack, ai);
    expect(f.length).toBeGreaterThan(0);
    expect(f.every((x) => x.rule === 'G11' && x.severity === 'warning')).toBe(true);
    expect(calls).toBeGreaterThanOrEqual(f.length);
  });
});
