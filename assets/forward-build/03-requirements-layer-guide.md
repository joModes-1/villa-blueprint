# Layer 2 — Requirements Guide: SRS, Matrix, NFRs, Acceptance Criteria, Traceability

These five documents transform the product intent from Layer 1 into a precise, verifiable, numbered specification. Every requirement gets an ID. Every ID connects to a test. Every test connects to an acceptance criterion. Nothing is built that doesn't trace to a requirement.

---

## Document 1: Cleaned Software Requirements Specification (SRS)

### What It Is
The complete, exhaustive list of everything the system must do, must store, must integrate with, must secure, must look like, and must perform as — all with unique IDs.

### Why It Exists
The PRD captures intent. The SRS captures the precise, implementable requirements derived from that intent. The SRS is what engineers build against and what testers verify against.

### How to Write It

**Step 1: Extract from the PRD**
Go through every user story and extract the technical requirements it implies. One user story typically produces 2–5 requirements.

Example:
```
US-008 "As an agency, I want to pay approved bookings" produces:
  FR-014: Stripe/Pesapal hosted payment initiation and webhook reconciliation
  FR-013: Invoice generated for approved bookings
  SEC-004: No raw card data; hosted checkout only
  INT-003: Stripe webhook verification
```

**Step 2: Add requirements the PRD doesn't explicitly state but implies**
Business rules, edge cases, and security requirements from the PRD all generate SRS requirements.

**Step 3: Categorize every requirement**
Use these prefix categories:
- `FR-xxx` — Functional Requirement (what the system does)
- `DATA-xxx` — Data Requirement (how data is stored, retained, isolated)
- `INT-xxx` — Integration Requirement (external services)
- `SEC-xxx` — Security Requirement (auth, authz, validation, protection)
- `NFR-xxx` — Non-Functional Requirement (performance, scalability, reliability)
- `UI-xxx` — User Interface Requirement (visual, accessibility, interaction)

**Step 4: Assign each requirement a row in the table**

Required columns:
```
| ID | Type | Requirement | Priority | Module/Role | Task | Test |
```

- ID: unique identifier (FR-001, SEC-003, etc.)
- Type: Functional / Data / Integration / Security / Non-functional / UI
- Requirement: a single, testable "shall" statement
- Priority: P0 (must have), P1 (important), P2 (nice to have)
- Module/Role: which system area or user role this applies to
- Task: which implementation task covers this (fill in during Layer 5)
- Test: which test case covers this (fill in during Layer 5)

### Writing Good Requirements

Each requirement must be:
- **Singular**: one requirement per ID (not "the system shall do A and B")
- **Verifiable**: you can write a test that proves it pass/fail
- **Unambiguous**: no vague words like "fast", "secure", "easy to use"
- **Traceable**: it comes from a user story or business rule

*Bad requirement:* "The system should be secure"
*Good requirement:* "SEC-002: Server-side authorization enforced on all protected endpoints; no client-side-only permission checks"

*Bad requirement:* "Users can manage bookings"
*Good requirement:* "FR-011: Operators can approve, reject, or cancel bookings for packages they own, with each transition recorded as an immutable status event"

### Real Example Set from Tourism Project
```
FR-010: Agencies submit booking requests with traveler IDs, dates, and preferences
FR-011: Operators approve/reject/cancel bookings scoped to their packages only
FR-012: System enforces booking lifecycle — invalid state transitions are rejected
DATA-001: All data access is scoped to the requesting company; cross-company access is blocked
SEC-002: Server-side authorization on all protected endpoints
SEC-004: No raw card data stored; hosted checkout only
INT-003: Stripe webhook signatures verified before processing
NFR-002: Primary pages target p95 ≤ 3s under MVP data volumes
```

### Common Mistakes
- Combining multiple requirements into one ID (makes them impossible to test individually)
- Writing requirements from the implementation perspective ("we will use Redis") rather than the behavior perspective ("the system shall respond in ≤ 3s p95")
- Missing security requirements (every functional requirement that touches sensitive data has an implicit security requirement)
- Requirements with no test ID — if you can't write a test for it, rewrite the requirement

---

## Document 2: Requirements Matrix

### What It Is
A status table that maps every requirement to its current state: Accepted, Deferred, or Under Review.

### Why It Exists
Without a requirements matrix, you can't answer "are we doing X in this release?" and get a definitive answer. The matrix is the source of truth for scope.

