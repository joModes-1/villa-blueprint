import { hasFounderDefault, LEDGER_CATALOG } from '../ledger/catalog';
import { PACK_SPEC, TASK_PLAN_PATH } from '../pack/spec';
import type { AiCall, AiClient, AiResult } from './types';

const CATEGORIES = [
  'business',
  'users',
  'scope',
  'technical',
  'security',
  'integrations',
  'data',
  'operations',
  'timeline',
  'risk',
] as const;

/** Marker that makes the mock `contradictions` call report a finding (used by tests). */
export const MOCK_CONTRADICTION_MARKER = 'MOCK_CONTRADICTION';

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
}

function mockExtract(user: string): unknown {
  const headerEnd = user.indexOf('\n', user.indexOf('SOURCE ('));
  const chunk = headerEnd >= 0 ? user.slice(headerEnd + 1) : user;
  const facts = sentences(chunk)
    .slice(0, 3)
    .map((s, i) => {
      const text = s.slice(0, 300);
      return {
        category: CATEGORIES[i % CATEGORIES.length],
        statement: text,
        quote: text,
        confidence: 'high' as const,
      };
    });
  return { facts };
}

function parseFacts(user: string): { id: string; category: string; statement: string }[] {
  const start = user.indexOf('FACTS (id | category | statement):');
  if (start < 0) return [];
  const rest = user.slice(start).split('\n').slice(1);
  const out: { id: string; category: string; statement: string }[] = [];
  for (const line of rest) {
    if (line.startsWith('Return ')) break;
    const parts = line.split(' | ');
    if (parts.length < 3) continue;
    out.push({ id: (parts[0] ?? '').trim(), category: (parts[1] ?? '').trim(), statement: parts.slice(2).join(' | ').trim() });
  }
  return out;
}

function mockAnalyze(user: string): unknown {
  const facts = parseFacts(user);
  const first = facts[0];
  const decisions = first
    ? [{ key: 'product.one_liner', value: first.statement.slice(0, 600), factIds: [first.id] }]
    : [];
  const decided = new Set(decisions.map((d) => d.key));
  const questions = LEDGER_CATALOG.filter((k) => k.priority === 'P0' && !decided.has(k.key)).map((k) => {
    const first = hasFounderDefault(k) ? k.founderDefault : `Example answer for ${k.area}`;
    return {
      key: k.key,
      prompt: k.question,
      why: `It decides how ${k.area.toLowerCase()} is specified.`,
      options: [first, `Alternative for ${k.area}`],
      recommended: first,
    };
  });
  return { decisions, questions };
}

const PAD =
  'This section follows the decision ledger and states each rule once, in concrete terms, so that an implementing agent can act on it without asking further questions. Names, limits and behaviours are written out in full and stay consistent with the other documents in the pack.';

