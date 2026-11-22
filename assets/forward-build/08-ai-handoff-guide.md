# AI Handoff Guide — How to Write the AI Briefing Pack

The AI briefing pack (called `codex-handoff/` in this project) is a separate folder of documents written specifically for AI agents. It is not a summary of the project docs — it is a carefully engineered briefing that tells an AI agent exactly what to build, in what order, with what constraints, and when to stop and ask.

Writing a good AI briefing pack is one of the highest-leverage things you can do for a project. A well-written pack means an AI can implement 80–90% of the system correctly without constant human correction. A poorly written pack means every task needs multiple rounds of rework.

---

## The 5 Files in the AI Briefing Pack

### File 1: CODEX_PROJECT_CONTEXT.md

**What it is:** A one-page summary the AI reads before every task. It must contain everything the AI needs to understand what it's building and why.

**What it must cover:**
1. What the system does (2–3 sentences, concrete)
2. Who uses it and what they do (role list)
3. The tech stack (exactly — framework versions, providers)
4. Security expectations (company scope, auth, MFA, webhooks, payment rules)
5. Primary MVP workflows (the key end-to-end flows)

**The critical constraint:** This file must be short enough to be read in 2 minutes. If it's long, the AI will summarize it and lose precision. Every sentence earns its place.

**Template:**
```markdown
# Project Context

The system is [one-sentence description]. [One sentence about the two main user types].
[One sentence about the core transaction or workflow].

## Tech Stack
Frontend: [Next.js version + TypeScript]
Backend: [NestJS version + TypeScript + REST /api/v1]
Database: [PostgreSQL + Prisma version]
Auth: [Provider + how RBAC works]
Storage: [Provider + access model]
Email: [Provider]
Payments: [Provider(s) + checkout model]
Monitoring: [Provider]
CI/CD: [Provider]
Hosting: [Provider]

## Security Model
[3–5 bullet points covering: multi-tenant isolation, auth, MFA requirements, 
payment rules, document access rules]

## Primary MVP Workflows
[Numbered list of the 4–6 core workflows, end-to-end]
```

**Real example from tourism project:**
```markdown
# Codex Project Context

The system is a B2B tourism portal. Operators publish packages; agencies manage clients 
and request bookings; operators approve before payment; agency pays through Stripe/Pesapal; 
webhooks confirm payment; finance/admin reconcile invoices, refunds, commissions, payouts; 
documents are stored in Cloudflare R2; admins govern companies/users/settings/audit.

Stack: Next.js, NestJS, PostgreSQL, Prisma, REST, Tailwind/shadcn, R2, Resend, 
Google Maps, Stripe, Pesapal, Sentry, Docker, GitHub Actions, Render/Railway.

Security: company-scoped RBAC, MFA privileged roles, signed URLs for private documents, 
verified webhooks, no raw cards, rate limits, audit logs.

Primary MVP workflows: registration/approval; package creation/publishing; package search; 
client/traveler management; booking submit/approve/pay/confirm; 
document upload/download; admin/finance dashboards.
```

This is 10 sentences. That's the right length.

---

### File 2: CODEX_IMPLEMENTATION_RULES.md

**What it is:** The non-negotiable rules for implementing any task. These are the rules the AI must follow before it knows any specifics about the current task.

**What it must cover:**
1. Implementation approach (how to think about each task)
2. Backend rules (framework patterns, validation, guards)
3. Frontend rules (component patterns, states)
4. Database rules (migrations, transactions, types)
5. API rules (versioning, error shapes, pagination)
6. Security rules (no hardcoded secrets, RBAC, webhooks, rate limits)
7. Testing rules (what must be tested at each level)
8. When to stop (the stop conditions that apply universally)

**The critical constraint:** These rules must be explicit enough that following them blindly produces correct code. Vague rules ("be secure", "write tests") are useless — the AI will interpret them as it pleases.