### How to Write It

Add a `Status` column to your SRS table:
- **Accepted**: In scope for this release, agreed by stakeholders
- **Deferred**: Not in this release, explicitly pushed to a future version
- **Under Review**: Still being evaluated for inclusion

### Rules for the Requirements Matrix
- Every requirement must have a status — "unknown" is not a status
- Deferred requirements are not deleted — they remain in the matrix for the next release
- Status changes must be agreed, not made unilaterally by developers
- At project kick-off: every requirement starts as Accepted or Deferred, no Under Review

### How Developers Use It
Before starting any task: check every requirement in the matrix. If a requirement for the feature you're implementing is Deferred, do not implement it. If you find work that's not in the matrix at all, stop and add it before implementing.

---

## Document 3: Non-Functional Requirements (NFRs)

### What It Is
The measurable quality targets that the system must meet. Performance, scalability, security posture, reliability, accessibility, etc. — each with a specific, testable number.

### Why It Exists
"The system should be fast" is not a requirement. "p95 API response ≤ 3 seconds" is. Without measurable NFRs, there is no way to know whether the system is good enough. This leads to perpetual "polish" phases and shipping decisions made by intuition.

### How to Write It

For each NFR category, write:
1. The target (the number)
2. How it's measured (the method)
3. When it applies (the condition)

#### NFR Category Template

```
### [Category Name]

**Target**: [Specific number or threshold]
**Measurement**: [How to verify — load test, code coverage report, manual check]
**Condition**: [Under what conditions this applies]
**Consequence of failure**: [What happens if this NFR is not met]
```

#### The 13 NFR Categories You Must Cover

**1. Performance**
- Page load time / API response time under normal load
- Example: "p95 API response ≤ 3s under 1,000 concurrent users with MVP data volumes"
- Measurement: k6 or Locust load test

**2. Scalability**
- Maximum concurrent users the system is designed for
- Example: "Architecture supports path to 5,000 concurrent users with stateless API, DB connection pooling, and indexed queries"
- Measurement: architecture review + load test

**3. Security Posture**
- Acceptable vulnerability threshold
- Example: "No P0 or P1 findings from security review at launch"
- Measurement: manual security review + automated SAST scan

**4. Reliability / Availability**
- Uptime target
- Example: "99.9% production uptime target (≤ 8.7 hours downtime/year)"
- Measurement: provider uptime SLA + monitoring alerts

**5. Backup & Recovery**
- Backup frequency, tested restoration time
- Example: "Daily automated backups + PITR where supported; backup restoration tested before launch"
- Measurement: scheduled backup job + manual restore test in staging

**6. Maintainability / Test Coverage**
- Minimum code coverage
- Example: "≥ 80% line coverage on backend/core business logic"
- Measurement: Jest coverage report in CI

**7. Observability**
- What must be logged, traced, and alerted
- Example: "All API requests logged with requestId, route, status, latency; errors reported to Sentry; no passwords/tokens in logs"
- Measurement: log audit, Sentry integration test

**8. Accessibility**
- WCAG compliance level
- Example: "WCAG 2.1 Level AA on all authenticated screens"
- Measurement: automated axe scan + manual screen reader test on critical flows

**9. Browser Compatibility**
- Which browsers and versions
- Example: "Chrome ≥ last 2 versions, Firefox ≥ last 2 versions, Safari ≥ 14, Edge ≥ last 2 versions"
- Measurement: manual cross-browser testing on critical flows

**10. Data Integrity**
- How data consistency is enforced
- Example: "All booking/payment/refund state transitions wrapped in DB transactions; webhook events deduplicated by provider event ID"
- Measurement: integration tests for state transitions

**11. Error Handling**
- Standard error shape, no secret leakage
- Example: "All API errors return `{ error: { code, message, details, requestId } }`; no stack traces or secrets in production responses"
- Measurement: API error response review in staging

**12. Internationalization Readiness**
- Language and locale support
- Example: "MVP in English only; all user-facing strings externalized for future i18n; UTC timestamps in API responses"
- Measurement: code review for hardcoded strings

**13. API Versioning**
- How breaking changes are managed
- Example: "All endpoints under /api/v1; breaking changes require new version prefix"
- Measurement: API spec review

---

## Document 4: Acceptance Criteria

### What It Is
The observable, testable behaviors that must pass before the system ships. Not test cases — higher level than that. These are the "system passes when" statements.

