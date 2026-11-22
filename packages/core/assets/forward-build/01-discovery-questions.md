# Discovery Questions — The Complete Input-Gathering Guide

Before writing a single document, you must answer these questions. Every question maps to at least one document. Unanswered questions at this stage become assumptions that silently corrupt your design.

**How to use this file:**
- Work through every category before starting any Layer 1 doc
- Mark each question ANSWERED, ASSUMED (state the assumption explicitly), or DEFERRED (note it in Open Questions)
- Never leave a P0 question unanswered without an explicit assumption recorded

---

## Category 1: Business Context

These questions determine what the product is and why it needs to exist. They feed: Executive Summary, PRD, Risk Register.

**Q1.1 — What is the one-sentence description of this product?**
- Feed: Executive Summary
- Why it matters: If you cannot state this in one sentence, the scope is not clear enough to build
- Example: "A B2B tourism portal where tour operators publish packages and travel agencies book and pay for them"

**Q1.2 — What specific problem does this solve? What is painful, slow, or broken today?**
- Feed: Executive Summary, PRD vision
- Why it matters: The problem statement determines which features are core vs nice-to-have
- Bad answer: "There's no digital solution"
- Good answer: "Operators and agencies coordinate bookings over WhatsApp and email, with no record of approvals, no digital invoicing, and no payment tracking"

**Q1.3 — Who is the primary paying customer? Who is the primary user? Are they the same person?**
- Feed: PRD personas
- Why it matters: If the person who pays is not the person who uses, you have two different sets of requirements to satisfy
- Example: Platform admin pays the subscription; tour operators and agencies use the product daily

**Q1.4 — What does success look like at 3 months? At 12 months?**
- Feed: Executive Summary, Risk Register
- Why it matters: Defines the MVP boundary; features that don't contribute to 3-month success are probably deferred
- Example: "At 3 months: 10 operators, 20 agencies, first live payment processed. At 12 months: 100 operators, 500 bookings/month"

**Q1.5 — What is explicitly NOT in scope for this version?**
- Feed: PRD non-goals, Requirements Matrix (Deferred column)
- Why it matters: Explicitly stating non-goals prevents scope creep and stakeholder misalignment
- Example: "No tourist login, no mobile app, no supplier portals, no real-time inventory"

**Q1.6 — What are the must-have business rules that can never be broken?**
- Feed: PRD business rules
- Why it matters: These rules drive validation logic, state machines, and edge case handling
- Examples from tourism project: "Payment only after operator approval", "Platform collects first", "No raw card storage", "Admin must approve before transactions"

**Q1.7 — Are there regulatory, legal, or compliance requirements?**
- Feed: Security Threat Model, NFRs, Open Questions
- Why it matters: Compliance requirements can fundamentally change the architecture (e.g., GDPR forces data residency decisions, PCI-DSS forbids raw card storage)
- Examples: GDPR data residency, Uganda tax/VAT rules, PCI-DSS for payments, HIPAA for health data

**Q1.8 — What geography/jurisdiction does this operate in?**
- Feed: Executive Summary, NFRs, Open Questions
- Why it matters: Affects legal compliance, payment providers, language, currency, and hosting location

---

## Category 2: Users & Personas

These questions define who uses the system. They feed: PRD, Auth/Permissions, UI/UX Spec.

**Q2.1 — List every type of user who will interact with the system**
- Feed: PRD personas, Auth/Permissions matrix
- Why it matters: Every user type needs its own permission set; missing a user type means missing requirements
- Prompt: Think about all human actors — not just end users but also admins, operators, finance users, support staff
- Example from tourism: Super Admin, Platform Staff, Operator Admin, Operator Staff, Agency Admin, Agency Staff, Finance User, Guest (unregistered)

**Q2.2 — For each user type: what are the 3–5 most important things they need to do?**
- Feed: PRD user stories
- Why it matters: These become your user stories. Every feature in the system should trace back to one of these needs
- Format: "As a [role], I need to [action] so that [value]"

**Q2.3 — For each user type: what would make their experience a failure?**
- Feed: PRD edge cases, NFRs
- Why it matters: Failure scenarios drive validation, error handling, and edge case coverage
- Example: "Agency can't see packages from operators they haven't worked with" → broken search/discovery

**Q2.4 — Are there users who need to be prevented from seeing each other's data?**
- Feed: Security Threat Model, Auth/Permissions, DB Design (tenant scoping)
- Why it matters: Multi-tenant isolation is a fundamental architectural decision that affects every query
- Example: Agency A must never see Agency B's clients, bookings, or invoices

**Q2.5 — Are there users who can act on behalf of other users?**
- Feed: Auth/Permissions, Domain Model
- Why it matters: Creates delegation/impersonation scenarios that need explicit permission modeling

