export type DiscoveryCategory =
  | 'business'
  | 'users'
  | 'scope'
  | 'technical'
  | 'security'
  | 'integrations'
  | 'data'
  | 'operations'
  | 'timeline'
  | 'risk';

export const DISCOVERY_CATEGORIES: DiscoveryCategory[] = [
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
];

export interface LedgerKeySpec {
  key: string; // stable id, e.g. "stack.backend"
  area: string; // row label in 00-index, e.g. "Backend"
  category: DiscoveryCategory;
  priority: 'P0' | 'P1'; // P0 must be confirmed or assumed before generation
  question: string; // interview wording
  founderDefault: string; // recommended answer when nothing in sources decides it ('' = no default)
}

/** The fixed list of decision keys (docs/28). Data, not logic. */
export const LEDGER_CATALOG: LedgerKeySpec[] = [
  { key: 'product.one_liner', area: 'Product', category: 'business', priority: 'P0', question: 'Describe the product in one sentence.', founderDefault: '' },
  { key: 'product.problem', area: 'Problem', category: 'business', priority: 'P0', question: 'What is painful, slow or broken today that this fixes?', founderDefault: '' },
  { key: 'product.success', area: 'Success metrics', category: 'business', priority: 'P1', question: 'What does success look like at 3 and 12 months?', founderDefault: 'Active weekly users and completed core flows tracked from launch; targets set after first month' },
  { key: 'scope.mvp', area: 'MVP', category: 'scope', priority: 'P0', question: 'Which capabilities must ship in the first version?', founderDefault: '' },
  { key: 'scope.deferred', area: 'Deferred', category: 'scope', priority: 'P0', question: 'What is explicitly NOT in the first version?', founderDefault: 'Native mobile apps, advanced analytics, third-party marketplace, offline mode' },
  { key: 'users.personas', area: 'Users', category: 'users', priority: 'P0', question: 'Who uses it, and what job does each do?', founderDefault: '' },
  { key: 'users.roles', area: 'Roles', category: 'users', priority: 'P0', question: 'What roles exist and what can each do?', founderDefault: '' },
  { key: 'users.multi_tenant', area: 'Tenancy', category: 'users', priority: 'P0', question: 'Do organizations share the system with isolated data?', founderDefault: '' },
  { key: 'rules.business', area: 'Business rules', category: 'scope', priority: 'P0', question: 'Which rules can never be broken?', founderDefault: '' },
  { key: 'flows.primary', area: 'Primary workflows', category: 'scope', priority: 'P0', question: 'List the main workflows step by step.', founderDefault: '' },
  { key: 'data.entities', area: 'Core entities', category: 'data', priority: 'P0', question: 'What are the main things the system stores?', founderDefault: '' },
  { key: 'data.lifecycles', area: 'Lifecycles', category: 'data', priority: 'P0', question: 'Which records move through states, and what are the states?', founderDefault: 'Records are created, updated, archived (soft delete)' },
  { key: 'data.sensitivity', area: 'Sensitive data', category: 'data', priority: 'P0', question: 'What personal, financial or confidential data is stored?', founderDefault: '' },
  { key: 'data.retention', area: 'Deletes and backups', category: 'data', priority: 'P1', question: 'How long is data kept; soft or hard delete; backups?', founderDefault: 'Soft-delete business records; hard-delete tokens; daily backups kept 14 days' },
  { key: 'stack.frontend', area: 'Frontend', category: 'technical', priority: 'P0', question: 'Frontend framework?', founderDefault: 'Next.js 15 + TypeScript + Tailwind CSS' },
  { key: 'stack.backend', area: 'Backend', category: 'technical', priority: 'P0', question: 'Backend framework?', founderDefault: 'NestJS + TypeScript' },
  { key: 'stack.database', area: 'Database', category: 'technical', priority: 'P0', question: 'Database and ORM?', founderDefault: 'PostgreSQL + Prisma' },
  { key: 'architecture.style', area: 'Architecture', category: 'technical', priority: 'P0', question: 'Monolith, modular monolith or services?', founderDefault: 'Modular monolith in a pnpm monorepo' },
  { key: 'api.style', area: 'API style', category: 'technical', priority: 'P0', question: 'REST, GraphQL or other? Versioning?', founderDefault: 'REST under /api/v1 with OpenAPI' },
  { key: 'auth.method', area: 'Auth', category: 'security', priority: 'P0', question: 'How do users sign in?', founderDefault: 'Email + password with email verification and password reset; JWT access + refresh tokens' },
  { key: 'auth.mfa', area: 'MFA', category: 'security', priority: 'P1', question: 'Who needs multi-factor auth?', founderDefault: 'Required for admin roles; optional for others' },
  { key: 'rbac.model', area: 'Permissions', category: 'security', priority: 'P0', question: 'How are permissions enforced?', founderDefault: 'Role-based, checked on the server for every request, scoped to the user\'s organization' },
  { key: 'security.compliance', area: 'Compliance', category: 'security', priority: 'P1', question: 'Which laws or standards apply?', founderDefault: 'GDPR-ready practices; no certification in MVP' },
  { key: 'integrations.payments', area: 'Payments', category: 'integrations', priority: 'P0', question: 'Does it take payments? With what provider?', founderDefault: 'No payments in MVP' },
  { key: 'integrations.email', area: 'Email', category: 'integrations', priority: 'P1', question: 'Transactional email provider?', founderDefault: '' },
  { key: 'integrations.storage', area: 'File storage', category: 'integrations', priority: 'P1', question: 'Where are uploaded files stored?', founderDefault: 'S3-compatible object storage (Cloudflare R2) with signed URLs' },
  { key: 'integrations.other', area: 'Other integrations', category: 'integrations', priority: 'P1', question: 'Any other external APIs (maps, SMS, AI, …)?', founderDefault: 'None in MVP' },
  { key: 'notifications.channels', area: 'Notifications', category: 'integrations', priority: 'P1', question: 'Email, in-app, SMS, push?', founderDefault: 'Email + in-app' },
  { key: 'ui.platform', area: 'UI platform', category: 'technical', priority: 'P0', question: 'Web, mobile web, native? Desktop-first or mobile-first?', founderDefault: 'Responsive web, desktop-first' },
  { key: 'ui.design_source', area: 'Design source', category: 'technical', priority: 'P1', question: 'Is there a Figma file or design system?', founderDefault: 'Tailwind CSS with a simple neutral design system; no Figma' },
  { key: 'ui.accessibility', area: 'Accessibility', category: 'technical', priority: 'P1', question: 'Accessibility target?', founderDefault: 'WCAG 2.1 AA' },
  { key: 'i18n.languages', area: 'Languages', category: 'technical', priority: 'P1', question: 'Which languages and currencies?', founderDefault: 'English only; i18n-ready; USD' },
  { key: 'nfr.performance', area: 'Performance', category: 'operations', priority: 'P1', question: 'Response-time targets?', founderDefault: 'p95 API < 500 ms for reads, < 1 s for writes at 50 concurrent users' },
  { key: 'nfr.availability', area: 'Availability', category: 'operations', priority: 'P1', question: 'Uptime target?', founderDefault: '99.5% monthly' },
  { key: 'ops.hosting', area: 'Hosting', category: 'operations', priority: 'P0', question: 'Where does it run?', founderDefault: 'Managed Node hosting (Render or Railway) with managed PostgreSQL; no Docker' },
  { key: 'ops.ci', area: 'CI/CD', category: 'operations', priority: 'P1', question: 'CI and deploy pipeline?', founderDefault: 'GitHub Actions: lint, typecheck, test, build on every PR; deploy on main' },
  { key: 'ops.observability', area: 'Observability', category: 'operations', priority: 'P1', question: 'Logging, errors, metrics?', founderDefault: 'Structured JSON logs, Sentry for errors, /health endpoint' },
  { key: 'testing.strategy', area: 'Testing', category: 'operations', priority: 'P1', question: 'Testing expectations?', founderDefault: 'Unit + API integration tests alongside code; Playwright for critical flows; 80% core coverage' },
  { key: 'timeline.target', area: 'Timeline', category: 'timeline', priority: 'P1', question: 'Target date and team?', founderDefault: 'MVP built by one developer with an AI coding agent' },
  { key: 'risk.top', area: 'Top risks', category: 'risk', priority: 'P1', question: 'What could sink the project?', founderDefault: 'Scope creep beyond the MVP list' },
];

const BY_KEY = new Map(LEDGER_CATALOG.map((k) => [k.key, k]));

export function catalogByKey(key: string): LedgerKeySpec | undefined {
  return BY_KEY.get(key);
}

export function p0Keys(): string[] {
  return LEDGER_CATALOG.filter((k) => k.priority === 'P0').map((k) => k.key);
}

/** `stack.*` matches every key with the prefix `stack.`; any other pattern matches exactly. */
export function keyMatches(pattern: string, key: string): boolean {
  if (pattern.endsWith('.*')) return key.startsWith(pattern.slice(0, -1));
  return pattern === key;
}

export function keysMatching(pattern: string): string[] {
  return LEDGER_CATALOG.filter((k) => keyMatches(pattern, k.key)).map((k) => k.key);
}

export function hasFounderDefault(spec: LedgerKeySpec): boolean {
  return spec.founderDefault.trim() !== '';
}
