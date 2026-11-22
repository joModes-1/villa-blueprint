# Layer 1 — Product Guide: Executive Summary, PRD, Risk Register, Open Questions

These are the four documents you write first. They answer WHY the project exists and WHO it's for. Every other document depends on getting these right. If these are wrong, everything downstream is wrong.

---

## Document 1: Executive Summary

### What It Is
A one-page document that any stakeholder — technical or non-technical — can read in under 5 minutes and understand the entire product. It is not marketing copy. It is a precise, honest summary of what is being built, for whom, and what "done" looks like.

### Why It Exists
Without a shared executive summary, different people on the project have different mental models of what the product is. This divergence compounds — the developer builds one thing, the stakeholder expects another, the AI agent implements a third.

### How to Write It

**Section 1: Product Overview (2–3 sentences)**
What is the product? What does it do? Who uses it?

*Bad:* "A platform that helps tourism businesses."
*Good:* "EU B2B Tourism Portal is a centralized platform connecting approved tour operators and travel agencies. Operators publish packages; agencies discover, book, and pay for them. Admins and finance users govern the platform."

**Section 2: Main Problem Solved (3–5 bullets)**
What specific pain does this eliminate? Be concrete. Reference the current manual process.

Template:
```
- [Role] currently [does X manually] which [causes pain Y]
- [Role] currently [does X manually] which [causes pain Y]
```

**Section 3: Target Users (table)**
List every user type and their primary role. Be exhaustive.

Template:
```
| User Type | Primary Role |
|---|---|
| Super Admin | Governs the entire platform |
| Operator Admin | Manages packages and bookings |
| Agency Staff | Discovers packages and submits bookings |
| Finance User | Reconciles invoices, payments, refunds |
```

**Section 4: Main Modules (bullet list)**
What functional modules does the MVP include? This becomes the boundary of scope.

**Section 5: Business Value (3–5 bullets)**
Why does this product justify the investment?

**Section 6: MVP Summary**
One paragraph. What is included in the MVP? What is explicitly deferred?

**Section 7: Production Expectations**
What non-functional requirements are expected at production? (auth, logging, testing, CI/CD, backups)

**Section 8: Major Assumptions and Risks (3–5 bullets)**
What must be true for this project to succeed? What is assumed but not yet confirmed?

### Common Mistakes
- Writing marketing language ("revolutionary", "seamless", "cutting-edge") — strip it out
- Not naming deferred features — someone will assume they're in scope
- Listing risks without naming mitigations
- Making it longer than one page — it will not be read

### Quality Test
Read the executive summary to someone who hasn't been in any project meetings. Ask them: "What does this product do?" and "Who uses it?" and "What's in the MVP?" If they can answer all three correctly, the document is good.

---

## Document 2: Product Requirements Document (PRD)

### What It Is
The most important document in Layer 1. It defines what users need to do (user stories), the rules the system must enforce (business rules), and the failure scenarios that must be handled (edge cases). Everything else derives from the PRD.

### Why It Exists
Without a PRD, requirements come from conversations that aren't recorded, from assumptions that differ by person, and from features added during development that never had a clear rationale. The PRD makes all of this explicit before code is written.

### How to Write It

#### Part A: Vision (1 paragraph)
The purpose of the product in terms of user value.

Template:
```
Enable [trusted/safe/efficient] [transactions/interactions] by giving [role A] 
a place to [action] and [role B] a place to [action] while [role C] maintains 
[governance/oversight/compliance].
```

#### Part B: Goals (3–5 numbered goals)
Concrete business outcomes, not features.

*Bad goal:* "Build a booking system"
*Good goal:* "Let agencies search, compare, book, and pay for packages after operator approval"

#### Part C: Non-Goals (bullet list)
This is as important as the goals. List every feature someone might reasonably expect that is NOT in this version.

Rule: If you've had a conversation where someone asked "will it do X?" and the answer was no, X belongs in non-goals.

