# System Architecture

## Recommended Style
Modular monolith in a TypeScript monorepo. This keeps deployment simple while giving clear domain boundaries.

```text
Next.js Browser App
  -> NestJS REST API /api/v1
    -> Auth/RBAC guards
    -> Domain modules: companies, packages, clients, bookings, finance, documents, notifications, reports, admin, audit
    -> PostgreSQL via Prisma
    -> Cloudflare R2
    -> Stripe + Pesapal
    -> Resend + Google Maps
    -> Sentry + structured logs
```

## Frontend Architecture
Next.js App Router, TypeScript, Tailwind, shadcn/ui. Route groups: `(auth)`, `(agency)`, `(operator)`, `(admin)`, `(finance)`. Use TanStack Query for server state, shared API client, and role-aware navigation. Forms should use shared validation concepts, inline errors, and accessible components.

## Backend Architecture
NestJS modules: AuthModule, CompaniesModule, RbacModule, PackagesModule, ClientsModule, BookingsModule, FinanceModule, DocumentsModule, NotificationsModule, ReportsModule, AdminModule, AuditModule, HealthModule. Controllers handle HTTP, services handle business rules, guards enforce auth/RBAC.

## Data and Integrations
PostgreSQL is authoritative. R2 stores media/private documents. Stripe/Pesapal adapters initiate hosted checkout and process verified/idempotent webhooks. Resend sends transactional email. Google Maps supports pins/pickup points.

## Background Jobs
MVP may start with synchronous service calls for low volume, but design notification/reminder/webhook retry operations behind job-dispatch interfaces so BullMQ/Redis worker can be added without rewriting business logic.

## Error Handling
Domain exceptions map to stable error codes. Unexpected errors go to Sentry with requestId. Responses never include stack traces or secrets. Validation errors include field-level details.

## Caching
Avoid complex caching in MVP. Use indexes and pagination first. Cache safe reference/settings data with short TTL only if needed. Never cache private document URLs beyond expiry.

## Scaling and Failure Handling
Keep API stateless; use DB indexes/pagination; add worker/Redis for emails/reminders/webhook retries when volume requires. Payment and booking state changes use transactions. Webhooks use unique provider event IDs. File upload failure must not create successful document metadata.
