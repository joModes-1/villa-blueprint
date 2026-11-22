# Layer 5 — Build Guide: API Spec, UI Spec, Tasks, Tests, Coding Standards

These are the documents that turn requirements and architecture into a concrete build plan. Once you have Layers 1–4 stable, Layer 5 is mostly mechanical — you're translating what you know into implementation instructions. The quality of Layer 5 determines whether an AI agent or a new developer can build the system without daily handholding.

---

## Document 1: API Specification

### What It Is
A complete list of every HTTP endpoint: the method, path, who can call it, what request body is expected, what response is returned, and what error cases exist. This is the binding contract between frontend and backend.

### Why It Exists
Without an API spec, the frontend developer makes assumptions about endpoint shapes. The backend developer makes different assumptions. The integration breaks. The API spec aligns both sides before either starts building.

For AI agents: the API spec is the most important document for implementing the backend. It tells the AI exactly what to build, in what shape, with what access control.

### How to Write It

**Section 1: API Design Principles**
State the rules that apply to every endpoint:

```
- Base path: /api/v1 (all endpoints prefixed)
- Authentication: Bearer token in Authorization header (verified by auth provider)
- All protected endpoints: auth check + permission check + company scope check
- Error shape: { "error": { "code", "message", "details", "requestId" } }
- List responses: { "items": [...], "page": 1, "pageSize": 20, "total": 150, "totalPages": 8 }
- All filter/sort parameters are allowlisted (not free-form)
- Mutating endpoints on sensitive resources write audit log entries
```

**Section 2: Endpoint Inventory**
Group endpoints by domain module. For each endpoint:

```
| Method | Path | Purpose | Access |
|---|---|---|---|
| GET | /marketplace/packages | Search published packages | authenticated agency, approved company |
| POST | /agency/bookings | Submit booking request | bookings:submit permission, approved company |
```

**The Key Columns:**
- Method: GET / POST / PUT / PATCH / DELETE
- Path: exact URL path with parameters as {paramName}
- Purpose: one-sentence description of what this endpoint does
- Access: who can call this (role, permission string, or "public")

**Organizing by module:**
```
Public/Auth endpoints: /auth/*, /health, /version, /metrics
Company management: /me, /company, /company/staff
Admin: /admin/companies, /admin/users, /admin/audit-logs, /admin/settings
Packages (operator): /operator/packages
Marketplace (agency): /marketplace/packages
Clients: /agency/clients, /agency/travelers
Bookings: /agency/bookings, /operator/bookings
Finance: /bookings/{id}/payments/checkout, /webhooks/stripe, /webhooks/pesapal
         /bookings/{id}/refunds, /finance/invoices, /finance/payments
Documents: /documents, /documents/{id}/download-url
Notifications: /notifications
Reports: /dashboards/{role}, /reports/platform
Reviews: /bookings/{id}/reviews, /admin/reviews
```

**Section 3: Request/Response Examples**
For complex endpoints, show the exact JSON shape.

Booking submission example:
```json
POST /api/v1/agency/bookings
Authorization: Bearer {token}

Request:
{
  "packageId": "pkg_01HXYZ",
  "clientId": "client_01ABC",
  "travelStartDate": "2026-09-10",
  "travelEndDate": "2026-09-14",
  "travelerIds": ["trav_01DEF", "trav_01GHI"],
  "specialRequests": "Vegetarian meals"
}

Response 201:
{
  "id": "book_01JKL",
  "status": "PENDING_OPERATOR_APPROVAL",
  "packageId": "pkg_01HXYZ",
  "agencyCompanyId": "co_01MNO",
  "createdAt": "2026-06-12T10:30:00Z"
}

Response 400:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "details": [{ "field": "travelStartDate", "message": "Date must be in the future" }],
    "requestId": "req_01PQR"
  }
}

Response 403:
{
  "error": { "code": "FORBIDDEN", "message": "Your company is not approved to submit bookings." }
}
```

**Section 4: Validation & Idempotency Notes**
Document the non-obvious validation and idempotency rules.

These are the rules that won't be obvious from the endpoint list alone:
- "Duplicate operator booking approval returns the current booking without side effects"
- "Webhook endpoints store event IDs to prevent duplicate processing"
- "Payment checkout rejects any raw card field (cardNumber, cvc, expiry)"
- "Document download URL generation: signed URL expires in [N] minutes"
- "Invoice editing blocked after payment has started"
- "Favorite writes are agency-scoped and idempotent"

### What Makes a Good API Spec

**Explicit access control** — not just "authenticated" but which specific permission string is required
**Idempotency documented** — for every endpoint that could be called twice, what happens on the duplicate call
**Error cases named** — what codes and messages are returned for each error scenario
**State transition effects documented** — when an endpoint changes state, what side effects occur?
**No implicit behaviors** — if something always happens when this endpoint is called (audit log, notification), say so

