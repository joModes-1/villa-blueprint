import { catalogByKey, LEDGER_CATALOG } from '../ledger/catalog';
import type { LedgerRow } from '../ledger/table';
import { findVendorMentions, unapprovedVendors } from '../ledger/vendors';
import { extractRequirements } from '../pipeline/requirements';
import {
  API_PATH,
  DB_PATH,
  DOMAIN_PATH,
  INDEX_PATH,
  isExportPath,
  MATRIX_PATH,
  NFR_PATH,
  OPEN_QUESTIONS_PATH,
  PACK_SPEC,
  SRS_PATH,
  TASKS_INDEX_PATH,
  TRACE_PATH,
  taskFilePath,
} from '../pack/spec';
import type { TaskPlan } from '../pipeline/schemas';
import { findSection, hasHeading, parseTables, stripCodeBlocks } from './markdown';

export interface QuestionRow {
  key: string;
  prompt?: string;
  status: 'open' | 'answered' | 'skipped';
}

export interface GateInput {
  docs: Map<string, string>;
  ledger: LedgerRow[];
  questions: QuestionRow[];
  plan: TaskPlan;
}

export interface Finding {
  rule: string;
  severity: 'blocker' | 'warning';
  documentPath?: string;
  message: string;
}

export type GateRule = (input: GateInput) => Finding[];

const doc = (input: GateInput, path: string): string => input.docs.get(path) ?? '';
const frIds = (md: string): string[] => [...new Set(md.match(/\bFR-\d{3}\b/g) ?? [])];

export const g01RequiredFiles: GateRule = (input) => {
  const out: Finding[] = [];
  const paths = [
    ...PACK_SPEC.filter((s) => isExportPath(s.path)).map((s) => s.path),
    ...input.plan.tasks.map((t) => taskFilePath(t.number, t.slug)),
  ];
  const headings = new Map(PACK_SPEC.map((s) => [s.path, s.headings ?? []]));
  for (const path of paths) {
    const content = input.docs.get(path);
    if (content === undefined) {
      out.push({ rule: 'G01', severity: 'blocker', documentPath: path, message: `Missing file ${path}` });
      continue;
    }
    // CLAUDE.md is a single line by design (docs/29), so it is exempt from the length floor.
    if (path.endsWith('.md') && path !== 'CLAUDE.md' && content.length < 300) {
      out.push({ rule: 'G01', severity: 'blocker', documentPath: path, message: `${path} is too short` });
    }
    for (const h of headings.get(path) ?? []) {
      if (!hasHeading(content, h)) {
        out.push({ rule: 'G01', severity: 'blocker', documentPath: path, message: `${path} is missing heading "${h}"` });
      }
    }
  }
  return out;
};

export const g02RequirementsTraced: GateRule = (input) => {
  const srs = doc(input, SRS_PATH);
  const ids = frIds(srs);
  if (ids.length === 0) {
    return [{ rule: 'G02', severity: 'blocker', documentPath: SRS_PATH, message: 'No FR-### requirement IDs found in the cleaned SRS' }];
  }
  const out: Finding[] = [];
  const matrix = doc(input, MATRIX_PATH);
  const trace = doc(input, TRACE_PATH);
  const planned = new Set(input.plan.tasks.flatMap((t) => t.requirementIds));
  const deferred = new Set(extractRequirements(srs, 'FR').filter((r) => r.deferred).map((r) => r.id));
  for (const id of ids) {
    if (!matrix.includes(id)) out.push({ rule: 'G02', severity: 'blocker', documentPath: MATRIX_PATH, message: `${id} is not in the requirements matrix` });
    if (!trace.includes(id)) out.push({ rule: 'G02', severity: 'blocker', documentPath: TRACE_PATH, message: `${id} is not in the traceability matrix` });
    if (!planned.has(id) && !deferred.has(id)) {
      out.push({ rule: 'G02', severity: 'blocker', documentPath: 'internal/task-plan.json', message: `${id} is not covered by any task` });
    }
  }
  for (const r of extractRequirements(doc(input, NFR_PATH), 'NFR')) {
    if (!planned.has(r.id)) {
      out.push({ rule: 'G02', severity: 'warning', documentPath: 'internal/task-plan.json', message: `${r.id} is not attached to any task` });
    }
  }
  return out;
};