function table(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `|${headers.map(() => '---').join('|')}|`;
  return [head, sep, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
}

function sectionBody(path: string, heading: string): string {
  switch (path) {
    case 'docs/03-cleaned-srs.md':
      if (heading === 'Functional Requirements') {
        return table(['ID', 'Requirement', 'Priority'], [
          ['FR-001', 'A signed-in user can create and view notes', 'P0'],
          ['FR-002', 'A signed-in user can edit and delete their own notes', 'P1'],
        ]);
      }
      break;
    case 'docs/04-requirements-matrix.md':
      return table(['ID', 'Requirement', 'Priority', 'Status'], [
        ['FR-001', 'A signed-in user can create and view notes', 'P0', 'Planned'],
        ['FR-002', 'A signed-in user can edit and delete their own notes', 'P1', 'Planned'],
      ]);
    case 'docs/05-non-functional-requirements.md':
      return table(['ID', 'Requirement', 'Target'], [
        ['NFR-001', 'API response time', 'p95 under 500 ms'],
        ['NFR-002', 'Monthly availability', '99.5 percent'],
      ]);
    case 'docs/06-domain-model-and-glossary.md':
      if (heading === 'Entities') {
        return table(['Entity', 'Description', 'Key fields'], [
          ['Project', 'A user-owned container of notes', 'id, name'],
          ['Note', 'A short piece of text', 'id, title, body'],
        ]);
      }
      break;
    case 'docs/09-database-design.md':
      if (heading === 'Schema Overview') {
        return table(['Table', 'Purpose', 'Key notes'], [
          ['projects', 'Stores projects', 'id is a UUID'],
          ['notes', 'Stores notes', 'projectId is indexed'],
        ]);
      }
      break;
    case 'docs/10-api-specification.md':
      if (heading === 'Endpoints') {
        return table(['Method', 'Path', 'Purpose', 'Access'], [
          ['GET', '/api/v1/projects', 'List projects', 'authenticated'],
          ['POST', '/api/v1/notes', 'Create a note', 'authenticated'],
        ]);
      }
      break;
    case 'docs/11-ui-ux-specification.md':
      if (heading === 'Screens') {
        return table(['Screen', 'Route', 'Purpose', 'Key states'], [
          ['Home', '/', 'List projects', 'loading, empty, error'],
          ['Note editor', '/notes/new', 'Write a note', 'saving, error'],
        ]);
      }
      break;
    default:
  }
  return '';
}

function mockDoc(tag: string): string {
  const path = tag.slice('doc:'.length);
  const spec = PACK_SPEC.find((s) => s.path === path);
  const title = spec?.title ?? path;
  const headings = spec?.headings ?? [];
  const parts = [`# ${title}`];
  if (headings.length === 0) {
    parts.push(`${PAD} ${PAD}`);
  }
  for (const h of headings) {
    parts.push(`## ${h}`);
    const body = sectionBody(path, h);
    if (body) parts.push(body);
    parts.push(PAD);
  }
  return parts.join('\n\n');
}

function mockTaskPlan(): unknown {
  const defs: [string, string][] = [
    ['project-setup', 'Project Setup'],
    ['database', 'Database'],
    ['auth', 'Authentication'],
    ['core-api', 'Core API'],
    ['frontend', 'Frontend'],
    ['flows', 'Core User Flows'],
    ['testing', 'Testing'],
    ['documentation-and-final-polish', 'Documentation and Final Polish'],
  ];
  const tasks = defs.map(([slug, title], i) => ({
    number: i + 1,
    slug,
    title,
    goal: `Deliver ${title.toLowerCase()} exactly as the documents specify.`,
    dependsOn: i === 0 ? [] : [i],
    requirementIds: i === 3 ? ['FR-001'] : i === 5 ? ['FR-002', 'NFR-001', 'NFR-002'] : [],
    areas: [`${slug} area`],
    steps: [`Read the documents for ${title.toLowerCase()}.`, 'Implement the change in small steps.', 'Run the verification commands.'],
    tests: [`Tests for ${title.toLowerCase()} pass.`],
    acceptance: [`${title} meets its acceptance criteria.`],
  }));
  return { tasks };
}

function mockContradictions(user: string): unknown {
  if (!user.includes(MOCK_CONTRADICTION_MARKER)) return { findings: [] };
  const sections = user.split(/^### /m).slice(1);
  for (const s of sections) {
    if (s.includes(MOCK_CONTRADICTION_MARKER)) {
      const path = (s.split('\n')[0] ?? '').trim();
      return {
        findings: [
          {
            documentPath: path,
            quote: MOCK_CONTRADICTION_MARKER,
            conflictsWith: 'auth.method',
            explanation: 'The document states a different authentication approach than the ledger.',
          },
        ],
      };
    }
  }
  return { findings: [] };
}

function respond(call: AiCall): string {
  const tag = call.tag;
  if (tag === 'extract') return JSON.stringify(mockExtract(call.user));
  if (tag === 'analyze') return JSON.stringify(mockAnalyze(call.user));
  if (tag === 'task-plan') return JSON.stringify(mockTaskPlan());
  if (tag === 'contradictions') return JSON.stringify(mockContradictions(call.user));
  if (tag === 'golden-judge') return JSON.stringify({ match: true });
  if (tag.startsWith('doc:')) {
    if (tag === `doc:${TASK_PLAN_PATH}`) return JSON.stringify(mockTaskPlan());
    return mockDoc(tag);
  }
  return call.json ? '{}' : 'OK';
}

/** Deterministic offline provider (docs/27 "Mock provider"). Makes the whole pipeline pass every gate. */
export function createMockClient(): AiClient {
  return {
    async complete(call: AiCall): Promise<AiResult> {
      const text = respond(call);
      return {
        text,
        model: `mock-${call.model}`,
        tokensIn: Math.ceil(call.user.length / 4),
        tokensOut: Math.ceil(text.length / 4),
        costUsd: 0,
      };
    },
  };
}