**Template:**
```markdown
# Implementation Rules

## Implementation Approach
Implement tasks in order. Read AGENTS.md, project context, and relevant project-docs 
before editing. Implement only the current task's scope. Preserve existing behavior.

## Backend (NestJS)
- Create a NestJS module per domain
- Use class-validator DTOs for all input validation
- Apply AuthGuard and PermissionGuard on every protected controller method
- Wrap all state transitions in Prisma transactions
- Use guard pattern, never conditional auth checks inline

## Frontend (Next.js)
- Use Next.js App Router route groups
- Tailwind + shadcn components only
- Every async UI state: loading / empty / error / success
- Accessible forms with proper ARIA labels

## Database (Prisma)
- Schema changes through migrations only (prisma migrate dev)
- UUIDs for all PKs
- DECIMAL for all monetary amounts
- deleted_at for soft deletes on business records
- Index every FK and every filtered/sorted column

## API
- All endpoints under /api/v1
- Error shape: { error: { code, message, details, requestId } }
- List shape: { items, page, pageSize, total, totalPages }
- OpenAPI decorators on all public endpoints

## Security (always)
- Never hardcode secrets in code
- Never log passwords, tokens, MFA codes, card data, passport data
- RBAC enforced server-side — never client-side only
- Verify all webhook signatures before processing
- Rate-limit auth, payment, webhook, upload, sensitive write endpoints

## Testing
- Unit tests for all domain service logic
- Integration/API tests for all endpoints (correct status + shape)
- RBAC tests for all protected endpoints (403 when wrong permission)
- Security tests for cross-company access (403, not 200 with empty data)

## When to Stop
Stop and ask (do not guess) if:
- A security decision is ambiguous
- A payment calculation is unclear  
- A state transition rule is missing from the docs
- An API contract conflicts with the specification
- A required dependency hasn't been implemented yet
```

---

### File 3: CODEX_TASKS_INDEX.md

**What it is:** The master list of all tasks in order, with their dependencies, expected output, and verification command. The AI reads this to know where any individual task fits in the whole.

**Format:**
```markdown
# Tasks Index

| Status | Task | Depends on | Expected output | Verification |
|---|---|---|---|---|
| Pending | [task-001-project-setup](tasks/task-001.md) | None | Monorepo, Docker, CI | pnpm lint && pnpm test && pnpm build |
| Pending | [task-002-database-schema](tasks/task-002.md) | task-001 | Prisma schema, migrations | pnpm lint && pnpm test && pnpm build |
...
```

**Rules for the task index:**
- Tasks must be in dependency order — never list a task before its dependency
- Status must be kept current (Pending / In Progress / Done) — stale status misleads the AI
- The verification column is the objective definition of "done" for that task
- Each task links to its detailed task file

---

### File 4: tasks/task-NNN-[name].md (Individual Task Files)

**What they are:** The most detailed documents in the pack. Each task file contains everything an AI needs to implement one chunk of the system correctly, without reading any other document first.

**The mandatory structure (every task must have all sections):**

```markdown
# Task [NNN]: [Short descriptive title]

## Goal
[One sentence. What is the deliverable?]

## Context
[Why this task exists in the sequence. What does it build on? What does it enable?]

## Requirements Covered
See project-docs/04-requirements-matrix.md; this task covers: [FR-xxx, SEC-xxx, ...]

## Dependencies
[Previous task(s) that must be complete before this task starts]

## Files and Areas Likely Affected
[List of directories and file patterns that will change]

## Instructions
1. [Specific step]
2. [Specific step]
...

## Constraints (NEVER do these)
- Never hardcode secrets
- Never skip authorization guards
- Never store raw card data
- Never remove input validation
- Never edit applied migrations
- Never implement Deferred requirements

## Security Notes
[Security rules specific to this task]

## Data/Database Notes
[DB rules specific to this task]

## API Notes
[API conventions specific to this task]

## UI Notes
[UI patterns specific to this task, if applicable]

## Tests Required
[Specific tests that must pass for this task to be done]

## Acceptance Criteria
[Observable, testable behaviors that prove completion]

## Verification Commands
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Expected Response
Summarize: what changed, files modified, tests run, blockers, follow-up tasks.

## Stop Conditions
Stop if: [specific scenarios where the AI must stop and ask]
```

**How to write good instructions for a task:**

Good instruction (specific, unambiguous):
```
3. Create apps/backend/src/modules/bookings/bookings.module.ts
   - Import BookingsController and BookingDomainService
   - Import PrismaModule and NotificationsModule as imports
   
4. Implement BookingDomainService with these methods:
   - submitBooking(agencyCompanyId, dto): creates booking in PENDING_OPERATOR_APPROVAL state,
     creates booking_status_event, triggers notification — all in one Prisma transaction
   - approveBooking(operatorCompanyId, bookingId): validates operator owns the package,
     transitions to APPROVED, creates invoice, triggers notification — all in one transaction
```

Bad instruction (vague, open to interpretation):
```
3. Create the bookings module
4. Implement booking creation and approval
```

