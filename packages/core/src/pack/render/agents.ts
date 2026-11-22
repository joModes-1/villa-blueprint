import type { LedgerRow } from '../../ledger/table';
import type { TaskPlan } from '../../pipeline/schemas';

const pad = (n: number): string => String(n).padStart(3, '0');

function value(ledger: LedgerRow[], key: string, fallback: string): string {
  const v = ledger.find((r) => r.key === key)?.value.trim();
  return v ? v : fallback;
}

/** AGENTS.md, modelled on this pack's own AGENTS.md. */
export function renderAgents(ledger: LedgerRow[], plan: TaskPlan, projectName: string): string {
  const last = plan.tasks.length;
  return [
    `# AGENTS.md — ${projectName}`,
    '',
    '## Project Overview',
    '',
    `Build **${projectName}** exactly as specified in \`docs/\` and \`docs/build/\`: ${value(ledger, 'product.one_liner', projectName)} **This folder is the repository root: build in place.** Work through \`docs/build/tasks/\` in order, task-001 to task-${pad(last)}. Make small, verified changes.`,
    '',
    'Authority order when two sources seem to disagree:',
    '1. The decision table in `docs/00-index.md`',
    '2. The architecture, database and API documents (`docs/07`–`docs/13`)',
    '3. The task file',
    '4. Everything else',
    '',
    'If you find a real conflict, follow the higher source and mention the conflict in your task report.',
    '',
    '## Run Commands',
    '',
    `The exact install, lint, typecheck, test, build and start commands are listed in \`docs/17-devops-deployment-and-operations.md\`. The agreed stack: ${value(ledger, 'stack.frontend', 'see docs/08')}; ${value(ledger, 'stack.backend', 'see docs/08')}; ${value(ledger, 'stack.database', 'see docs/08')}. Hosting: ${value(ledger, 'ops.hosting', 'see docs/17')}.`,
    '',
    '## Coding and Architecture Rules',
    '',
    `- Architecture: ${value(ledger, 'architecture.style', 'as in docs/07')}.`,
    `- API style: ${value(ledger, 'api.style', 'as in docs/10')}. Use the API document exactly: paths, bodies, error codes.`,
    '- Follow `docs/19-coding-standards.md` and the folder layout in `docs/25-repository-structure.md`.',
    '- Use the database design in `docs/09-database-design.md` verbatim.',
    '- Follow `docs/11-ui-ux-specification.md` for every screen and state.',
    '',
    '## Security Rules',
    '',
    `- Authentication: ${value(ledger, 'auth.method', 'as in docs/12')}.`,
    `- Permissions: ${value(ledger, 'rbac.model', 'as in docs/12')}.`,
    '- Do not hardcode secrets. Never log passwords, tokens, cookies or personal data.',
    '- Validate every input on the server. Follow `docs/13-security-requirements-and-threat-model.md`.',
    '- Do not add dependencies beyond the stack document without stating why in the report.',
    '',
    '## Testing Rules',
    '',
    `- ${value(ledger, 'testing.strategy', 'Write tests alongside the code, in the same task.')}`,
    '- Write tests alongside the code, in the same task.',
    '- A task is not done while any check fails, unless the failure is pre-existing and documented.',
    '',
    '## Stop Conditions',
    '',
    'Stop and report — do not guess — if:',
    '- a required tool or service is missing',
    '- a check fails for a reason outside the task',
    '- following the documents would break security, data integrity or the API contract',
    '',
    'For anything else that is unspecified, choose the smallest conventional option consistent with the documents, and list it under "Assumptions" in your report.',
    '',
    '## Definition of Done (per task)',
    '',
    "1. The task's acceptance criteria are met.",
    '2. The lint, typecheck, test and build commands pass.',
    '3. No unrelated rewrites.',
    '4. The report contains: what changed, files, tests run with results, assumptions, and blockers.',
    "5. The task's row in `docs/build/TASKS_INDEX.md` has its Status set to `Done`.",
    '',
  ].join('\n');
}

export function renderClaude(): string {
  return 'Read and follow `AGENTS.md`. Start with `START-HERE.md`.\n';
}