---

## Document 2: UI/UX Specification

### What It Is
A description of every user-facing screen: its purpose, the components on it, what data it displays, what actions a user can take, what validates, what loading/empty/error states look like.

### How to Write It

For each screen, document:

**Screen Template:**
```
### [Screen Name] — [Route path]

**Who sees it**: [roles that can access this screen]
**Purpose**: [one sentence — what does the user accomplish here?]

**Components / Layout**:
[List the key UI sections and components]

**Data displayed**:
[What data is shown — where does it come from?]

**Actions available**:
[Buttons, links, forms — what can the user do?]

**Validation**:
[What fields validate? What are the rules?]

**States**:
- Loading: [what shows while data loads?]
- Empty: [what shows if there's no data?]
- Error: [what shows if the API call fails?]
- Success: [what happens after a successful action?]

**Edge cases**:
[What happens if the user has no permissions? If the data is stale? If the action fails?]
```

**Organize screens by role/workflow:**
```
Public: Login, Register, Email Verification, Password Reset
Operator: Dashboard, Package List, Package Editor, Booking Queue, Booking Detail
Agency: Dashboard, Marketplace Search, Package Detail, Client List, Client Detail, Booking List, Booking Detail, Payment Flow
Admin: Company Approval Queue, Company Detail, User List, Audit Logs, Platform Settings
Finance: Invoices, Payments, Refunds, Commissions, Reports
Shared: Notifications, Document Upload/Download, Profile
```

---

## Document 3: Implementation Plan

### What It Is
A phased delivery plan that groups the tasks into coherent phases with specific objectives and deliverables per phase.

### How to Write It

Divide the project into 3–6 phases. Each phase should be independently deployable (you could show it to a stakeholder).

Phase Template:
```
### Phase [N]: [Name]

**Objective**: What this phase delivers
**Deliverables**: 
- [Specific deliverable 1]
- [Specific deliverable 2]
**Verification**: How you know this phase is complete
```

Example phases for a typical B2B web app:
```
Phase 1: Foundation — monorepo, database schema, CI, auth skeleton
Phase 2: Core Domain — packages, clients, bookings (backend only)
Phase 3: Core API — all REST endpoints, permissions, webhooks
Phase 4: Frontend Foundation — design system, routing, API client, guards
Phase 5: Core User Flows — all operator and agency screens
Phase 6: Admin & Finance — admin tools, finance screens, reports
Phase 7: Hardening — validation, edge cases, idempotency
Phase 8: Security — rate limits, security headers, audit coverage
Phase 9: Testing — complete test suite to coverage target
Phase 10: DevOps — Docker, CI/CD, deployment
Phase 11: Observability — logging, metrics, health, backups
Phase 12: Polish — README, API docs, release checklist
```

---

## Document 4: Task Breakdown

### What It Is
The heart of the AI handoff. 10–15 sequential implementation tasks, each with a single coherent goal, explicit dependencies, acceptance criteria, verification commands, and stop conditions.

### Why It Exists
Without tasks, an AI agent or developer has to interpret the entire requirements document to decide what to build next. Tasks partition the work into units that are: small enough to complete without context overload, large enough to deliver value, and ordered to minimize rework.

### How to Write Tasks

Every task must have all of these sections:

**Section: Goal**
One sentence. What is the deliverable?

*Bad:* "Implement the booking system"
*Good:* "Implement REST endpoints for agency booking submission and operator booking approval, with RBAC, invoicing side effects, and notification triggers"

**Section: Context**
Why this task exists in the sequence. What must be true before this task starts? What does this task enable?

**Section: Dependencies**
Which previous tasks must be completely done before this task starts? (Not just "merged" but passing all tests.)

**Section: Files and Areas Affected**
What modules, files, or layers of the system will change?

**Section: Implementation Instructions**
Step-by-step instructions. For an AI agent, these must be specific enough that the agent doesn't need to make architectural decisions — those were already made in Layers 1–4.

Format: numbered steps, specific enough to implement
```
1. Read the relevant project-docs sections for this task
2. Inspect current repository state
3. Create NestJS module at apps/backend/src/modules/bookings/
4. Implement BookingDomainService with the following methods: [list]
5. Implement BookingsController with the following endpoints: [list from API spec]
6. Apply AuthGuard and PermissionGuard to protected endpoints
7. Add Prisma transaction wrapper for status transition methods
8. Write unit tests for BookingDomainService
9. Write integration/API tests for each endpoint
10. Run verification commands
```

**Section: Constraints (Never Do These)**
Hard prohibitions for this task. These prevent the most common mistakes.