The AI has no domain knowledge. It only knows what you tell it. Vague instructions produce average code. Specific instructions produce the exact code you designed.

**How to write acceptance criteria the AI can verify:**

The AI will try to verify its own work. Acceptance criteria must be verifiable by running commands or making HTTP calls — not by reading code.

Good:
```
- POST /api/v1/agency/bookings with valid body returns 201 with status PENDING_OPERATOR_APPROVAL
- POST /api/v1/agency/bookings without Authorization header returns 401
- POST /api/v1/agency/bookings with operator account (bookings:approve permission but not bookings:submit) returns 403
- POST /api/v1/operator/bookings/{id}/approve when booking is already approved returns 200 (idempotent)
```

Bad:
```
- Booking system works correctly
- Permissions are enforced
```

**The stop conditions are the most important part:**

Stop conditions exist to prevent the AI from guessing at critical decisions. The three categories that must always be stop conditions:

1. **Security decisions** — rate limit values, audit log scope, permission granularity
2. **Financial decisions** — commission calculations, refund eligibility, payment amounts
3. **API contract decisions** — any change to endpoint paths, request shapes, or response shapes that would break existing callers

---

### File 5: AGENTS.md

**What it is:** The definition of done and quality gates. The AI reads this to know what standard every task must meet before it's considered complete.

**What it must cover:**
1. Architecture principles (the high-level decisions from your ADRs, condensed)
2. Coding rules (specific, not general — "use Prisma transactions for state changes", not "write good code")
3. Definition of done (the checklist that applies to every single task)
4. Security rules (reiterated from the implementation rules)
5. Stop conditions (reiterated — important enough to appear in multiple places)

**The Definition of Done section is critical:**
```markdown
## Definition of Done

A task is complete when ALL of the following are true:
- [ ] Requirement implemented and verifiable against acceptance criteria
- [ ] pnpm lint passes (zero warnings)
- [ ] pnpm typecheck passes (zero errors)
- [ ] pnpm test passes (all tests green)
- [ ] pnpm build succeeds
- [ ] Unit tests added for all new domain logic
- [ ] API tests added for all new endpoints (correct status + shape)
- [ ] RBAC tests added for all new protected endpoints (403 cases)
- [ ] API docs updated if endpoints changed
- [ ] .env.example updated if new env vars added
- [ ] Blockers and assumptions documented in task response
```

---

## Common AI Handoff Pack Mistakes

**Not being specific enough in instructions**
"Implement the booking approval flow" is 10% of what a task instruction should say. You need to name the files, the methods, the exact state transitions, the side effects, the tests.

**Missing stop conditions**
Without stop conditions, an AI will guess when it hits an ambiguity. For payment logic, security decisions, and API contracts, guessing is dangerous. Stop conditions are not optional.

**Tasks that are too large**
A task covering 40 endpoints is too large. The AI will prioritize breadth over depth and miss edge cases, validation, and tests. Tasks covering 8–12 endpoints are about right.

**Tasks without verification commands**
Without a verification command, there's no way to know if the AI's implementation actually works. Every task needs at least `pnpm lint && pnpm test && pnpm build`.

**Outdated task status in the index**
An AI that reads "Status: Pending" on task-003 when task-003 is already done may re-implement it. Keep the task index status current.

**No context section in task files**
Without context, the AI doesn't understand WHY a task exists. It may implement the literal instruction but miss the intent. The context section is what prevents that.

**Contradictions between task files and project docs**
If a task file says one thing and the API spec says another, the AI may choose the wrong one. Before running an AI on a task, verify the task file matches the current state of the project docs.

---

## How to Write the AI Pack: The Process

1. Complete Layers 1–6 of the project docs first
2. Write CODEX_PROJECT_CONTEXT.md (compress the architecture into one page)
3. Write CODEX_IMPLEMENTATION_RULES.md (extract the rules from Layers 3–5)
4. Write AGENTS.md (extract definition of done from the coding standards)
5. Write task files in order (task-001 first, then 002, etc.)
   - For each task, start from the relevant sections of the API spec and requirements matrix
   - Write the instructions based on the architecture and coding standards
   - Write the acceptance criteria directly from the API spec's expected behaviors
   - Write the stop conditions based on what's ambiguous in the requirements
6. Write CODEX_TASKS_INDEX.md last (it links to all the task files)

The entire AI pack should take 1–2 days to write after the 26 project docs are complete. If it takes longer, your project docs aren't specific enough yet.