export const g03NfrMeasurable: GateRule = (input) => {
  const out: Finding[] = [];
  for (const row of parseTables(doc(input, NFR_PATH))) {
    const id = row.join(' ').match(/\bNFR-\d{3}\b/)?.[0];
    if (!id) continue;
    const rest = row.join(' ').replace(/\bNFR-\d{3}\b/g, '');
    if (!/\d/.test(rest)) out.push({ rule: 'G03', severity: 'blocker', documentPath: NFR_PATH, message: `${id} has no measurable target` });
  }
  return out;
};

const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

export const g04EndpointsProtected: GateRule = (input) => {
  const out: Finding[] = [];
  for (const row of parseTables(doc(input, API_PATH))) {
    if (!METHODS.has((row[0] ?? '').toUpperCase())) continue;
    if ((row[row.length - 1] ?? '').trim() === '') {
      out.push({ rule: 'G04', severity: 'blocker', documentPath: API_PATH, message: `Endpoint "${row.slice(0, 2).join(' ')}" has no access rule` });
    }
  }
  return out;
};

export const g05SchemaMatchesDomain: GateRule = (input) => {
  const text = `${doc(input, DOMAIN_PATH)}\n${doc(input, API_PATH)}`.toLowerCase();
  const out: Finding[] = [];
  const overview = findSection(doc(input, DB_PATH), 'Schema Overview');
  for (const row of parseTables(overview)) {
    const name = (row[0] ?? '').replace(/`/g, '').trim();
    if (!name) continue;
    const lower = name.toLowerCase();
    const bases = new Set([lower, lower.replace(/(es|s)$/, ''), `${lower}s`, `${lower}es`]);
    if (![...bases].some((b) => b.length > 0 && text.includes(b))) {
      out.push({ rule: 'G05', severity: 'warning', documentPath: DB_PATH, message: `Table "${name}" is not described in the domain model or API` });
    }
  }
  return out;
};

export const g06TaskGraph: GateRule = (input) => {
  const out: Finding[] = [];
  const index = doc(input, TASKS_INDEX_PATH);
  const inIndex = new Set(
    parseTables(index)
      .map((r) => /task-(\d{3})-/.exec(r[1] ?? '')?.[1])
      .filter((n): n is string => !!n)
      .map(Number),
  );
  const planned = new Set(input.plan.tasks.map((t) => t.number));
  for (const n of planned) if (!inIndex.has(n)) out.push({ rule: 'G06', severity: 'blocker', documentPath: TASKS_INDEX_PATH, message: `Task ${n} is missing from TASKS_INDEX.md` });
  for (const n of inIndex) if (!planned.has(n)) out.push({ rule: 'G06', severity: 'blocker', documentPath: TASKS_INDEX_PATH, message: `Task ${n} in TASKS_INDEX.md has no task file` });
  for (const t of input.plan.tasks) {
    for (const d of t.dependsOn) {
      if (!planned.has(d) || d >= t.number) {
        out.push({ rule: 'G06', severity: 'blocker', documentPath: 'internal/task-plan.json', message: `Task ${t.number} depends on ${d}, which is not an existing lower task` });
      }
    }
  }
  // Cycle check (cannot happen when every dependency is lower, but a malformed plan is reported once).
  const deps = new Map(input.plan.tasks.map((t) => [t.number, t.dependsOn]));
  const state = new Map<number, 1 | 2>();
  const visit = (n: number): boolean => {
    if (state.get(n) === 2) return false;
    if (state.get(n) === 1) return true;
    state.set(n, 1);
    for (const d of deps.get(n) ?? []) if (deps.has(d) && visit(d)) return true;
    state.set(n, 2);
    return false;
  };
  if ([...deps.keys()].some((n) => visit(n))) {
    out.push({ rule: 'G06', severity: 'blocker', documentPath: 'internal/task-plan.json', message: 'The task dependency graph has a cycle' });
  }
  return out;
};

export const g07LedgerComplete: GateRule = (input) => {
  const out: Finding[] = [];
  const byKey = new Map(input.ledger.map((r) => [r.key, r]));
  const assumptions = findSection(doc(input, OPEN_QUESTIONS_PATH), 'Assumptions');
  const assumedKeys = new Set(parseTables(assumptions).map((r) => r[0]));
  for (const spec of LEDGER_CATALOG) {
    const row = byKey.get(spec.key);
    if (spec.priority === 'P0' && (!row || row.value.trim() === '')) {
      out.push({ rule: 'G07', severity: 'blocker', message: `P0 decision "${spec.area}" is missing` });
    }
    if (row?.status === 'assumed' && !assumedKeys.has(spec.key)) {
      out.push({ rule: 'G07', severity: 'blocker', documentPath: OPEN_QUESTIONS_PATH, message: `Assumed decision "${spec.area}" is not listed in the open questions document` });
    }
  }
  return out;
};

export const g08IndexCoversLedger: GateRule = (input) => {
  const areas = new Set(parseTables(doc(input, INDEX_PATH)).map((r) => r[0]));
  const out: Finding[] = [];
  for (const r of input.ledger) {
    if (r.status === 'deferred' || r.value.trim() === '') continue;
    const area = catalogByKey(r.key)?.area;
    if (area && !areas.has(area)) out.push({ rule: 'G08', severity: 'blocker', documentPath: INDEX_PATH, message: `"${area}" is missing from 00-index` });
  }
  return out;
};

const PLACEHOLDER = /\b(TODO|TBD|FIXME|lorem ipsum)\b|\[insert/i;

export const g09NoPlaceholders: GateRule = (input) => {
  const out: Finding[] = [];
  for (const [path, content] of input.docs) {
    if (!isExportPath(path)) continue;
    const m = PLACEHOLDER.exec(stripCodeBlocks(content));
    if (m) out.push({ rule: 'G09', severity: 'blocker', documentPath: path, message: `${path} contains a placeholder: "${m[0]}"` });
  }
  return out;
};

export const g10SelfContained: GateRule = (input) => {
  const out: Finding[] = [];
  const integrations = input.ledger
    .filter((r) => r.key.startsWith('integrations.'))
    .map((r) => r.value.toLowerCase())
    .join(' ');
  for (const [path, content] of input.docs) {
    if (!isExportPath(path)) continue;
    const seen = new Set<string>();
    for (const m of content.matchAll(/https?:\/\/([A-Za-z0-9.-]+)[^\s)>\]"'`]*/g)) {
      const host = (m[1] ?? '').toLowerCase().replace(/\.$/, '');
      const ok =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === 'example.com' ||
        host.endsWith('.example.com') ||
        (host !== '' && integrations.includes(host));
      if (!ok && !seen.has(m[0])) {
        seen.add(m[0]);
        out.push({ rule: 'G10', severity: 'warning', documentPath: path, message: `${path} links outside the pack: ${m[0]}` });
      }
    }
  }
  return out;
};

/** G12: a provider the founder did not choose (Clerk, Stripe, Resend…) must not appear in the pack. */
export const g12UnapprovedVendors: GateRule = (input) => {
  const banned = unapprovedVendors(input.ledger);
  const out: Finding[] = [];
  for (const [path, content] of input.docs) {
    if (!isExportPath(path)) continue;
    for (const hit of findVendorMentions(content, banned)) {
      out.push({
        rule: 'G12',
        severity: 'blocker',
        documentPath: path,
        message: `${path} uses ${hit.vendor.name}, which is not in the decision ledger. Choose it in the ledger or remove it — "${hit.line}"`,
      });
    }
  }
  return out;
};

export const DETERMINISTIC_RULES: GateRule[] = [
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
  g12UnapprovedVendors,
];
