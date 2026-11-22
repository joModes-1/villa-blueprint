export interface PackFileSpec {
  path: string; // path inside the zip, e.g. "docs/09-database-design.md"
  title: string;
  writer: 'ai' | 'code';
  model?: 'reasoning' | 'fast'; // required when writer = 'ai'
  after: string[]; // paths that must be done before this one starts (DAG)
  keys: string[] | 'all'; // ledger keys (or `prefix.*` patterns) whose change makes this file stale
  context: string[]; // earlier generated paths included in the prompt / the stale hash
  guide?: string; // file under assets/forward-build/
  template?: string; // file under assets/templates/
  headings?: string[]; // required "## " headings, checked by gate G01
  formatRules?: string; // extra rule appended to the system prompt (rule 9)
}

export const INDEX_PATH = 'docs/00-index.md';
export const SRS_PATH = 'docs/03-cleaned-srs.md';
export const TASK_PLAN_PATH = 'internal/task-plan.json';
export const MATRIX_PATH = 'docs/04-requirements-matrix.md';
export const NFR_PATH = 'docs/05-non-functional-requirements.md';
export const DOMAIN_PATH = 'docs/06-domain-model-and-glossary.md';
export const DB_PATH = 'docs/09-database-design.md';
export const API_PATH = 'docs/10-api-specification.md';
export const UI_PATH = 'docs/11-ui-ux-specification.md';
export const OPEN_QUESTIONS_PATH = 'docs/23-open-questions-and-assumptions.md';
export const TRACE_PATH = 'docs/24-traceability-matrix.md';
export const TASKS_INDEX_PATH = 'docs/build/TASKS_INDEX.md';
export const PROJECT_CONTEXT_PATH = 'docs/build/PROJECT_CONTEXT.md';
export const IMPLEMENTATION_RULES_PATH = 'docs/build/IMPLEMENTATION_RULES.md';
export const AGENTS_PATH = 'AGENTS.md';
export const CLAUDE_PATH = 'CLAUDE.md';
export const START_HERE_PATH = 'START-HERE.md';

/** Numeric prefix of a `docs/NN-*.md` path -> full path (used to expand the abbreviations in docs/29). */
const D: Record<string, string> = {
  '01': 'docs/01-executive-summary.md',
  '02': 'docs/02-product-requirements-document.md',
  '03': SRS_PATH,
  '04': MATRIX_PATH,
  '05': NFR_PATH,
  '06': DOMAIN_PATH,
  '07': 'docs/07-system-architecture.md',
  '08': 'docs/08-technology-stack-and-adrs.md',
  '09': DB_PATH,
  '10': API_PATH,
  '11': UI_PATH,
  '12': 'docs/12-authentication-authorization-and-permissions.md',
  '13': 'docs/13-security-requirements-and-threat-model.md',
  '14': 'docs/14-implementation-plan.md',
  '15': 'docs/15-task-breakdown.md',
  '16': 'docs/16-test-plan-and-quality-strategy.md',
  '17': 'docs/17-devops-deployment-and-operations.md',
  '18': 'docs/18-observability-logging-and-monitoring.md',
  '19': 'docs/19-coding-standards.md',
  '20': 'docs/20-risk-register.md',
  '21': 'docs/21-acceptance-criteria.md',
  '22': 'docs/22-readme-draft.md',
  '23': OPEN_QUESTIONS_PATH,
  '24': TRACE_PATH,
  '25': 'docs/25-repository-structure.md',
  '26': 'docs/26-production-readiness-runbook.md',
  TP: TASK_PLAN_PATH,
};

const GUIDES: Record<string, string> = {
  '02': '02-product-layer-guide.md',
  '03': '03-requirements-layer-guide.md',
  '04': '04-architecture-layer-guide.md',
  '05': '05-domain-data-layer-guide.md',
  '06': '06-build-layer-guide.md',
  '07': '07-operations-layer-guide.md',
  '08': '08-ai-handoff-guide.md',
};

function templateFor(path: string): string | undefined {
  if (path === PROJECT_CONTEXT_PATH) return 'codex-handoff/CODEX_PROJECT_CONTEXT.md';
  if (path === IMPLEMENTATION_RULES_PATH) return 'codex-handoff/CODEX_IMPLEMENTATION_RULES.md';
  if (path.startsWith('docs/')) return `project-docs/${path.slice('docs/'.length)}`;
  return undefined;
}