**Q2.6 — What privileged roles need extra security (MFA, audit trails)?**
- Feed: Security Threat Model, Auth/Permissions
- Why it matters: Privileged roles (admins, finance) accessing sensitive data need stronger authentication and complete audit trails
- Example: Super Admin, Finance User, anyone who can approve or refund payments

---

## Category 3: Functional Scope

These questions define what the system does. They feed: PRD, SRS, Domain Model, API Spec.

**Q3.1 — Walk through the complete primary workflow end-to-end**
- Feed: PRD core workflows, Domain Model state machines
- Why it matters: The primary workflow defines the minimum set of features needed for the product to deliver value
- Example: Register → Verify → Approve → Create Package → Search → Submit Booking → Approve Booking → Invoice → Pay → Confirm → Complete

**Q3.2 — What are the secondary workflows?**
- Feed: SRS functional requirements
- Why it matters: Secondary workflows (cancellations, refunds, re-invitations) must be planned even if less common
- Example: Cancellation → Refund Request → Refund Approval → Provider Refund → Invoice Adjustment

**Q3.3 — What entities (nouns) exist in the system?**
- Feed: Domain Model, Database Design
- Why it matters: These are your database tables, your API resources, your UI components
- Method: List every noun from your primary and secondary workflows
- Example: User, Company, Membership, Package, Availability, Pricing, Client, Traveler, Booking, Invoice, Payment, Refund, Document, Notification, AuditLog

**Q3.4 — For each entity, what states can it be in?**
- Feed: Domain Model (state machines)
- Why it matters: States define validation rules, transition guards, and UI displays
- Example: Booking states: draft → submitted → pending_operator_approval → approved → payment_pending → paid → confirmed → completed → cancelled → refunded

**Q3.5 — What are the state transition rules? (Who can trigger which transition, under what conditions?)**
- Feed: Domain Model, Auth/Permissions, API Spec
- Why it matters: Invalid transitions are a major source of bugs and security vulnerabilities
- Example: "Only the booking's operator can approve it", "Payment can only be initiated on an approved booking", "Booking cannot be cancelled after payment succeeds"

**Q3.6 — What notifications does the system need to send?**
- Feed: SRS, Domain Model (domain events), Integration requirements
- Why it matters: Notifications are often underspecified — list every event that triggers a notification and to whom
- Example: Company approved/rejected → to operator; Booking submitted → to operator; Booking approved → to agency; Payment confirmed → to both

**Q3.7 — What files/documents does the system need to handle?**
- Feed: SRS, Security Threat Model, Storage requirements
- Why it matters: File handling has unique security requirements (MIME validation, size limits, private storage, signed URLs)
- Questions to answer: Who uploads? Who downloads? What file types? How large? Public or private? How long retained?

**Q3.8 — What reports or dashboards does each role need?**
- Feed: SRS, PRD user stories, API Spec
- Why it matters: Reports are often underspecified. Define the key metrics per role and the data that drives them
- Example: Finance needs: total bookings, total revenue, outstanding invoices, refunds pending. Operator needs: upcoming bookings, capacity by package, revenue by month.

---

## Category 4: Technical Constraints

These questions define technical decisions. They feed: ADRs, System Architecture, Tech Stack.

**Q4.1 — Is the tech stack already decided, or do you have freedom to choose?**
- Feed: ADRs
- Why it matters: If stack is mandated, your ADRs document why it was mandated. If free, your ADRs document your selection rationale.

**Q4.2 — What are the performance targets?**
- Feed: NFRs
- Why it matters: Performance targets drive caching strategy, pagination, database indexing, and hosting tier
- Questions to answer: How many concurrent users at launch? At peak? What's the p95 response time target? What's the acceptable page load time?

**Q4.3 — What are the availability/reliability targets?**
- Feed: NFRs, DevOps
- Why it matters: 99.9% uptime (8.7 hours/year downtime) has different architecture than 99.99% (52 minutes/year)
- Questions to answer: What uptime % is required? What is the acceptable recovery time after an incident (RTO)? How much data loss is acceptable (RPO)?

**Q4.4 — Does the system need to scale horizontally?**
- Feed: System Architecture, ADRs
- Why it matters: Horizontal scaling means stateless API design, no local file storage, session management decisions

**Q4.5 — Are there existing systems this must integrate with?**
- Feed: SRS Integration requirements, System Architecture
- Why it matters: Each integration is a dependency that can block progress; they need accounts, APIs, and sandbox access
- For each: What does it do? What credentials are needed? Does a sandbox exist? Who owns the account?

**Q4.6 — What are the hosting/deployment constraints?**
- Feed: ADRs, DevOps
- Why it matters: Managed services (Render/Railway) vs cloud providers (AWS/GCP) have very different operational requirements and costs

**Q4.7 — What browsers/devices must be supported?**
- Feed: NFRs, UI/UX Spec
- Why it matters: IE11 support or mobile-first design have significant UI/frontend implications

