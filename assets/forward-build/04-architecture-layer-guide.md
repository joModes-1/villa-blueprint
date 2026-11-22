# Layer 3 — Architecture Guide: System Architecture, ADRs, Auth/Permissions, Security

These four documents define HOW the system is structured and WHY. They are written after requirements are stable, because architecture decisions that are made before requirements are complete get reversed. Each document here makes decisions that are expensive to undo — treat them as semi-permanent choices.

---

## Document 1: System Architecture

### What It Is
A description of the system's structural components, their responsibilities, and how they communicate. The goal is that any developer can read this and understand where code lives, what calls what, and how data flows.

### Why It Exists
Without a system architecture document, every developer makes different assumptions about structure. One puts business logic in the controller; another in a service; another in a utility. One builds direct DB calls from the frontend; another insists on API-only. The architecture document is the shared map.

### How to Write It

**Section 1: System Overview Diagram**
Draw the system as a diagram first. Then describe it in prose.

The standard layers:
```
┌─────────────────────────────────────────┐
│  Browser / Client App (Next.js)         │
└──────────────────┬──────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────┐
│  API Server (NestJS)                    │
│  - Auth/RBAC Guards                     │
│  - Domain Modules                       │
│  - DTO Validation                       │
└──────┬──────┬──────┬──────┬────────────┘
       │      │      │      │
    DB/ORM  Storage Email  Payment
  (Postgres) (R2)  (Resend) (Stripe)
```

For each box, name it, give its technology, and state its responsibility in one sentence.

**Section 2: Component Responsibilities**
For each component:
- Name
- Technology
- Single-sentence responsibility
- What it does NOT do (important boundaries)

Example:
```
NestJS API Server
- Technology: NestJS + TypeScript, REST /api/v1
- Responsibility: Handle all authenticated requests; enforce RBAC; orchestrate domain logic; persist to PostgreSQL
- Does NOT: Serve frontend files; store raw files; handle payment logic directly (delegates to adapters)
```

**Section 3: Request Flow (for key scenarios)**
Trace a complete request through the system for 2–3 scenarios.

Example:
```
Agency submits booking:
1. Browser → POST /api/v1/agency/bookings (with Clerk bearer token)
2. AuthGuard: verifies token, loads user + company membership
3. PermissionGuard: checks company approved + user has bookings:submit permission
4. BookingController: validates DTO (packageId, dates, travelerIds)
5. BookingDomainService: checks package availability, creates booking in pending_operator_approval state, creates status event, triggers notification
6. NotificationService: creates in-app notification + queues email via Resend
7. Response: 201 with booking ID and status
```

**Section 4: Data Architecture**
Which database? What ORM? What are the key principles?

Example:
```
- PostgreSQL (primary data store, single source of truth)
- Prisma ORM (type-safe queries, migration management)
- No Redis/cache in MVP (use indexes and pagination first; add cache when measured)
- All booking/payment/refund transitions in DB transactions
- Cloudflare R2 for file bytes (metadata in PostgreSQL)
```

**Section 5: Integration Architecture**
For each external service: what it does, how the system talks to it, what happens if it's unavailable.

**Section 6: Background Jobs Strategy**
How are async operations handled? (MVP usually synchronous; future async via BullMQ/Redis)

**Section 7: Error Handling Architecture**
How errors propagate through the system. Standard error shape. What goes to Sentry vs what goes to the response.

**Section 8: Scaling Strategy**
What design decisions enable future scale?
- Stateless API (no in-memory session state) → horizontal scale ready
- Pagination on all list endpoints → large dataset ready
- DB indexes on all filter/sort fields → query performance ready
- Job queue interface (even if synchronous in MVP) → async ready

### The Architecture Principles to State Explicitly
Every architecture document should state which principles were applied:

From this project's example:
```
1. Modular monolith (not microservices) — single deployable, module boundaries by convention
2. REST, not GraphQL — simpler, better tooling, AI-implementation-friendly
3. Backend is authoritative — all permission checks happen server-side
4. No raw SQL except reports — Prisma queries for all domain operations
5. One DB transaction per state transition — booking approval, payment, refund all atomic
6. Private storage only for sensitive documents — R2 signed URLs, never public buckets for docs
```

---

## Document 2: Technology Stack & Architecture Decision Records (ADRs)

