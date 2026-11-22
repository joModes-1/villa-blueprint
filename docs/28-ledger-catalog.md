# Ledger Catalog

The decision ledger is the single source of truth for a generated pack. This catalog is the **fixed list of keys**. Implement it verbatim as `packages/core/src/ledger/catalog.ts`, exported as `LEDGER_CATALOG: LedgerKeySpec[]`.

```ts
export type DiscoveryCategory =
  | 'business' | 'users' | 'scope' | 'technical' | 'security'
  | 'integrations' | 'data' | 'operations' | 'timeline' | 'risk';

export interface LedgerKeySpec {
  key: string;               // stable id, e.g. "stack.backend"
  area: string;              // row label in 00-index, e.g. "Backend"
  category: DiscoveryCategory;
  priority: 'P0' | 'P1';     // P0 must be confirmed or assumed before generation
  question: string;          // interview wording
  founderDefault: string;    // recommended answer when nothing in sources decides it
}
```

The categories are the 10 categories of `assets/forward-build/01-discovery-questions.md`, in that order.

Rules:
- Every `key` and every `area` is unique. Gate G08 matches index rows by area. A catalog unit test asserts uniqueness.
- Every key exists for every project. Rows are created at project creation with status `deferred` and an empty value.
- `founderDefault` may contain `{{...}}` placeholders, resolved from other ledger values at the time of use. Only the placeholders shown below exist.
- Which docs depend on which keys is defined in `29`, not here.

## Keys

| key | area | category | priority | question | founderDefault |
|---|---|---|---|---|---|
| product.one_liner | Product | business | P0 | Describe the product in one sentence. | *(no default; must come from sources or the user)* |
| product.problem | Problem | business | P0 | What is painful, slow or broken today that this fixes? | *(no default)* |
| product.success | Success metrics | business | P1 | What does success look like at 3 and 12 months? | Active weekly users and completed core flows tracked from launch; targets set after first month |
| scope.mvp | MVP | scope | P0 | Which capabilities must ship in the first version? | *(no default)* |
| scope.deferred | Deferred | scope | P0 | What is explicitly NOT in the first version? | Native mobile apps, advanced analytics, third-party marketplace, offline mode |
| users.personas | Users | users | P0 | Who uses it, and what job does each do? | *(no default)* |
| users.roles | Roles | users | P0 | What roles exist and what can each do? | Owner/Admin and Member, plus a platform Super Admin |
| users.multi_tenant | Tenancy | users | P0 | Do organizations share the system with isolated data? | Single organization per account; no cross-account data access |
| rules.business | Business rules | scope | P0 | Which rules can never be broken? | *(no default)* |
| flows.primary | Primary workflows | scope | P0 | List the main workflows step by step. | *(no default)* |
| data.entities | Core entities | data | P0 | What are the main things the system stores? | *(no default)* |
| data.lifecycles | Lifecycles | data | P0 | Which records move through states, and what are the states? | Records are created, updated, archived (soft delete) |
| data.sensitivity | Sensitive data | data | P0 | What personal, financial or confidential data is stored? | Names and emails only; no payment card data stored |
| data.retention | Deletes and backups | data | P1 | How long is data kept; soft or hard delete; backups? | Soft-delete business records; hard-delete tokens; daily backups kept 14 days |
| stack.frontend | Frontend | technical | P0 | Frontend framework? | Next.js 15 + TypeScript + Tailwind CSS |
| stack.backend | Backend | technical | P0 | Backend framework? | NestJS + TypeScript |
| stack.database | Database | technical | P0 | Database and ORM? | PostgreSQL + Prisma |
| architecture.style | Architecture | technical | P0 | Monolith, modular monolith or services? | Modular monolith in a pnpm monorepo |
| api.style | API style | technical | P0 | REST, GraphQL or other? Versioning? | REST under `/api/v1` with OpenAPI |
| auth.method | Auth | security | P0 | How do users sign in? | Email + password with email verification and password reset; JWT access + refresh tokens |
| auth.mfa | MFA | security | P1 | Who needs multi-factor auth? | Required for admin roles; optional for others |
| rbac.model | Permissions | security | P0 | How are permissions enforced? | Role-based, checked on the server for every request, scoped to the user's organization |
| security.compliance | Compliance | security | P1 | Which laws or standards apply? | GDPR-ready practices; no certification in MVP |
| integrations.payments | Payments | integrations | P0 | Does it take payments? With what provider? | No payments in MVP |
| integrations.email | Email | integrations | P1 | Transactional email provider? | Resend |
| integrations.storage | File storage | integrations | P1 | Where are uploaded files stored? | S3-compatible object storage (Cloudflare R2) with signed URLs |
| integrations.other | Other integrations | integrations | P1 | Any other external APIs (maps, SMS, AI, …)? | None in MVP |
| notifications.channels | Notifications | integrations | P1 | Email, in-app, SMS, push? | Email + in-app |
| ui.platform | UI platform | technical | P0 | Web, mobile web, native? Desktop-first or mobile-first? | Responsive web, desktop-first |
| ui.design_source | Design source | technical | P1 | Is there a Figma file or design system? | Tailwind CSS with a simple neutral design system; no Figma |
| ui.accessibility | Accessibility | technical | P1 | Accessibility target? | WCAG 2.1 AA |
| i18n.languages | Languages | technical | P1 | Which languages and currencies? | English only; i18n-ready; USD |
| nfr.performance | Performance | operations | P1 | Response-time targets? | p95 API < 500 ms for reads, < 1 s for writes at 50 concurrent users |
| nfr.availability | Availability | operations | P1 | Uptime target? | 99.5% monthly |
| ops.hosting | Hosting | operations | P0 | Where does it run? | Managed Node hosting (Render or Railway) with managed PostgreSQL; no Docker |
| ops.ci | CI/CD | operations | P1 | CI and deploy pipeline? | GitHub Actions: lint, typecheck, test, build on every PR; deploy on main |
| ops.observability | Observability | operations | P1 | Logging, errors, metrics? | Structured JSON logs, Sentry for errors, `/health` endpoint |
| testing.strategy | Testing | operations | P1 | Testing expectations? | Unit + API integration tests alongside code; Playwright for critical flows; 80% core coverage |
| timeline.target | Timeline | timeline | P1 | Target date and team? | MVP built by one developer with an AI coding agent |
| risk.top | Top risks | risk | P1 | What could sink the project? | *(derived from sources; if none, "Scope creep beyond the MVP list")* |

## Resolution order during analysis

1. A key is **confirmed** only when a fact with a citation states it, or when the user answers its question.
2. In `founder` mode, after the interview, every remaining P1 key gets `founderDefault` with status **assumed** and rationale `"Founder-mode default"`.
3. In `expert` mode, P1 keys are asked like P0 keys.
4. A P0 key with *(no default)* that is still empty after the interview blocks generation (see `27`, stage `generate`). The UI shows which keys are missing.
5. **Deferred** is a valid final status only for keys whose value says what is deferred, for example `integrations.payments = "No payments in MVP"`. An empty value is never final.
