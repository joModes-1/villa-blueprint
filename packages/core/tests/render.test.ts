import { describe, expect, it } from 'vitest';
import {
  buildDocPrompt,
  docSystemPrompt,
  fitContext,
  groupTasks,
  LEDGER_CATALOG,
  PACK_SPEC,
  parseTaskPlan,
  renderAgents,
  renderClaude,
  renderCodeFile,
  renderIndex,
  renderOpenQuestions,
  renderStartHere,
  renderTaskBreakdown,
  renderTaskFile,
  renderTasksIndex,
  renderTraceability,
  stripMarkdownFence,
  validateDoc,
  validateTaskPlan,
  createMockClient,
  type LedgerRow,
  type TaskPlan,
} from '../src';

const ledger: LedgerRow[] = LEDGER_CATALOG.map((k, i) => ({
  key: k.key,
  value: i % 5 === 0 ? '' : `Value for ${k.area}`,
  status: i % 5 === 0 ? 'deferred' : i % 3 === 0 ? 'assumed' : 'confirmed',
  rationale: 'r',
}));

function plan(n = 8): TaskPlan {
  return {
    tasks: Array.from({ length: n }, (_, i) => ({
      number: i + 1,
      slug: i === 0 ? 'project-setup' : i === n - 1 ? 'documentation-and-final-polish' : `part-${i + 1}`,
      title: `Title ${i + 1}`,
      goal: `Goal ${i + 1}`,
      dependsOn: i === 0 ? [] : [i],
      requirementIds: i === 3 ? ['FR-001'] : i === 5 ? ['FR-002'] : [],
      areas: ['area a'],
      steps: ['one', 'two', 'three'],
      tests: ['t'],
      acceptance: ['a'],
    })),
  };
}

