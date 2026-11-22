import { catalogByKey, LEDGER_CATALOG } from '../../ledger/catalog';
import { cell, inCatalogOrder, type LedgerRow } from '../../ledger/table';
import { extractRequirements, type Requirement } from '../../pipeline/requirements';
import type { TaskPlan } from '../../pipeline/schemas';
import { INDEX_PATH, PACK_SPEC, TRACE_PATH, isExportPath, taskFilePath } from '../spec';

export interface QuestionLite {
  key: string;
  prompt: string;
  status: 'open' | 'answered' | 'skipped';
}

const taskName = (n: number): string => `task-${String(n).padStart(3, '0')}`;

function table(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.join(' | ')} |`,
    `|${headers.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`),
  ].join('\n');
}

function valueOf(ledger: LedgerRow[], key: string): string {
  return ledger.find((r) => r.key === key)?.value.trim() ?? '';
}

/** docs/00-index.md: the decision table (confirmed and assumed rows) and the documentation map. */
export function renderIndex(ledger: LedgerRow[], projectName: string): string {
  const rows = inCatalogOrder(ledger).filter((r) => r.status !== 'deferred' && r.value.trim() !== '');
  const decisionRows = rows.map((r) => [
    catalogByKey(r.key)?.area ?? r.key,
    r.status === 'assumed' ? `${r.value.trim()} *(assumed)*` : r.value.trim(),
  ]);
  const map = PACK_SPEC.filter((s) => isExportPath(s.path) && s.path.startsWith('docs/') && s.path !== INDEX_PATH).map((s) => [
    s.path.slice('docs/'.length),
    s.title,
  ]);
  const oneLiner = valueOf(ledger, 'product.one_liner') || projectName;
  return [
    `# Documentation Index — ${projectName}`,
    '',
    oneLiner,
    '',
    'This folder is a build-ready documentation pack. Every row below is a final decision. An implementing agent must not re-decide any of them. If a row seems to conflict with another document, this table wins.',
    '',
    '## Confirmed Decisions',
    '',
    table(['Area', 'Confirmed decision'], decisionRows),
    '',
    '## Documentation Map',
    '',
    table(['File', 'Purpose'], map),
    '',
    '## Reading Order for an Implementing Agent',
    '',
    '`START-HERE.md` → `AGENTS.md` → this file → the current task file in `docs/build/tasks/`.',
    '',
  ].join('\n');
}

/** docs/23: Assumptions, Deferred and Unanswered questions. */
export function renderOpenQuestions(ledger: LedgerRow[], questions: QuestionLite[]): string {
  const ordered = inCatalogOrder(ledger);
  const area = (k: string): string => catalogByKey(k)?.area ?? k;
  const assumed = ordered.filter((r) => r.status === 'assumed');
  const deferred = ordered.filter((r) => r.status === 'deferred' && r.value.trim() !== '');
  const open = questions.filter((q) => q.status !== 'answered');
  const none = (text: string): string => `${text}\n`;
  return [
    '# Open Questions and Assumptions',
    '',
    'Decisions that were filled with a default rather than confirmed by a source or an answer are listed here, so that nothing is silently assumed. Review each one before relying on it.',
    '',
    '## Assumptions',
    '',
    assumed.length
      ? table(['Key', 'Area', 'Value', 'Rationale'], assumed.map((r) => [r.key, area(r.key), r.value, r.rationale ?? '']))
      : none('No decisions were assumed.'),
    '',
    '## Deferred',
    '',
    deferred.length
      ? table(['Key', 'Area', 'Value', 'Rationale'], deferred.map((r) => [r.key, area(r.key), r.value, r.rationale ?? '']))
      : none('Nothing was deferred.'),
    '',
    '## Unanswered questions',
    '',
    open.length
      ? table(['Key', 'Question', 'Status'], open.map((q) => [q.key, q.prompt, q.status]))
      : none('Every interview question was answered.'),
    '',
  ].join('\n');
}

export function renderTaskBreakdown(plan: TaskPlan): string {
  const rows = plan.tasks.map((t) => [
    String(t.number),
    `[${t.title}](build/tasks/${taskFilePath(t.number, t.slug).split('/').pop()})`,
    t.dependsOn.length ? t.dependsOn.map((d) => String(d)).join(', ') : '—',
    t.requirementIds.length ? t.requirementIds.join(', ') : '—',
  ]);
  return [
    '# Task Breakdown',
    '',
    `The build is split into ${plan.tasks.length} tasks that must be implemented in order. Each task ends with its checks green before the next one starts. The task files in \`docs/build/tasks/\` are the work orders; the other documents are the reference they point to.`,
    '',
    '## Tasks',
    '',
    table(['#', 'Task', 'Depends on', 'Requirement IDs'], rows),
    '',
  ].join('\n');
}

export function extractRequirementIds(markdown: string, prefix: 'FR' | 'NFR'): string[] {
  const re = new RegExp(`\\b${prefix}-\\d{3}\\b`, 'g');
  return [...new Set(markdown.match(re) ?? [])].sort();
}

export function renderTraceability(srs: string, nfr: string, plan: TaskPlan): string {
  const tasksFor = (r: Requirement): string => {
    const t = plan.tasks.filter((x) => x.requirementIds.includes(r.id)).map((x) => taskName(x.number));
    if (t.length) return t.join(', ');
    return r.deferred ? 'Deferred (not in MVP)' : '—';
  };
  const rows = [
    ...extractRequirements(srs, 'FR').map((r) => [r.id, r.text, 'docs/03-cleaned-srs.md', tasksFor(r)]),
    ...extractRequirements(nfr, 'NFR').map((r) => [r.id, r.text, 'docs/05-non-functional-requirements.md', tasksFor(r)]),
  ];
  return [
    '# Traceability Matrix',
    '',
    'Every functional and non-functional requirement is listed with its wording, the document it comes from and the tasks that implement it. A requirement with no task is a gap in the plan, unless it is deferred.',
    '',
    '## Matrix',
    '',
    table(['ID', 'Requirement', 'Source document', 'Tasks'], rows),
    '',
  ].join('\n');
}

export function renderTasksIndex(plan: TaskPlan): string {
  const rows = plan.tasks.map((t) => {
    const file = `${taskName(t.number)}-${t.slug}`;
    return [
      'Pending',
      `[${file}](tasks/${file}.md)`,
      t.dependsOn.length ? t.dependsOn.map((d) => taskName(d)).join(', ') : 'None',
      t.areas.length ? t.areas.join(', ') : 'see task file',
      t.goal,
      'The verification commands in the task file',
    ];
  });
  return [
    '# Tasks Index',
    '',
    table(['Status', 'Task', 'Depends on', 'Required docs', 'Expected output', 'Verification'], rows),
    '',
  ].join('\n');
}

export { LEDGER_CATALOG, TRACE_PATH };