### What ADRs Are
An Architecture Decision Record (ADR) documents a significant technical choice: what you chose, what you considered, why you chose it, and what you gave up. Every major technology decision in the stack should have an ADR.

### Why ADRs Exist
Without ADRs, 6 months later nobody knows why a choice was made. A new developer asks "why are we using X?" and the answer is "that's just how it is." ADRs prevent this. They also prevent relitigating settled decisions every time a new team member joins.

### What Needs an ADR
Any decision that:
- Is hard to reverse (changing your ORM mid-project is expensive)
- Has meaningful alternatives (there was a real choice to make)
- Will be questioned in the future ("why didn't we just use X?")
- Has consequences that affect how code is written

Typical ADRs for a web application:
- Frontend framework (Next.js vs React SPA vs Vue vs Remix)
- Backend framework (NestJS vs Express vs Fastify vs Django vs Rails)
- Database (PostgreSQL vs MySQL vs MongoDB vs DynamoDB)
- ORM (Prisma vs TypeORM vs Drizzle vs raw SQL)
- API style (REST vs GraphQL vs tRPC vs gRPC)
- Authentication (Clerk vs Auth0 vs Supabase Auth vs first-party JWT)
- Architecture pattern (monolith vs microservices vs modular monolith)
- Hosting (Render/Railway vs AWS vs GCP vs VPS)
- Testing strategy (% coverage, which test types, which E2E framework)
- State management (client-side: Zustand vs Redux vs TanStack Query)
- File storage (R2 vs S3 vs Azure Blob vs local disk)
- Background jobs (sync vs BullMQ vs Temporal vs SQS)

### The ADR Format

```markdown
## ADR-[number]: [Short descriptive title]

**Status**: Accepted | Proposed | Deprecated | Superseded by ADR-[n]

**Context**
Why did this decision need to be made? What problem are we solving? What constraints exist?

**Decision**
What we chose.

**Alternatives Considered**
| Option | Why rejected |
|---|---|
| [Option A] | [Reason it was not chosen] |
| [Option B] | [Reason it was not chosen] |

**Consequences**
What we gain from this decision.
What we lose or must manage as a result.

**Review Trigger**
What would cause us to revisit this decision? (e.g., "if concurrent users exceed 50,000", "if we need multi-region")
```

### Real ADR Example (from tourism project)

```markdown
## ADR-005: Authentication Provider

**Status**: Accepted

**Context**
The system needs user identity management (sign-up, login, email verification, password reset, MFA) 
AND business-level authorization (company approval gates, role-based permissions scoped to a company). 
These are different concerns. Building first-party auth from scratch introduces significant security risk.

**Decision**
Clerk for identity operations (sign-in, sign-up, email verification, MFA, session tokens).
PostgreSQL/Prisma for business authorization (company memberships, roles, permissions, approval state).
Every protected API request: verify Clerk bearer token → map to local user → load company membership → 
check permission.

**Alternatives Considered**
| Option | Why rejected |
|---|---|
| First-party JWT | High security risk; token rotation, refresh, MFA are complex to get right |
| Auth0 | Similar to Clerk but more complex setup; Clerk has better developer experience |
| Magic link only | Not suitable for B2B; users need password-based access with MFA |
| SSO-only | Too restrictive for MVP; most agencies/operators don't have SSO infrastructure |

**Consequences**
Gain: MFA, session security, email verification handled by experts; local team focuses on business logic.
Manage: Local users must be linked to Clerk IDs; every new environment needs Clerk application setup.
Manage: Clerk becomes a production dependency; outage means no login.

**Review Trigger**
If we need self-hosted auth for data residency compliance, or if Clerk pricing becomes prohibitive at scale.
```

### How Many ADRs Do You Need?
Write one ADR for every technology choice that would take more than one meeting to revisit. For a typical web application, expect 8–12 ADRs. For this project: 11 ADRs covered the full stack.

---

## Document 3: Authentication, Authorization & Permissions

### What It Is
A complete specification of who is allowed to do what. This includes the role definitions, the permission matrix, how authentication works, how authorization is enforced, and how sessions are managed.

### Why It Exists
Without this document, authorization logic is scattered, inconsistent, and wrong. Some endpoints check permissions, some don't. Some check the right thing, some check the wrong thing. This document is the specification that makes authorization testable.

### How to Write It

