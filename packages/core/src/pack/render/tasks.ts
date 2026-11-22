import type { LedgerRow } from '../../ledger/table';
import type { PlanTask, TaskPlan } from '../../pipeline/schemas';

const pad = (n: number): string => String(n).padStart(3, '0');
const list = (items: string[]): string => items.map((i) => `- ${i}`).join('\n');
const numbered = (items: string[]): string => items.map((s, i) => `${i + 1}. ${s}`).join('\n');

function stackLine(ledger: LedgerRow[]): string {
  const keys = ['stack.frontend', 'stack.backend', 'stack.database', 'architecture.style'];
  const parts = keys
    .map((k) => ledger.find((r) => r.key === k))
    .filter((r): r is LedgerRow => !!r && r.value.trim() !== '')
    .map((r) => r.value.trim());
  return parts.length ? parts.join('; ') : 'the stack in docs/08-technology-stack-and-adrs.md';
}

/** One task file, with the sections of docs/29. */
export function renderTaskFile(task: PlanTask, ledger: LedgerRow[], plan: TaskPlan): string {
  const byNumber = new Map(plan.tasks.map((t) => [t.number, t]));
  const deps = task.dependsOn.map((d) => {
    const t = byNumber.get(d);
    return t ? `task-${pad(d)}-${t.slug}` : `task-${pad(d)}`;
  });
  return [
    `# Task ${pad(task.number)}: ${task.title}`,
    '',
    '## Goal',
    task.goal,
    '',
    '## Context',
    `Read \`AGENTS.md\`, \`docs/00-index.md\` and the documents that describe: ${task.areas.length ? task.areas.join(', ') : task.title}. The agreed stack is ${stackLine(ledger)}. Where two documents seem to disagree, the decision table in \`docs/00-index.md\` wins; report the conflict in your task report.`,
    '',
    '## Requirements Covered',
    task.requirementIds.length ? task.requirementIds.join(', ') : 'No functional requirement is owned by this task; it supports the tasks around it.',
    '',
    '## Dependencies',
    deps.length ? deps.join(', ') : 'None. This is the first task.',
    '',
    '## Files and Areas',
    list(task.areas.length ? task.areas : [task.title]),
    '',
    '## Steps',
    numbered(task.steps),
    '',
    '## Tests Required',
    list(task.tests),
    '',
    '## Acceptance Criteria',
    list(task.acceptance),
    '',
    '## Verification Commands',
    'Run the install, lint, typecheck, test and build commands listed under "Run Commands" in `AGENTS.md`. Every one must pass before this task is marked Done.',
    '',
    '## Stop Conditions',
    'Stop and report, without guessing, if a required tool or service is missing, if a check fails for a reason outside this task, or if following the documents would break security, data integrity or the API contract.',
    '',
  ].join('\n');
}