---

## Category 5: Security & Compliance

These questions define your attack surface. They feed: Security Threat Model, Auth/Permissions, SRS security requirements.

**Q5.1 — List every piece of sensitive data the system will store or process**
- Feed: Security Threat Model (sensitive assets)
- Why it matters: Each sensitive asset needs its own protection strategy
- Categories to think through: Authentication credentials, financial data, payment methods, PII (names, passports, IDs), health data, private documents, API keys and secrets
- Example from tourism: passwords, refresh tokens, MFA secrets, passport copies, visa copies, payment provider references, R2 object keys

**Q5.2 — What is the worst-case breach scenario?**
- Feed: Security Threat Model
- Why it matters: Forces you to think about your highest-impact threats
- Examples: "Attacker gains access to all booking records" → cross-tenant IDOR; "Attacker triggers fake payment confirmations" → webhook forgery

**Q5.3 — What external parties call into the system, and how is their identity verified?**
- Feed: Security Threat Model, API Spec (webhook endpoints)
- Why it matters: Webhooks from payment providers are the most common source of financial fraud if not verified
- Example: Stripe webhooks must be verified with the Stripe signing secret; Pesapal callbacks must be verified similarly

**Q5.4 — What authentication method will be used? First-party or managed provider?**
- Feed: ADRs (ADR-005 in this project), System Architecture, Auth/Permissions
- Why it matters: Managed auth providers (Clerk, Auth0, Supabase Auth) handle session security, MFA, and token rotation. First-party auth is risky if not implemented very carefully.

**Q5.5 — What is the rate limiting strategy?**
- Feed: Security Threat Model, NFRs, API Spec
- Why it matters: Without rate limits, every auth, payment, and upload endpoint is vulnerable to abuse
- Questions to answer: Which endpoints need rate limits? What are the limits (e.g., 5 login attempts per minute)? How is the limit keyed (by IP, by user, by API key)?

**Q5.6 — What needs to be audited?**
- Feed: Security Threat Model, Domain Model (AuditLog entity)
- Why it matters: Audit logs are non-negotiable for any action involving money, access decisions, or sensitive data changes
- Example: auth events, company approval/rejection, booking approval, payment/refund, document access, admin settings changes

---

## Category 6: Integrations & External Services

These questions define third-party dependencies. They feed: SRS integration requirements, System Architecture, ADRs, Open Questions.

**Q6.1 — List every external service the system will use**
- Feed: System Architecture, ADRs
- For each: Name, purpose, who owns the account, sandbox available?, cost model

**Q6.2 — For payment processing: which providers? Do they have hosted checkout?**
- Feed: ADRs, Security Threat Model, API Spec
- Why it matters: Raw card processing (not using hosted checkout) requires PCI-DSS compliance — a massive scope increase
- Non-negotiable: Always use hosted checkout (Stripe, Pesapal) for payment. Never handle raw card data.

**Q6.3 — For file storage: what provider, what access model?**
- Feed: ADRs, Security Threat Model
- Why it matters: Files can be public (images) or private (documents). Private files must never be served directly; they need signed URLs.

**Q6.4 — For email: transactional or marketing? Which provider?**
- Feed: SRS, System Architecture
- Why it matters: Transactional email (booking confirmations) is different from marketing email; they have different compliance requirements

**Q6.5 — Are any integrations not yet confirmed? Which are blockers?**
- Feed: Risk Register, Open Questions
- Why it matters: An unconfirmed payment provider is a P0 blocker — it can halt the project if their sandbox or account setup takes weeks

---

## Category 7: Data & Privacy

These questions define data lifecycle. They feed: Domain Model, Database Design, Security Threat Model.

**Q7.1 — How long is each type of data retained?**
- Feed: Database Design (soft delete strategy), Open Questions
- Why it matters: Retention policy affects storage costs, legal compliance, and whether soft-delete or hard-delete is appropriate
- Example: "Booking records: 7 years", "Audit logs: indefinite", "Session tokens: 30 days", "Documents: until company account closed"

**Q7.2 — What data must never be deleted (even by admins)?**
- Feed: Database Design, Domain Model
- Why it matters: Financial records (invoices, payments) and audit logs typically must be immutable for compliance
- Rule: Soft-delete business records; never hard-delete payment/invoice/audit data

**Q7.3 — What data belongs to the company vs the platform?**
- Feed: Domain Model (tenant scoping), Auth/Permissions
- Why it matters: When a company leaves the platform, can their data be exported or deleted?

**Q7.4 — What are the data residency requirements?**
- Feed: NFRs, DevOps (hosting region)
- Why it matters: GDPR requires EU data to stay in EU. Uganda data sovereignty may have similar requirements.

---

## Category 8: Operations & Deployment