Example:
```
- Tourist/traveler login portal
- Native iOS/Android apps
- Real-time inventory management
- Supplier dashboards
- Full CMS for marketing pages
```

#### Part D: Personas (table)
For each user type, define their problems and needs.

Template:
```
| Persona | Role Title | Main Problems | Key Needs |
|---|---|---|---|
| [Name] | [Job title] | [2–3 specific frustrations] | [2–3 specific capabilities needed] |
```

The persona's problems drive feature prioritization. If a feature doesn't solve a listed problem, question why it's in scope.

#### Part E: Core Workflows (numbered list)
Write out the primary end-to-end workflows as sequences. At least one per major user type.

Format:
```
1. [Trigger] → [Step 1] → [Step 2] → [Step 3] → [Outcome]
```

Example:
```
Booking Workflow:
1. Agency submits booking request → operator receives notification
2. Operator approves booking → invoice generated, agency notified
3. Agency initiates payment → hosted checkout → webhook confirms
4. Booking moves to confirmed → both parties notified
```

#### Part F: User Stories (table — the most important part)
This is the heart of the PRD. Every feature in the system must trace to a user story.

Required columns:
- ID (US-001, US-002, etc.)
- Story ("As a [role], I want [action] so that [value]")
- Priority (P0 = must have for launch, P1 = important but shippable without, P2 = nice to have)
- Acceptance Criteria (observable behaviors that prove the story is done)
- SRS Source (which SRS functional area covers this)

Rules for writing user stories:
- Every story must have a role, an action, AND a value (the "so that" part)
- P0 stories must all pass before any launch
- Acceptance criteria must be observable, not assumed
- Number stories — you will reference them by ID in other documents

Example:
```
| US-006 | As an agency, I want to submit booking requests so operators can review availability. | P0 |
Booking enters pending_operator_approval state; status event stored with actor; operator notified.
```

#### Part G: Business Rules (bullet list)
These are the invariants — things that must always be true, regardless of user action.

Format: "Rule: [statement]"

Examples from tourism project:
```
- Admin approval is required before any company can transact
- Payment can only be initiated after operator booking approval
- Platform collects payment first; operators receive payouts afterward
- No raw payment card data is stored anywhere in the system
- All sensitive actions must be recorded in audit logs
- Business records are soft-deleted, not hard-deleted
- Backend authorization is always authoritative (client-side auth is display-only)
```

Each business rule typically maps to one or more security requirements and one or more validation rules in the API.

#### Part H: Edge Cases (bullet list)
The failure scenarios that must be gracefully handled.

