# Documentation Index

Project: **EU B2B Tourism Portal**. This archive converts the SRS into an implementation-ready package for Codex or a human team.


| Area | Confirmed decision |
|---|---|
| MVP | Registration, company approval, auth/RBAC, package management, agency search/bookings, operator approval, invoices, payments, basic dashboards/reports, notifications, documents, admin management |
| Deferred v1 | Supplier portals, advanced hotel inventory, advanced vehicle scheduling, internal chat, CMS, real-time analytics, fraud detection, native mobile apps, payment terminals, complex exports |
| Users | B2B only; tourists/clients are agency-managed records and do not log in |
| Roles | Super Admin, Platform Staff/Admin, Tour Operator Admin, Tour Operator Staff, Travel Agency Admin, Travel Agency Staff, Accountant/Finance |
| Approval | All operator and agency registrations require admin approval before transactions |
| Booking lifecycle | draft → submitted → pending_operator_approval → approved → payment_pending → paid → confirmed → completed; side states rejected, cancelled, refund_requested, refunded |
| Payment rule | Operator approval required before payment |
| Settlement | Platform collects first, records commissions, then reconciles payouts |
| Currency | USD default; UGX supported |
| Stack | Next.js + TypeScript, NestJS + TypeScript, PostgreSQL + Prisma |
| Architecture | Modular monolith REST API in a monorepo |
| Auth | Email/password, email verification, password reset, JWT access/refresh, company approval |
| MFA | Required for Super Admin, Platform Staff/Admin, Accountant/Finance |
| RBAC | Company-scoped RBAC plus global super-admin permissions |
| Payments | Stripe for international cards; Pesapal/mobile money for local payments and payouts |
| Storage | Cloudflare R2 |
| Notifications | Email + in-app in MVP; SMS later |
| Email/maps | Resend and Google Maps API |
| UI | Responsive desktop-first, Tailwind CSS + shadcn/ui, WCAG 2.1 AA |
| Localization | English MVP; i18n-ready architecture |
| Deployment | Render/Railway managed deployment + Docker images + Cloudflare R2 |
| CI/observability | GitHub Actions; Sentry + structured logs + provider metrics |
| Testing | Tests alongside implementation; 80% backend/core coverage; critical Playwright E2E flows |
| Data/security | Sensitive PII/financial controls; Uganda-first compliance with GDPR-ready practices where practical |
| Deletes/backups | Soft-delete business records; hard-delete transient tokens/temp files; daily backups + PITR where supported |


## Documentation Map
| File | Purpose |
|---|---|
| 01-executive-summary.md | Business/product summary and risks |
| 02-product-requirements-document.md | PRD, workflows, stories, MVP/future scope |
| 03-cleaned-srs.md | SRS rewritten for implementation |
| 04-requirements-matrix.md | Requirement IDs, priorities, tasks, tests |
| 05-non-functional-requirements.md | Production NFRs with measurable targets |
| 06-domain-model-and-glossary.md | Entities, relationships, states, terms |
| 07-system-architecture.md | Modular monolith architecture and data flows |
| 08-technology-stack-and-adrs.md | Stack choices and ADRs |
| 09-database-design.md | Schema, constraints, indexes, migrations |
| 10-api-specification.md | REST endpoints, conventions, examples |
| 11-ui-ux-specification.md | Screens, components, validation, states |
| 12-authentication-authorization-and-permissions.md | Auth/RBAC/MFA and permission matrix |
| 13-security-requirements-and-threat-model.md | Threats and secure coding rules |
| 14-implementation-plan.md | Phased build plan |
| 15-codex-task-breakdown.md | Codex-ready implementation task summary |
| 16-test-plan-and-quality-strategy.md | Test cases and quality gates |
| 17-devops-deployment-and-operations.md | Environments, CI/CD, deployment, backups |
| 18-observability-logging-and-monitoring.md | Logs, metrics, alerts, incidents |
| 19-coding-standards.md | Engineering standards and Definition of Done |
| 20-risk-register.md | Risks, mitigations, owners |
| 21-acceptance-criteria.md | Pass/fail criteria |
| 22-readme-draft.md | Developer README starter |
| 23-open-questions-and-assumptions.md | Confirmed assumptions and remaining questions |
| 24-traceability-matrix.md | SRS → feature → DB/API/UI/task/test trace |
| 25-repository-structure.md | Production repository layout |
| codex-handoff/* | Codex-specific build instructions |

## Recommended Implementation Order
Read `codex-handoff/AGENTS.md`, then `CODEX_PROJECT_CONTEXT.md`, then implement tasks in `CODEX_TASKS_INDEX.md`. Use `04-requirements-matrix.md`, `16-test-plan-and-quality-strategy.md`, and `21-acceptance-criteria.md` as verification gates.

## Document Categories
- Product decisions: 01, 02, 03, 20, 21, 23.
- Architecture: 06, 07, 08, 09, 10, 11, 12, 13, 25.
- Codex implementation: 14, 15, `codex-handoff/`.
- QA/deployment: 16, 17, 18, 19, 21, 24.