/** Groups the tasks into 2–3 per prompt, at most 8 prompts. */
export function groupTasks(plan: TaskPlan): number[][] {
  const numbers = plan.tasks.map((t) => t.number);
  const size = Math.max(2, Math.ceil(numbers.length / 8));
  const groups: number[][] = [];
  for (let i = 0; i < numbers.length; i += size) groups.push(numbers.slice(i, i + size));
  if (groups.length > 1 && (groups[groups.length - 1]?.length ?? 0) === 1 && (groups[groups.length - 2]?.length ?? 0) < 3) {
    const lastGroup = groups.pop() as number[];
    (groups[groups.length - 1] as number[]).push(...lastGroup);
  }
  return groups;
}

function taskList(nums: number[]): string {
  const names = nums.map((n) => `task-${pad(n)}`);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** START-HERE.md, modelled on this pack's own START-HERE.md. */
export function renderStartHere(ledger: LedgerRow[], plan: TaskPlan, projectName: string): string {
  const groups = groupTasks(plan);
  const byNumber = new Map(plan.tasks.map((t) => [t.number, t]));
  const prompts = groups.map((g, i) => {
    const heading = `### Prompt ${i + 1} — ${g.map((n) => byNumber.get(n)?.title ?? `Task ${n}`).join(' and ')}`;
    const body =
      i === 0
        ? `Read START-HERE.md and AGENTS.md, then docs/00-index.md. Implement docs/build/tasks/${taskList(g)} in order, reading the docs each task lists. After each task, run its verification commands and fix until they pass, set its Status to Done in docs/build/TASKS_INDEX.md, and give the task report described in AGENTS.md. Never start a task while the previous one has failing checks. Do not ask me questions unless a stop condition in AGENTS.md applies.`
        : `Continue with ${taskList(g)}, under the same rules.${i === groups.length - 1 ? ' Finish with the final report: the acceptance criteria table, all assumptions and known limitations.' : ''}`;
    return `${heading}\n\`\`\`text\n${body}\n\`\`\``;
  });
  return [
    `# START HERE — ${projectName}`,
    '',
    `This folder is a complete, build-ready pack for **${projectName}**: ${value(ledger, 'product.one_liner', projectName)} Hand it to a coding agent (Claude Code or Codex) with the prompts below. The agent builds the whole product in this folder, which is the repository root.`,
    '',
    '## Before you start',
    '',
    '| Need | Check |',
    '|---|---|',
    `| Stack | ${value(ledger, 'stack.frontend', 'see docs/08')}; ${value(ledger, 'stack.backend', 'see docs/08')}; ${value(ledger, 'stack.database', 'see docs/08')} |`,
    '| A capable coding agent | Claude Code or Codex with a top model, in auto/approve-all mode for this folder |',
    '| Environment | The tools and variables listed in `docs/17-devops-deployment-and-operations.md` |',
    '',
    'Open a terminal **in this folder** and start your agent there.',
    '',
    '## What the agent reads',
    '',
    '`AGENTS.md` (rules) → `docs/00-index.md` (every decision) → the current task in `docs/build/tasks/`. Nothing outside this folder is needed.',
    '',
    '## The prompts',
    '',
    'Paste them one at a time. Wait for each to finish with all checks green before sending the next one.',
    '',
    prompts.join('\n\n'),
    '',
    '### If the agent stops early or a session ends',
    '```text',
    'Continue from the first task in docs/build/TASKS_INDEX.md whose Status is not Done. Same rules as before: verify, fix until green, mark Done, report.',
    '```',
    '',
    '### Final audit (optional, recommended)',
    '```text',
    'Audit this repository against docs/21-acceptance-criteria.md and docs/03-cleaned-srs.md. For every acceptance criterion and requirement, name the test that proves it and run it. Fix anything missing or failing, then rerun the full lint, typecheck, test and build commands and report the results.',
    '```',
    '',
    '## Folder map',
    '',
    '| Path | What it is |',
    '|---|---|',
    '| `START-HERE.md` | This file |',
    '| `AGENTS.md`, `CLAUDE.md` | Rules for the coding agent |',
    '| `docs/` | The documentation pack, from `00-index.md` to `26-production-readiness-runbook.md` |',
    '| `docs/build/` | Project context, implementation rules, the task index and one file per task |',
    '',
  ].join('\n');
}
