# Implementation Plan

| Phase | Objective | Deliverables | Verification |
|---|---|---|---|
| 0 | Documentation/project setup | This docs package and Codex handoff | Files exist and decisions captured |
| 1 | Repository/tooling | Monorepo, apps, packages, Docker, lint/test/build, CI skeleton | `pnpm lint && pnpm test && docker compose up` |
| 2 | Database | Prisma schema/migrations/seeds | Migration and seed pass |
| 3 | Auth/RBAC | Registration, verification, login, MFA, permissions, approval gates | Auth/RBAC tests |
| 4 | Core backend | Packages, clients, bookings, finance, documents, notifications | API/integration tests |
| 5 | Frontend | Auth shell, dashboards, package/marketplace/booking/document/admin UI | Playwright smoke |
| 6 | Integrations | R2, Resend, Google Maps, Stripe, Pesapal adapters | Mock/sandbox tests |
| 7 | Testing | Unit/integration/API/E2E/security/accessibility suites | CI green, coverage target |
| 8 | Security hardening | Rate limits, headers, audit coverage, upload hardening, dependency checks | Security checklist |
| 9 | Deployment | Docker images, GitHub Actions, Render/Railway staging/prod | Staging smoke |
| 10 | Production readiness | Monitoring, backups, restore drill, runbooks, launch checklist | Sign-off |

Each phase must include acceptance criteria, verification commands, and stop/report conditions for missing payment/security/compliance decisions.