### Why It Exists
Without explicit acceptance criteria, "done" is a feeling. With them, "done" is a set of verifiable checkboxes. This document is read by: the developer (to know when to stop), the QA reviewer (to know what to test), the stakeholder (to know what was committed to), and the AI agent (to know when a task is complete).

### How to Write It

Structure by system area:

**Part 1: End-to-End System Pass**
The complete happy path that proves the whole system works together.

Format:
```
The system passes when: a complete [primary workflow] can be executed 
end-to-end without errors, with all data correctly persisted and all 
notifications/events correctly triggered.

Specifically:
1. [Step 1 and its expected result]
2. [Step 2 and its expected result]
...
```

Example from tourism project:
```
The system passes when: a complete booking and payment cycle completes:
Register company → verify email → admin approves → operator creates package 
→ operator publishes → agency searches and finds package → agency submits 
booking → operator approves → invoice generated → agency pays → webhook 
confirms → booking moves to confirmed → both parties notified → 
dashboard metrics updated.
```

**Part 2: Module-Level Criteria**
For each major module, what behaviors must pass?

Format:
```
### [Module Name]
- [ ] [Observable behavior 1]
- [ ] [Observable behavior 2]
```

Example:
```
### Auth & RBAC
- [ ] Only verified and approved companies can access protected endpoints
- [ ] A user without permission for an action gets 403, not 404 or 500
- [ ] MFA is enforced for Super Admin and Finance roles
- [ ] Login rate limiting returns 429 after the configured threshold

### Packages
- [ ] Draft packages are not visible in marketplace search
- [ ] Publishing fails if required fields (title, description, pricing) are missing
- [ ] Only the package's operator company can publish/archive it
```

**Part 3: Security Acceptance Criteria**
Non-negotiable security behaviors.

```
- [ ] No raw card data anywhere in the system (request logs, database, responses)
- [ ] No secrets (API keys, tokens, passwords) in any log output
- [ ] All private documents accessible only through signed URLs after RBAC check
- [ ] All payment state cannot be forged without valid provider webhook signature
- [ ] Cross-company data access returns 403, not 200 with empty data
```

**Part 4: Testing & CI Acceptance**
```
- [ ] CI passes: lint + typecheck + test + build
- [ ] Backend/core test coverage ≥ 80%
- [ ] All critical E2E flows pass in staging
- [ ] No P0 security findings
```

**Part 5: Documentation Acceptance**
```
- [ ] README matches the actual implementation (setup commands work)
- [ ] API docs reflect all implemented endpoints
- [ ] Environment variable examples are complete and documented
```

---

## Document 5: Traceability Matrix

### What It Is
A cross-reference table showing how every requirement connects to: the database entity, the API endpoint, the UI screen, the implementation task, the test case, and the acceptance criterion.

### Why It Exists
This is the verification layer over all other documents. It answers: "Is every requirement covered?" If a requirement has no test ID, it won't be tested. If it has no task ID, it might not be built. The traceability matrix makes these gaps visible before you hit production.

### How to Write It

**Part 1: Feature Traceability (by system area)**

| SRS Area | PRD Feature | DB Entity | API Endpoint | UI Screen | Task | Test | Acceptance |
|---|---|---|---|---|---|---|---|
| [Area] | [Feature] | [Table] | [Method path] | [Screen name] | [task-00x] | [TC-XXX] | [AC statement] |

This is written partially upfront (Layer 1–4 columns) and completed during Layer 5 (task and test columns).

**Part 2: Full Requirement Matrix**
Every individual requirement (FR-001, SEC-003, etc.) with its task ID and test ID.

### How to Use It After Writing

Before starting any implementation task:
- Find all requirements mapped to that task
- Verify you know what DB entity, API endpoints, and UI screens they touch
- Verify tests exist for all of them

After completing any implementation task:
- Mark the requirements as implemented
- Confirm test cases exist and pass
- If any requirement has no test, write the test before marking complete

### The Gap Analysis Rule
After completing the requirements matrix, do a gap analysis:
- Any requirement with no task ID → add it to a task
- Any requirement with no test ID → write the test before claiming done
- Any API endpoint not in the matrix → determine which requirement it serves, or remove it
- Any DB table not in the matrix → determine which requirement it serves, or remove it

This gap analysis prevents orphan code — code that exists but serves no documented requirement.