**Section 1: Roles**
List every role in the system with a one-sentence description.

Example:
```
| Role | Description |
|---|---|
| Super Admin | Full platform access; manages platform settings, company approvals, all data |
| Platform Staff/Admin | Manages day-to-day admin tasks under Super Admin oversight |
| Operator Admin | Full access within their company; manages packages, staff, bookings |
| Operator Staff | Manages bookings and packages within their company; cannot manage staff |
| Agency Admin | Full access within their agency; manages clients, bookings, staff |
| Agency Staff | Manages clients and bookings within their agency |
| Finance/Accountant | Read access to all financial data; can process refunds |
| Guest | Unauthenticated; can only access public endpoints |
```

**Section 2: Permission Matrix**
The most important part. For every significant action in the system, which roles can perform it?

Format: rows = actions, columns = roles. Cell = Y (allowed), N (denied), O (owner only)

```
| Action | Super Admin | Operator Admin | Operator Staff | Agency Admin | Agency Staff | Finance |
|---|---|---|---|---|---|---|
| Approve company | Y | N | N | N | N | N |
| Create package | N | Y | Y | N | N | N |
| Publish package | N | Y | N | N | N | N |
| Submit booking | N | N | N | Y | Y | N |
| Approve booking | N | Y | Y (own packages) | N | N | N |
| Initiate payment | N | N | N | Y | N | N |
| View all payments | Y | N | N | N | N | Y |
| Issue refund | Y | N | N | N | N | Y |
| View audit logs | Y | N | N | N | N | N |
| Manage platform settings | Y | N | N | N | N | N |
```

**Section 3: Authentication Flow**
Step-by-step: how does a user go from "not logged in" to "authenticated and authorized"?

Example:
```
1. User submits login credentials to Clerk
2. Clerk verifies credentials, returns session token (JWT)
3. Browser stores session token
4. Browser sends session token in Authorization: Bearer header on every API request
5. NestJS AuthGuard intercepts the request
6. AuthGuard verifies the token with Clerk's public key
7. AuthGuard maps the verified Clerk user ID to local user record
8. AuthGuard loads the user's company membership and role
9. PermissionGuard checks the requested action against the role's permissions
10. If denied: 403 Forbidden
11. If approved: request proceeds to controller
```

**Section 4: Company Approval Gate**
For applications with a company onboarding approval:

```
Every request from an operator or agency user must pass two checks:
1. User is authenticated (valid session token)
2. User's company has status = approved

An unapproved company (pending_review, rejected, suspended) gets 403 on all 
protected company-scoped endpoints, even if the user is authenticated.
```

**Section 5: Tenant Scoping**
The most important data security rule:

```
Every database query for company-scoped data must include a companyId filter.
No query may return data from multiple companies in a single response.
The companyId used in queries always comes from the authenticated session — 
never from a request parameter (to prevent cross-tenant access).
```

This rule, if violated, is the most common cause of serious data breaches in multi-tenant applications.

**Section 6: MFA Enforcement**
Which roles require MFA? Under what conditions is it required?

**Section 7: Session Management**
Token lifetime, refresh strategy, logout invalidation.

**Section 8: Permission Names (code constants)**
List the exact permission string names used in code, so they're consistent across the codebase.

Example:
```
companies:manage, companies:approve
packages:manage, marketplace:browse
bookings:submit, bookings:approve
payments:initiate, payments:manage
clients:manage
documents:manage
reports:view
settings:manage
audit_logs:view
```

---

## Document 4: Security Requirements & Threat Model

### What It Is
A systematic analysis of what sensitive data exists, who might want to steal or manipulate it, what attacks they could use, and what you're doing to prevent each attack.

### Why It Exists
Security designed in from the start costs 10x less than security bolted on after launch. A threat model forces you to think adversarially BEFORE writing the code that handles sensitive data. The threat model drives security requirements, which drive test cases, which drive the security hardening task.

### How to Write It

**Section 1: Sensitive Assets**
List every piece of sensitive data the system handles.

Categories to check:
- Authentication: passwords, session tokens, refresh tokens, MFA secrets, recovery codes
- Financial: payment provider references, invoice amounts, payout data, commission rates
- PII (Personally Identifiable Information): names, email addresses, passport numbers, visa copies, emergency contacts
- Business: booking details, package pricing, company registration data
- Infrastructure: R2 object keys, payment provider webhook secrets, API keys