```
NEVER:
- Hardcode API keys, secrets, or connection strings in code
- Skip auth/permission guards on any endpoint
- Store raw card data in any form
- Remove input validation from DTOs
- Edit previously applied Prisma migrations
- Implement features marked as Deferred in the requirements matrix
- Write code that bypasses the company-scope check
```

**Section: Security Notes**
Security rules specific to this task. Copy the relevant rules from the security document.

**Section: Tests Required**
What tests must pass for this task to be done?
- Unit tests: which services/utilities
- Integration tests: which endpoints, with which request/response scenarios
- RBAC tests: which endpoints with wrong permissions (expected 403)
- Security tests: cross-company access, invalid state transitions

**Section: Acceptance Criteria**
Observable behaviors that prove the task is complete. Written in present tense: "the system does X when Y."

```
- POST /agency/bookings with valid data creates a booking in PENDING_OPERATOR_APPROVAL state
- POST /agency/bookings without auth returns 401
- POST /agency/bookings without bookings:submit permission returns 403
- POST /operator/bookings/{id}/approve with valid booking creates an invoice in the same transaction
- POST /operator/bookings/{id}/approve with an already-approved booking is idempotent (returns current booking, no side effects)
- Booking status event is created for every state transition
```

**Section: Verification Commands**
The exact commands to run to confirm this task is done.

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e  # if UI affected
```

**Section: Stop Conditions**
When must the implementer pause and ask rather than proceed?

```
Stop and ask if:
- A security decision is ambiguous (is this endpoint rate-limited? is this action audited?)
- A payment calculation is unclear (how exactly is commission calculated?)
- A state transition rule is missing (can a booking be cancelled after payment?)
- An API contract conflicts with the API specification
- A required dependency is unavailable (migration not yet created, service not yet implemented)
```

### Task Sequencing Rules

Tasks must be sequenced so that each task's dependencies are real dependencies:
- Database schema before domain services before API endpoints
- Auth/RBAC before any protected endpoints
- Backend endpoints before frontend pages
- Core flows before admin/finance flows
- Main flows before validation/hardening
- Implementation before security hardening
- Full implementation before test suite completion
- Tests before CI/CD
- CI/CD before observability

Standard 14-task sequence:
```
task-001: Project setup (monorepo, tooling, Docker, CI skeleton)
task-002: Database schema and migrations (all tables, indexes, seeds)
task-003: Authentication and authorization (Clerk integration, RBAC, MFA)
task-004: Core domain models (services for packages, clients, bookings, finance, documents)
task-005: Core API endpoints (all REST endpoints with RBAC, DTO validation, OpenAPI)
task-006: Frontend foundation (Next.js shell, design system, API client, route guards)
task-007: Core user flows (all operator and agency screens)
task-008: Admin and management features (admin, finance, reports, settings, reviews)
task-009: Validation, error handling, edge cases (harden state machines, idempotency)
task-010: Security hardening (rate limits, headers, audit coverage, payment security)
task-011: Testing suite (complete test coverage to target)
task-012: DevOps and deployment (Docker, GitHub Actions, Render/Railway)
task-013: Observability and production readiness (Sentry, logs, health, backups)
task-014: Documentation and final polish (README, API docs, release checklist)
```

---

## Document 5: Test Plan & Quality Strategy

### What It Is
A document that defines: what gets tested, at what level, with what coverage target, and what the CI pipeline runs.

### How to Write It

**Section 1: Coverage Targets**
```
Backend/core business logic: ≥ 80% line coverage
Frontend components: ≥ 60% (focus on critical flows)
E2E: critical paths only (registration, booking, payment)
```

**Section 2: Test Types and What Each Covers**
```
Unit tests: pure business logic — state machine transitions, calculations, validators
Integration tests: service + database — correct DB writes, transaction behavior
API tests: endpoint-level — correct status codes, correct response shapes, RBAC (403s)
Security tests: cross-tenant access, invalid state transitions, auth bypass attempts
Accessibility tests: axe on critical screens
E2E tests (Playwright): registration, booking submission, payment flow (happy path)
```

**Section 3: Test Cases (numbered)**
For each major feature area, define the key test cases by ID.

```
TC-AUTH-001: User can register and verify email
TC-AUTH-002: Login rate limiting returns 429
TC-RBAC-001: Agency cannot access operator endpoints (403)
TC-BOOK-001: Booking submission creates correct status event
TC-BOOK-002: Duplicate booking approval is idempotent
TC-PAY-001: Payment webhook with invalid signature returns 400
TC-PAY-002: Duplicate payment webhook does not create duplicate payment
TC-DOC-001: Document access requires valid signed URL
TC-SEC-001: Cross-company booking access returns 403
```

**Section 4: CI Pipeline**
The exact steps CI runs on every PR:
```
1. pnpm install (dependency installation)
2. pnpm lint (ESLint — no warnings in CI)
3. pnpm typecheck (TypeScript — zero errors)
4. pnpm test (unit + integration + API tests)
5. pnpm build (production build succeeds)
6. pnpm test:e2e (E2E smoke tests on staging — on main branch only)
```

---

## Document 6: Coding Standards

### What It Is
The non-negotiable rules for how code is written. Naming, file structure, error shapes, git practices, and the definition of done.

### How to Write It

**Naming Conventions:**
```
Variables/functions: camelCase
Classes/types/interfaces/components: PascalCase
Constants: SCREAMING_SNAKE_CASE
DB tables/columns: snake_case
API endpoints: kebab-case (/api/v1/booking-requests)
```

**File Naming (backend NestJS):**
```
[module].module.ts
[module].controller.ts
[module]-domain.service.ts
[module].dto.ts
[module].spec.ts
```

**File Naming (frontend Next.js):**
```
Route files: app/(group)/[route]/page.tsx
Component files: components/[component-name].tsx
Spec files: components/[component-name].spec.tsx
```

**Error Handling Rules:**
```
- Every API error returns: { error: { code, message, details, requestId } }
- HTTP codes: 400 (validation), 401 (not authenticated), 403 (not authorized), 404 (not found), 409 (conflict), 429 (rate limited), 500 (unexpected)
- Never return stack traces in production responses
- Never include secrets, passwords, or tokens in error messages
- Log unexpected errors to Sentry; return generic 500 to client
```

**Database Rules:**
```
- All schema changes through Prisma migrations
- All state transitions in DB transactions
- Soft delete: set deleted_at, never DELETE on business records
- Money: Decimal type, never Float
- Always filter by company_id in tenant-scoped queries
```

**Security Rules (inline with code):**
```
- Every controller method on a protected route needs: @UseGuards(AuthGuard, PermissionGuard)
- Every service method that queries tenant data takes companyId as a parameter
- Never use query parameters for companyId — always derive from authenticated session
```

**Definition of Done (every task):**
```
A task is done when:
1. The requirement is met (verifiable against acceptance criteria)
2. All tests pass (unit, integration, API, security as applicable)
3. pnpm lint passes with zero warnings
4. pnpm typecheck passes with zero errors
5. pnpm build succeeds
6. API docs updated (if endpoints changed)
7. Environment variable examples updated (if new env vars added)
8. Security requirements for this task are met
9. All blockers and assumptions are documented
```

---

## Document 7: Repository Structure

### What It Is
The folder layout for the project. Defines where every type of file lives.

### Standard Monorepo Structure

```
project-root/
├── apps/
│   ├── frontend/                    # Next.js application
│   │   ├── src/
│   │   │   ├── app/                 # App Router pages
│   │   │   │   ├── (public)/        # Unauthenticated routes
│   │   │   │   ├── (workspace)/     # Authenticated routes
│   │   │   │   └── layout.tsx
│   │   │   ├── components/          # Shared UI components
│   │   │   └── lib/                 # API client, utilities
│   │   └── package.json
│   │
│   ├── backend/                     # NestJS application
│   │   ├── src/
│   │   │   ├── modules/             # Domain modules
│   │   │   │   ├── auth/            # auth.module.ts, auth.service.ts, ...
│   │   │   │   ├── packages/
│   │   │   │   ├── bookings/
│   │   │   │   ├── finance/
│   │   │   │   └── admin/
│   │   │   ├── common/              # Guards, interceptors, decorators
│   │   │   ├── prisma/              # Prisma schema, migrations
│   │   │   └── main.ts
│   │   └── package.json
│   │
│   └── worker/                      # Optional: background jobs (BullMQ)
│
├── packages/
│   ├── shared/                      # Shared TypeScript types/constants
│   └── config/                      # Shared ESLint/TypeScript configs
│
├── tests/
│   └── e2e/                         # Playwright E2E tests
│
├── scripts/                         # Operational scripts
├── docker/                          # Docker support files
├── .github/
│   └── workflows/                   # CI/CD pipeline definitions
├── project-docs/                    # The 26 project documentation files
├── codex-handoff/                   # AI agent briefing pack
├── docs-system/                     # Reusable documentation framework
├── .env.example                     # All environment variables documented
├── CLAUDE.md                        # AI agent instructions
├── AGENTS.md                        # AI agent coding rules
└── README.md                        # Project setup and operation guide
```

The key principle: **one module = one domain**. Don't let the bookings module import from the finance module directly. Use events or dependency injection. Module boundaries enforce the architecture.