interface AiRow {
  id: string; // key into D, or a literal path
  title: string;
  model: 'reasoning' | 'fast';
  after: string[]; // abbreviations
  keys: string[] | 'all';
  guide: keyof typeof GUIDES;
  headings?: string[];
  formatRules?: string;
}

const AI_ROWS: AiRow[] = [
  { id: '01', title: 'Executive Summary', model: 'fast', after: [], keys: ['product.*', 'scope.*', 'users.personas', 'risk.top'], guide: '02', headings: ['Summary', 'Problem', 'Solution', 'Users', 'MVP Scope', 'Key Risks'] },
  { id: '02', title: 'Product Requirements Document', model: 'reasoning', after: ['01'], keys: ['product.*', 'scope.*', 'users.*', 'rules.business', 'flows.primary'], guide: '02', headings: ['Vision', 'Personas', 'User Stories', 'Workflows', 'Business Rules', 'MVP Scope', 'Deferred'] },
  { id: '20', title: 'Risk Register', model: 'fast', after: ['02'], keys: ['risk.top', 'scope.*', 'integrations.*', 'data.sensitivity'], guide: '02', headings: ['Risks'] },
  { id: '03', title: 'Cleaned Software Requirements Specification', model: 'reasoning', after: ['02'], keys: 'all', guide: '03', headings: ['Functional Requirements', 'Constraints'], formatRules: 'Under "Functional Requirements", one table `| ID | Requirement | Priority |` with IDs FR-001… and priority P0/P1/P2' },
  { id: '04', title: 'Requirements Matrix', model: 'fast', after: ['03'], keys: ['scope.*'], guide: '03', headings: ['Matrix'], formatRules: 'One table `| ID | Requirement | Priority | Status |` listing every FR ID from 03 exactly once, with the same wording and priority. Add no requirement that is not in 03. Status is "Deferred" when 03 marks it deferred, otherwise "Planned". No task numbers: the traceability document assigns tasks' },
  { id: '05', title: 'Non-Functional Requirements', model: 'fast', after: ['03'], keys: ['nfr.*', 'ops.*', 'ui.accessibility', 'security.compliance'], guide: '03', headings: ['Non-Functional Requirements'], formatRules: 'One table `| ID | Requirement | Target |` with IDs NFR-001…; every Target contains a number' },
  { id: '21', title: 'Acceptance Criteria', model: 'fast', after: ['03'], keys: ['rules.business', 'flows.primary'], guide: '03', headings: ['Acceptance Criteria'] },
  { id: '07', title: 'System Architecture', model: 'reasoning', after: ['03'], keys: ['architecture.style', 'stack.*', 'api.style', 'integrations.*', 'ops.hosting'], guide: '04', headings: ['Components', 'Data Flow', 'Integrations', 'Deployment View'] },
  { id: '08', title: 'Technology Stack and ADRs', model: 'reasoning', after: ['07'], keys: ['stack.*', 'architecture.style', 'api.style', 'auth.method', 'ops.*', 'testing.strategy'], guide: '04', headings: ['Stack', 'ADRs'] },
  { id: '12', title: 'Authentication, Authorization and Permissions', model: 'reasoning', after: ['07'], keys: ['auth.*', 'rbac.model', 'users.roles', 'users.multi_tenant'], guide: '04', headings: ['Authentication', 'Roles', 'Permission Matrix'] },
  { id: '13', title: 'Security Requirements and Threat Model', model: 'reasoning', after: ['12'], keys: ['security.*', 'data.sensitivity', 'auth.*', 'integrations.payments'], guide: '04', headings: ['Threats', 'Controls'] },
  { id: '06', title: 'Domain Model and Glossary', model: 'reasoning', after: ['03'], keys: ['data.entities', 'data.lifecycles', 'rules.business'], guide: '05', headings: ['Entities', 'State Machines', 'Glossary'], formatRules: 'Under "Entities", one table `| Entity | Description | Key fields |`' },
  { id: '09', title: 'Database Design', model: 'reasoning', after: ['06', '08'], keys: ['data.*', 'stack.database', 'users.multi_tenant'], guide: '05', headings: ['Schema Overview', 'Important Columns', 'Indexes'], formatRules: 'Under "Schema Overview", one table `| Table | Purpose | Key notes |` whose first column is the exact table name' },
  { id: '10', title: 'API Specification', model: 'reasoning', after: ['09', '12'], keys: ['api.style', 'rbac.model', 'flows.primary'], guide: '05', headings: ['API Design Principles', 'Endpoints', 'Error Format'], formatRules: 'Under "Endpoints", one table `| Method | Path | Purpose | Access |`; Access is never empty' },
  { id: '11', title: 'UI/UX Specification', model: 'fast', after: ['10'], keys: ['ui.*', 'flows.primary', 'users.personas'], guide: '05', headings: ['Screens', 'States', 'Design System'], formatRules: 'Under "Screens", one table `| Screen | Route | Purpose | Key states |`' },
  { id: 'TP', title: 'Task Plan', model: 'reasoning', after: ['05', '10', '11', '13'], keys: 'all', guide: '06' },
  { id: '14', title: 'Implementation Plan', model: 'fast', after: ['TP'], keys: ['timeline.target'], guide: '06', headings: ['Phases', 'Build Order'] },
  { id: '16', title: 'Test Plan and Quality Strategy', model: 'fast', after: ['TP'], keys: ['testing.strategy', 'nfr.*'], guide: '06', headings: ['Test Layers', 'Critical Flows', 'Coverage'] },
  { id: '19', title: 'Coding Standards', model: 'fast', after: ['08'], keys: ['stack.*', 'api.style'], guide: '06', headings: ['Standards'] },
  { id: '25', title: 'Repository Structure', model: 'fast', after: ['08'], keys: ['stack.*', 'architecture.style'], guide: '06', headings: ['Tree'] },
  { id: '17', title: 'DevOps, Deployment and Operations', model: 'fast', after: ['08'], keys: ['ops.*', 'data.retention'], guide: '07', headings: ['Environments', 'Environment Variables', 'Deployment', 'Backups'] },
  { id: '18', title: 'Observability, Logging and Monitoring', model: 'fast', after: ['17'], keys: ['ops.observability', 'nfr.*'], guide: '07', headings: ['Logging', 'Metrics', 'Alerts'] },
  { id: '22', title: 'README Draft', model: 'fast', after: ['17', '25'], keys: ['product.one_liner', 'stack.*'], guide: '07', headings: ['Setup', 'Commands'] },
  { id: '26', title: 'Production Readiness Runbook', model: 'fast', after: ['17', '18'], keys: ['ops.*', 'data.retention'], guide: '07', headings: ['Go-Live Checklist', 'Rollback'] },
  { id: PROJECT_CONTEXT_PATH, title: 'Project Context', model: 'fast', after: ['10', '11'], keys: 'all', guide: '08' },
  { id: IMPLEMENTATION_RULES_PATH, title: 'Implementation Rules', model: 'fast', after: ['08', '13', '19'], keys: ['stack.*', 'security.*', 'testing.strategy'], guide: '08' },
];