Example list from tourism project:
```
Passwords, refresh tokens, MFA secrets, recovery codes, passport copies, visa documents, 
emergency contact details, driver's license data, invoice amounts, payment provider 
references, refund data, payout data, Cloudflare R2 object keys, payment provider 
webhook signing secrets, audit log contents.
```

**Section 2: Threat Table**
For each realistic threat, document: what it is, the impact, the likelihood, the mitigation, and how to verify the mitigation works.

```
| Threat | Impact | Likelihood | Mitigation | Verification |
|---|---|---|---|---|
| Credential stuffing | Account takeover | Medium | Rate limits + strong hashing + MFA for privileged roles | Auth tests |
| Cross-tenant IDOR | Data breach | High | Company-scoped queries always include companyId from session | RBAC tests |
| Document URL leakage | Sensitive data exposure | Medium | Private R2 bucket; signed short-lived URLs; access audit | Document tests |
| Webhook forgery | False payment confirmation | Medium | Signature verification; provider IP allowlist | Webhook tests |
| Duplicate webhook | Double payment/refund | High | Unique provider event IDs; idempotency in DB transactions | Idempotency tests |
| File upload abuse | Malware/storage compromise | Medium | MIME type allowlist; file size limits; private storage only | Upload tests |
| SQL injection | Database compromise | Low | Prisma parameterized queries; no raw SQL except reports | Code review |
| Secrets in logs | API key/provider compromise | Medium | Log redaction rules; no passwords/tokens in log output | Log audit |
| Insider admin abuse | Data theft | Medium | Least privilege; MFA for admin; immutable audit logs | Permission review |
```

**Threat Table: How to Think About Each Threat**

For Likelihood: How easy is this attack to execute? Does it require a sophisticated attacker or anyone with an internet connection?
- Low = requires significant technical skill or physical access
- Medium = requires some technical skill; automated tools exist
- High = trivial; script kiddie level; automated at scale

For Impact: What's the worst-case outcome if the attack succeeds?
- Low = minor inconvenience; no data exposure; easily recovered
- Medium = data exposure for individual user; recoverable with effort
- High = mass data breach; financial fraud; unrecoverable reputation damage

**Section 3: Secure Coding Rules**
A list of non-negotiable rules for every developer and AI agent.

Example from tourism project:
```
1. Validate all inputs at the API boundary (DTO validation, not just frontend)
2. Never hardcode secrets (API keys, passwords, connection strings) in source code
3. Never log sensitive data (passwords, tokens, MFA codes, card data, passport data)
4. Enforce authorization server-side on every protected endpoint (not just frontend)
5. Use Prisma parameterized queries; never concatenate user input into SQL
6. Rate-limit all auth, payment, webhook, upload, and sensitive write endpoints
7. Hash passwords with bcrypt (cost factor ≥ 12); never store plaintext
8. Verify every payment webhook signature before processing
9. Use HTTPS in all non-local environments
10. Store private documents with signed URLs only; never expose R2 object keys
11. Write an audit log entry for every: auth event, company approval/rejection, 
    booking approval, payment/refund, document access, admin settings change
```

**Section 4: Security Acceptance Criteria**
The specific behaviors that must pass before the system ships.

```
- [ ] All P0 endpoints have auth AND permission tests (not just "does it return 200")
- [ ] MFA enforced and tested for Super Admin and Finance roles
- [ ] Rate limiting tested and working on login, password reset, webhooks, uploads
- [ ] No raw card data anywhere — tested by request/response audit and DB check
- [ ] Cross-company access returns 403 — tested with explicit cross-tenant test cases
- [ ] Private documents only accessible through signed URLs after RBAC check
- [ ] Payment/refund state cannot change without verified webhook signature
- [ ] Webhook signing secrets configured per environment (not shared across staging/prod)
- [ ] No secrets/tokens/passwords in log output — tested with log output review
- [ ] CI includes dependency vulnerability scan
```

### The Security Mindset for Documentation
When writing any other document, always ask:
- "If an attacker could control this input, what could they do?"
- "If an attacker could observe this output, what would they learn?"
- "If this action could be repeated N times, what's the worst outcome?"
- "If the wrong person can call this endpoint, what data do they gain?"

Every "yes" answer to these questions is a security requirement that goes into the threat model and the SRS.