These questions define how the system runs. They feed: DevOps, Observability, Production Runbook.

**Q8.1 — What environments are needed? (local, staging, production)**
- Feed: DevOps
- Why it matters: Each environment needs its own secrets, databases, storage buckets, and provider accounts

**Q8.2 — How is deployment managed? (CI/CD, manual, managed platform)**
- Feed: DevOps, ADRs
- Why it matters: Manual deploys are error-prone and slow; CI/CD with approval gates is strongly preferred

**Q8.3 — What is the database migration strategy?**
- Feed: DevOps, Database Design
- Why it matters: Schema migrations in production require care — wrong order, missing rollback plan, or lack of testing can corrupt live data
- Rules: Migrations run before new code deploys; never edit applied migrations; always run in transactions

**Q8.4 — What is the rollback plan?**
- Feed: Production Runbook, DevOps
- Why it matters: Every deploy must have a tested rollback path
- Separate for: application regression (redeploy previous image) vs schema regression (forward-fix preferred; restore from backup last resort)

**Q8.5 — What is the backup strategy?**
- Feed: NFRs, DevOps, Production Runbook
- Why it matters: Without a tested backup, you don't have a backup — you have a false sense of security
- Questions: How often? Automated? Tested? Where stored? How long retained? How restored?

**Q8.6 — What does "the system is healthy" look like?**
- Feed: Observability, Production Runbook
- Why it matters: Health checks drive load balancer routing and alerts; without them, dead services serve traffic silently
- Minimum: `/health/live` (process alive), `/health/ready` (dependencies up), `/metrics` (Prometheus)

---

## Category 9: Timeline & Resources

These questions define project constraints. They feed: Implementation Plan, Risk Register.

**Q9.1 — What is the target go-live date?**
- Feed: Implementation Plan
- Why it matters: Drives sequencing — if date is fixed, scope must flex; if scope is fixed, date must flex

**Q9.2 — Who is building this? (1 person? Team? AI agent?)**
- Feed: Implementation Plan, Task Breakdown
- Why it matters: Tasks are sized and sequenced differently for a solo developer vs a team vs an AI agent
- For AI agents: Tasks must be smaller, more explicit, and have clearer stop conditions

**Q9.3 — What are the non-negotiable P0 features for go-live?**
- Feed: Requirements Matrix (P0 column), Implementation Plan (phases)
- Why it matters: P0 features block launch; everything else can follow in subsequent releases

**Q9.4 — Are there external dependencies that could cause delays? (Waiting for API credentials, third-party integrations, legal review)**
- Feed: Risk Register, Open Questions
- Why it matters: These are your critical path items — they must be started immediately, in parallel with development

---

## Category 10: Risk & Assumptions

These questions make the unknown explicit. They feed: Risk Register, Open Questions & Assumptions.

**Q10.1 — What are you assuming that, if wrong, would cause a major rework?**
- Feed: Open Questions, Risk Register
- Examples: "We assume Pesapal has a working sandbox environment", "We assume Uganda tax rules don't require real-time tax calculation"

**Q10.2 — What are the top 5 things that could kill this project?**
- Feed: Risk Register
- Format for each: Risk | Probability (Low/Medium/High) | Impact (Low/Medium/High) | Mitigation

**Q10.3 — What technical decisions are you making that might need to change?**
- Feed: ADRs, Open Questions
- Example: "We're using Render for hosting but may need to move to AWS if we exceed their tier"

**Q10.4 — What business decisions haven't been made yet that will affect the build?**
- Feed: Open Questions
- Example: "Tax rate is configurable but the exact rates aren't confirmed yet", "Refund cutoff policy not yet decided by business"

---

## Discovery Completeness Check

Before writing any document, verify:

| Category | Questions Answered | All P0 Items Resolved |
|---|---|---|
| 1. Business Context | ☐ All 8 answered | ☐ Non-goals explicit |
| 2. Users & Personas | ☐ All 6 answered | ☐ Every role listed |
| 3. Functional Scope | ☐ All 8 answered | ☐ Primary workflow end-to-end |
| 4. Technical Constraints | ☐ All 7 answered | ☐ Stack decided |
| 5. Security & Compliance | ☐ All 6 answered | ☐ Auth method decided |
| 6. Integrations | ☐ All 5 answered | ☐ Payment provider confirmed |
| 7. Data & Privacy | ☐ All 4 answered | ☐ Retention policy defined |
| 8. Operations | ☐ All 6 answered | ☐ Environments defined |
| 9. Timeline | ☐ All 4 answered | ☐ P0 scope locked |
| 10. Risk | ☐ All 4 answered | ☐ Top risks mitigated |

**Any unanswered question in P0 categories (1, 2, 3, 5, 6, 7, 9) must be either:**
- Answered explicitly before writing docs
- Documented as a named assumption with a risk entry
- Never silently ignored