Think about:
- Duplicate actions (what if user submits twice?)
- Expired tokens (password reset, email verification)
- State race conditions (what if two people approve the same booking?)
- Missing dependencies (what if the payment provider is down?)
- Invalid combinations (what if someone tries to pay a cancelled booking?)
- Cross-entity violations (what if Agency A tries to access Agency B's booking?)

Example from tourism project:
```
- Duplicate company registration with same email
- Expired email verification token
- Unapproved company attempting to submit a booking
- Package with unavailable dates being booked
- Duplicate webhook event from payment provider
- Payment success event received after booking was cancelled
- MFA device lost — recovery flow
- Invalid file type or oversized file uploaded
- Cross-company access attempt (Agency A requesting Agency B's data)
```

#### Part I: Dependencies (bullet list)
External services, providers, and systems this product requires to function.

For each dependency: name, purpose, risk level (what happens if unavailable?).

#### Part J: Release Criteria (bullet list)
What must be true before this version ships?

Example:
```
- All P0 user stories pass their acceptance tests
- Critical E2E flows pass in staging
- Security checklist reviewed and passed
- Production deployment completed successfully
- Backups configured and tested
- All production-blocking open questions resolved
```

### Common Mistakes
- User stories without acceptance criteria (how do you know they're done?)
- Missing the "so that" value in user stories (forces you to think about why)
- Business rules described only in prose, not extracted as explicit rules
- Edge cases treated as "we'll handle them later" — they will destroy your state machine
- P0 stories that are actually P1 (leads to scope creep)

---

## Document 3: Risk Register

### What It Is
A table of everything that could go wrong, how likely it is, how bad it would be, and what you're doing about it.

### Why It Exists
Risks that are named and tracked get mitigated. Risks that are silently assumed get you at 11pm two weeks before launch.

### How to Write It

For every risk, capture:
- **Risk**: What could go wrong (specific, not vague)
- **Probability**: Low / Medium / High
- **Impact**: Low / Medium / High  
- **Mitigation**: What you're doing to prevent or reduce this risk
- **Owner**: Who is responsible for watching this risk

The combination of Probability × Impact determines priority:
- High × High = Critical — must be mitigated before coding starts
- High × Medium OR Medium × High = Important — mitigate before launch
- Low × Low = Monitor — document and watch

### Risk Categories to Think Through

**Technical Risks**
- Third-party integration not working as expected (payment providers, email, storage)
- Performance targets not achievable on chosen hosting tier
- Database design requiring significant revision mid-project

**Business/Product Risks**
- Legal/compliance requirements changing scope significantly
- Tax rules, refund policies, commission structures not yet decided
- Stakeholder requirements changing after development starts

**Security Risks**
- Sensitive data exposure (documents, financial data, PII)
- Cross-tenant data leakage
- Payment flow manipulation

**Operational Risks**
- Data loss (backup strategy not tested)
- No rollback plan for production issues
- Provider downtime affecting payments

### Template

```
| Risk | Probability | Impact | Mitigation | Owner |
|---|---|---|---|---|
| [Specific risk] | Low/Medium/High | Low/Medium/High | [Specific action] | [Name/Role] |
```

### Real Example from Tourism Project
```
| Payment provider sandbox not available | Medium | High | Validate Stripe/Pesapal accounts before payment task | Tech Lead |
| Booking/payment state inconsistency | Medium | High | Prisma transactions for all state changes; idempotency on webhooks | Engineer |
| Document URL leakage | Medium | High | Private R2 bucket; signed short-lived URLs; access audit | Engineer |
| Cross-tenant data leakage | Medium | High | Company-scoped services; RBAC tests on every endpoint | Engineer |
| Uganda tax rules unclear | Medium | Medium | Configurable tax placeholder; legal review before launch | Product |
```

---

## Document 4: Open Questions & Assumptions

### What It Is
A living list of everything you don't know yet, plus all the assumptions you're making in the absence of that knowledge.

### Why It Exists
This document is the most honest document in the project. It says: "here's what we built on, and here's what we assumed." Without it, assumptions silently become architectural decisions that are very hard to undo.

### How to Write It

**Section 1: Confirmed Decisions**
Decisions that were open but are now resolved. Include the resolution.

Example:
```
- Package manager: pnpm (confirmed by team)
- Auth provider: Clerk (confirmed; handles MFA and session management)
- Payment: Stripe (primary) + Pesapal (mobile money); both use hosted checkout
```

**Section 2: Open — Must Resolve Before Coding**
Items that will block implementation if not decided. These are P0.

Example:
```
- What exact tax/VAT rates apply to bookings? (affects invoice calculation)
- What is the refund cutoff policy? (affects booking lifecycle)
- Are there maximum file sizes for document uploads? (affects storage and UI)
```

**Section 3: Open — Must Resolve Before Launch**
Items that don't block early development but will block production deployment.

Example:
```
- Data retention durations for each record type
- Commission rate configuration (seeded vs configurable)
- Exact formula for dashboard revenue calculations
```

**Section 4: Can Decide Later**
Items that don't affect current scope.

Example:
```
- SMS notifications (v2 feature)
- Supplier portal (explicitly deferred)
- Multi-language support (English-first MVP)
```

### Rules for This Document
- Every assumption must be named, not implied
- Every open question must be assigned an owner and a "must resolve by" date or phase
- When a question is resolved, move it to Confirmed Decisions — don't delete it
- This document should be referenced by the risk register (unresolved P0 questions are risks)