describe('renderers', () => {
  it('index: decision table covers confirmed and assumed rows only, marks assumed', () => {
    const md = renderIndex(ledger, 'Notes');
    expect(md).toContain('| Area | Confirmed decision |');
    expect(md).toContain('*(assumed)*');
    expect(md).not.toContain('| Product |'); // i=0 is deferred
    expect(md).toContain('## Documentation Map');
    expect(md).toContain('| 09-database-design.md | Database Design |');
    expect(md.length).toBeGreaterThan(300);
  });

  it('open questions: assumptions, deferred and unanswered', () => {
    const md = renderOpenQuestions(
      ledger,
      [{ key: 'stack.backend', prompt: 'Backend?', status: 'open' }, { key: 'x', prompt: 'done', status: 'answered' }],
    );
    expect(md).toContain('## Assumptions');
    expect(md).toContain('| ' + ledger.find((r) => r.status === 'assumed')!.key + ' |');
    expect(md).toContain('| stack.backend | Backend? | open |');
    expect(md).not.toContain('| x |');
    expect(renderOpenQuestions([], [])).toContain('No decisions were assumed.');
  });

  it('task breakdown, tasks index, traceability and task files', () => {
    const p = plan();
    expect(renderTaskBreakdown(p)).toContain('| 4 | [Title 4](build/tasks/task-004-part-4.md) | 3 | FR-001 |');
    const idx = renderTasksIndex(p);
    expect(idx).toContain('| Pending | [task-001-project-setup](tasks/task-001-project-setup.md) | None |');
    expect(idx.match(/task-\d{3}-/g)).toHaveLength(16);
    const trace = renderTraceability('FR-001 FR-002 FR-001', 'NFR-001', p);
    expect(trace).toMatch(/\| FR-001 \|[^\n]*\| docs\/03-cleaned-srs\.md \| task-004 \|/);
    expect(trace).toMatch(/\| NFR-001 \|[^\n]*\| docs\/05-non-functional-requirements\.md \| — \|/);
    const file = renderTaskFile(p.tasks[3]!, ledger, p);
    for (const h of ['Goal', 'Context', 'Requirements Covered', 'Dependencies', 'Files and Areas', 'Steps', 'Tests Required', 'Acceptance Criteria', 'Verification Commands', 'Stop Conditions']) {
      expect(file).toContain(`## ${h}`);
    }
    expect(file).toContain('task-003-part-3');
    expect(file.length).toBeGreaterThan(300);
  });

  it('AGENTS, CLAUDE and START-HERE follow the pack pattern', () => {
    const p = plan();
    expect(renderAgents(ledger, p, 'Notes')).toContain('task-001 to task-008');
    expect(renderClaude()).toBe('Read and follow `AGENTS.md`. Start with `START-HERE.md`.\n');
    const start = renderStartHere(ledger, p, 'Notes');
    expect(start).toContain('### Prompt 1');
    expect(start).toContain('Read START-HERE.md and AGENTS.md, then docs/00-index.md.');
    expect(start).toContain('Continue from the first task in docs/build/TASKS_INDEX.md');
    expect(start).toContain('### Final audit');
    expect(start.match(/### Prompt \d/g)!.length).toBeLessThanOrEqual(8);
  });

  it('groups 8 to 16 tasks into at most 8 prompts without a lone trailing task', () => {
    for (let n = 8; n <= 16; n++) {
      const g = groupTasks(plan(n));
      expect(g.length).toBeLessThanOrEqual(8);
      expect(g.flat()).toHaveLength(n);
      expect(g.length === 1 || g[g.length - 1]!.length >= 2).toBe(true);
    }
  });

  it('renderCodeFile dispatches and rejects unknown paths', () => {
    const docs = new Map([['internal/task-plan.json', JSON.stringify(plan())]]);
    const ctx = { projectName: 'Notes', ledger, questions: [], docs };
    expect(renderCodeFile('docs/build/tasks/task-002-part-2.md', ctx)).toContain('# Task 002: Title 2');
    expect(renderCodeFile('CLAUDE.md', ctx)).toContain('AGENTS.md');
    expect(() => renderCodeFile('docs/nope.md', ctx)).toThrow();
    expect(() => parseTaskPlan(undefined)).toThrow();
  });
});

describe('doc prompt and validation', () => {
  it('system prompt carries the verbatim rules, headings and format rules', () => {
    const s = docSystemPrompt(['A', 'B'], 'Use a table.');
    expect(s).toContain('1. Everything must agree with the DECISION LEDGER. The ledger wins over every other input.');
    expect(s).toContain('Use exactly these "## " headings, in this order: A; B.');
    expect(s).toContain('10. Use a table.');
    expect(s).toContain('9. Technology: use only the stack, providers and integrations named in the DECISION LEDGER');
    expect(docSystemPrompt(undefined, undefined)).not.toContain('10.');
  });

  it('builds the user prompt sections in order', () => {
    const spec = PACK_SPEC.find((s) => s.path === 'docs/11-ui-ux-specification.md')!;
    const p = buildDocPrompt({ spec, ledger, contextDocs: [{ path: 'docs/10-api-specification.md', content: 'API' }], figmaText: 'FIGMA TEXT', missingHeadings: ['## States'] });
    const order = ['## DECISION LEDGER', '## GUIDE', '## EXAMPLE', '## EARLIER DOCUMENTS', '## FIGMA', '## TASK'].map((h) => p.user.indexOf(h));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(p.user).toContain('Write docs/11-ui-ux-specification.md: "UI/UX Specification".');
    expect(p.user).toContain('Your previous answer was missing these headings: ## States');
    const other = buildDocPrompt({ spec: PACK_SPEC.find((s) => s.path === 'docs/01-executive-summary.md')!, ledger, contextDocs: [], figmaText: 'X' });
    expect(other.user).not.toContain('## FIGMA');
  });

  it('context budget: three long docs are truncated evenly with the marker; short ones keep everything', () => {
    const long = (c: string) => c.repeat(50_000);
    const out = fitContext([{ path: 'a', content: long('a') }, { path: 'b', content: long('b') }, { path: 'c', content: long('c') }]);
    for (const d of out) {
      expect(d.content.length).toBe(20_000);
      expect(d.content.endsWith('…(truncated)')).toBe(true);
    }
    const mixed = fitContext([{ path: 'a', content: 'short' }, { path: 'b', content: long('b') }]);
    expect(mixed[0]?.content).toBe('short');
    expect(mixed[1]?.content.length).toBe(50_000);
  });

  it('validateDoc strips a fence and lists missing headings', () => {
    expect(stripMarkdownFence('```markdown\n# T\n## A\n```')).toBe('# T\n## A');
    expect(validateDoc('```markdown\n# T\n\n## A\n```', ['A'])).toMatchObject({ ok: true, content: '# T\n\n## A' });
    expect(validateDoc('# T\n## A', ['A', 'B']).missing).toEqual(['## B']);
    expect(validateDoc('no title', []).missing).toEqual(['# <title>']);
  });

  it('validateTaskPlan checks the four rules', () => {
    const ok = plan();
    expect(validateTaskPlan(ok, ['FR-001', 'FR-002'])).toEqual([]);
    expect(validateTaskPlan(ok, ['FR-009'])[0]).toBe('FR-009 is not covered by any task.');
    expect(validateTaskPlan(ok, ['FR-001', 'FR-002'], { deferred: ['FR-002'] }).join(' ')).toContain('Deferred requirements must not be in any task: FR-002');
    expect(validateTaskPlan(ok, ['FR-001'], { nfrIds: ['NFR-001'] }).join(' ')).toContain('NFR-001 is not covered');
    const badNumber = plan();
    badNumber.tasks[2]!.number = 7;
    expect(validateTaskPlan(badNumber, []).join(' ')).toContain('1..n in order');
    const badDep = plan();
    badDep.tasks[1]!.dependsOn = [5];
    expect(validateTaskPlan(badDep, []).join(' ')).toContain('not a lower task number');
    const badSlug = plan();
    badSlug.tasks[0]!.slug = 'setup';
    badSlug.tasks[7]!.slug = 'end';
    const msg = validateTaskPlan(badSlug, []).join(' ');
    expect(msg).toContain('project-setup');
    expect(msg).toContain('documentation-and-final-polish');
  });

  it('the mock task plan satisfies the schema and rules', async () => {
    const res = await createMockClient().complete({ tag: 'task-plan', model: 'reasoning', system: '', user: '' });
    expect(validateTaskPlan(JSON.parse(res.text), ['FR-001', 'FR-002'], { nfrIds: ['NFR-001', 'NFR-002'] })).toEqual([]);
  });
});

describe('forgiving headings', () => {
  it('accepts case, trailing colons and ### level, and still reports truly missing headings', () => {
    const md = '# T\n\n## acceptance criteria:\n\n### Open Questions\n';
    expect(validateDoc(md, ['Acceptance Criteria', 'Open questions']).ok).toBe(true);
    expect(validateDoc(md, ['Acceptance Criteria', 'Risks']).missing).toEqual(['## Risks']);
    expect(validateDoc('# T\n## 1. Summary\n', ['Summary']).ok).toBe(true);
  });
});