const full = (abbr: string): string => D[abbr] ?? abbr;

function docNumber(path: string): number | null {
  const m = /^docs\/(\d{2})-/.exec(path);
  return m?.[1] ? Number(m[1]) : null;
}

function buildAi(): PackFileSpec[] {
  const base = AI_ROWS.map((r) => {
    const path = full(r.id);
    const spec: PackFileSpec = {
      path,
      title: r.title,
      writer: 'ai',
      model: r.model,
      after: r.after.map(full),
      keys: r.keys,
      context: r.after.map(full),
      guide: GUIDES[r.guide],
      ...(r.headings ? { headings: r.headings } : {}),
      ...(r.formatRules ? { formatRules: r.formatRules } : {}),
    };
    const template = templateFor(path);
    if (template) spec.template = template;
    return spec;
  });
  // Files at or after 07 also see the cleaned SRS, provided it is one of their ancestors.
  const byPath = new Map(base.map((s) => [s.path, s]));
  const ancestors = (path: string, seen = new Set<string>()): Set<string> => {
    for (const a of byPath.get(path)?.after ?? []) {
      if (!seen.has(a)) {
        seen.add(a);
        ancestors(a, seen);
      }
    }
    return seen;
  };
  for (const s of base) {
    const n = docNumber(s.path);
    const isLate = (n !== null && n >= 7) || s.path.startsWith('docs/build/');
    if (isLate && !s.context.includes(SRS_PATH) && ancestors(s.path).has(SRS_PATH)) {
      s.context = [SRS_PATH, ...s.context];
    }
  }
  return base;
}

