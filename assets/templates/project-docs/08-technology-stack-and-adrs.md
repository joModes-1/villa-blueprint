# Technology Stack and ADRs

## Stack
Next.js + TypeScript; NestJS + TypeScript; PostgreSQL + Prisma; REST/OpenAPI; Tailwind + shadcn/ui; Cloudflare R2; Stripe; Pesapal; Resend; Google Maps; Sentry; Docker; GitHub Actions; Render/Railway.

## ADRs
### ADR-001 Frontend Framework
Status: Accepted. Decision: Next.js + TypeScript. Alternatives: React SPA, Vue/Nuxt. Reasoning: role dashboards, strong routing, SSR/CSR flexibility, TypeScript parity. Consequence: manage server/client component boundaries.

### ADR-002 Backend Framework
Status: Accepted. Decision: NestJS. Alternatives: Django REST, Laravel, Express. Reasoning: modular DI, guards, validation, OpenAPI, TypeScript. Consequence: more structure/boilerplate, better maintainability.

### ADR-003 Database/ORM
Status: Accepted. Decision: PostgreSQL + Prisma. Alternatives: MySQL, MongoDB, TypeORM. Reasoning: transactions, constraints, typed migrations, relational domain. Consequence: raw SQL may be needed for advanced reports.

### ADR-004 API Style
Status: Accepted. Decision: REST `/api/v1` with OpenAPI. Alternatives: GraphQL, gRPC. Reasoning: simple, integration-friendly, Codex-friendly. Consequence: maintain pagination/filter conventions.

### ADR-005 Authentication
Status: Accepted. Decision: Clerk for user identity, sign-in/sign-up, session tokens, verification, reset, and MFA; backend PostgreSQL/Prisma records remain authoritative for company-scoped RBAC and approval gates. Alternatives: first-party email/password JWT sessions, SSO/OAuth-only, magic links. Reasoning: B2B onboarding needs business approval while identity/session operations should use a managed provider. Consequence: local users must be linked to Clerk IDs and every protected `/api/v1` request must resolve permissions server-side.

### ADR-006 Architecture
Status: Accepted. Decision: modular monolith monorepo. Alternatives: microservices, separate repos. Reasoning: MVP speed and shared types without distributed complexity. Consequence: enforce module boundaries by convention/tests.

### ADR-007 Hosting
Status: Accepted. Decision: Render/Railway managed services with Docker images and R2. Alternatives: AWS ECS/RDS, VPS. Reasoning: simpler MVP operations. Consequence: uptime/PITR depend on provider tier.

### ADR-008 Testing
Status: Accepted. Decision: tests alongside implementation, 80% backend/core, Playwright critical E2E. Alternatives: manual only/lower coverage. Consequence: CI must remain fast and reliable.

### ADR-009 State Management
Status: Accepted. Decision: TanStack Query for server state; React local state/Zustand only when necessary. Reasoning: avoids duplicating server state.

### ADR-010 Background Jobs
Status: Proposed. Decision: queue-ready services; add worker/Redis/BullMQ when async volume requires. Reasoning: MVP simplicity with future growth path.

### ADR-011 File Storage
Status: Accepted. Decision: Cloudflare R2. Alternatives: S3, Azure Blob, local disk. Reasoning: selected by user, S3-compatible, cost-effective. Consequence: implement signed URL/private bucket discipline.