const CODE_ROWS: PackFileSpec[] = [
  { path: INDEX_PATH, title: 'Documentation Index', writer: 'code', after: [], keys: 'all', context: [] },
  { path: OPEN_QUESTIONS_PATH, title: 'Open Questions and Assumptions', writer: 'code', after: [], keys: 'all', context: [] },
  { path: D['15'] as string, title: 'Task Breakdown', writer: 'code', after: [TASK_PLAN_PATH], keys: 'all', context: [TASK_PLAN_PATH] },
  { path: TRACE_PATH, title: 'Traceability Matrix', writer: 'code', after: [TASK_PLAN_PATH, SRS_PATH, NFR_PATH, D['16'] as string], keys: 'all', context: [TASK_PLAN_PATH, SRS_PATH, NFR_PATH, D['16'] as string] },
  { path: TASKS_INDEX_PATH, title: 'Tasks Index', writer: 'code', after: [TASK_PLAN_PATH], keys: 'all', context: [TASK_PLAN_PATH] },
  { path: AGENTS_PATH, title: 'AGENTS.md', writer: 'code', after: [IMPLEMENTATION_RULES_PATH, TASK_PLAN_PATH], keys: 'all', context: [IMPLEMENTATION_RULES_PATH, TASK_PLAN_PATH] },
  { path: CLAUDE_PATH, title: 'CLAUDE.md', writer: 'code', after: [AGENTS_PATH], keys: [], context: [AGENTS_PATH] },
  { path: START_HERE_PATH, title: 'START-HERE.md', writer: 'code', after: [AGENTS_PATH], keys: 'all', context: [AGENTS_PATH, TASK_PLAN_PATH] },
];

/** Every file Blueprint generates, except the per-task files that are added after the task plan exists. */
export const PACK_SPEC: PackFileSpec[] = [...CODE_ROWS.slice(0, 2), ...buildAi(), ...CODE_ROWS.slice(2)];

export interface TaskFileInfo {
  number: number;
  slug: string;
  title: string;
}

export function taskFilePath(n: number, slug: string): string {
  return `docs/build/tasks/task-${String(n).padStart(3, '0')}-${slug}.md`;
}

/** Spec for one task file, which is rendered by code once internal/task-plan.json is done. */
export function taskFileSpec(task: TaskFileInfo): PackFileSpec {
  return {
    path: taskFilePath(task.number, task.slug),
    title: `Task ${String(task.number).padStart(3, '0')}: ${task.title}`,
    writer: 'code',
    after: [TASK_PLAN_PATH],
    keys: 'all',
    context: [TASK_PLAN_PATH],
  };
}

export function specByPath(spec: PackFileSpec[] = PACK_SPEC): Map<string, PackFileSpec> {
  return new Map(spec.map((s) => [s.path, s]));
}

/** Paths whose content is exported (everything except `internal/`). */
export function isExportPath(path: string): boolean {
  return !path.startsWith('internal/');
}

/** Spec for a task file known only by its path (used when recomputing hashes from stored documents). */
export function taskFileSpecFromPath(path: string): PackFileSpec {
  return { path, title: path, writer: 'code', after: [TASK_PLAN_PATH], keys: 'all', context: [TASK_PLAN_PATH] };
}

/** PACK_SPEC plus a spec for every task-file path in `paths`. */
export function specWithTaskFiles(paths: string[]): PackFileSpec[] {
  const known = new Set(PACK_SPEC.map((s) => s.path));
  return [...PACK_SPEC, ...paths.filter((p) => p.startsWith('docs/build/tasks/') && !known.has(p)).map(taskFileSpecFromPath)];
}
