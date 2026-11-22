# Complete Checklist & Timeline

The definitive checklist for producing complete project documentation before writing code. Use this to track progress, identify gaps, and verify the "ready to code" gate.

---

## The 4-Week Documentation Timeline

### Week 1: Discovery & Product (Days 1–5)

| Day | Work | Output | Checklist |
|---|---|---|---|
| 1 | Answer all discovery questions (01-discovery-questions.md) | Answered question file | ☐ All 10 categories answered |
| 2 | Write Executive Summary + PRD | 01-exec-summary.md, 02-prd.md | ☐ Personas defined, ☐ User stories written, ☐ Business rules listed |
| 3 | Write Risk Register + Open Questions | 20-risk-register.md, 23-open-questions.md | ☐ Top risks with mitigations, ☐ P0 questions flagged |
| 4 | Write SRS (extract requirements from PRD) | 03-cleaned-srs.md | ☐ Every requirement has ID, ☐ All requirement types covered |
| 5 | Write Requirements Matrix + NFRs | 04-requirements-matrix.md, 05-nfr.md | ☐ Every req has status, ☐ Every NFR has a number |

**Week 1 Gate: ✓ Pass if:**
- [ ] Every user type is named with their jobs to do
- [ ] Every P0 user story has acceptance criteria
- [ ] MVP scope is explicitly bounded (in scope AND deferred list)
- [ ] Every major assumption is named
- [ ] Every requirement has a unique ID
- [ ] Every NFR has a measurable target (numbers, not adjectives)

---

### Week 2: Architecture & Data (Days 6–10)

| Day | Work | Output | Checklist |
|---|---|---|---|
| 6 | Draw system architecture + write narrative | 07-system-architecture.md | ☐ Every component named, ☐ Boundaries defined |
| 7 | Write ADRs for every major tech choice | 08-tech-stack-adrs.md | ☐ 8–12 ADRs, ☐ Alternatives documented |
| 8 | Write Auth/Permissions matrix | 12-auth-permissions.md | ☐ Every role listed, ☐ Permission matrix complete |
| 9 | Write Security Threat Model | 13-security-threat-model.md | ☐ All sensitive assets listed, ☐ All threats with mitigations |
| 10 | Write Domain Model + Glossary | 06-domain-model.md | ☐ All entities, ☐ All state machines, ☐ All domain events |

**Week 2 Gate: ✓ Pass if:**
- [ ] System components diagram exists
- [ ] Every major tech choice has an ADR with alternatives
- [ ] Role-permission matrix covers every role × every action
- [ ] Every sensitive asset has a named mitigation strategy
- [ ] Every entity's state machine is drawn completely
- [ ] Every state transition has: trigger, guard, actor, side effects
- [ ] All domain events listed (past tense names)
- [ ] Glossary defines all ambiguous terms

---

### Week 3: Build Planning (Days 11–15)

| Day | Work | Output | Checklist |
|---|---|---|---|
| 11 | Write Database Design | 09-database-design.md | ☐ All tables, ☐ All indexes, ☐ All FKs, ☐ Migration rules |
| 12 | Write complete API Specification | 10-api-spec.md | ☐ All endpoints, ☐ Access control, ☐ Error cases, ☐ Idempotency |
| 13 | Write UI/UX Specification | 11-ui-spec.md | ☐ All screens, ☐ All states, ☐ All validations |
| 14 | Write Implementation Plan + Task Breakdown | 14-impl-plan.md, 15-task-breakdown.md | ☐ Sequential tasks, ☐ Dependencies, ☐ Acceptance criteria |
| 15 | Write Test Plan + Coding Standards + Repo Structure | 16-test-plan.md, 19-coding-standards.md, 25-repo-structure.md | ☐ Coverage target, ☐ Test types, ☐ CI pipeline |

**Week 3 Gate: ✓ Pass if:**
- [ ] Database design has all tables with columns, types, and constraints
- [ ] Every table with FK columns has an index on those columns
- [ ] Every API endpoint specifies: method, path, permission, request shape, response shape
- [ ] Every API endpoint specifies its error cases
- [ ] Every state-changing endpoint documents its side effects
- [ ] Tasks are in dependency order (each task's deps are real deps)
- [ ] Every task has: goal, instructions, acceptance criteria, verification commands, stop conditions
- [ ] Test coverage target is a number (e.g., 80%)
- [ ] CI pipeline steps are named
- [ ] Coding standards include the definition of done

---

### Week 4: Operations + AI Handoff (Days 16–20)

| Day | Work | Output | Checklist |
|---|---|---|---|
| 16 | Write DevOps + Deployment | 17-devops.md | ☐ Environments, ☐ CI/CD pipeline, ☐ Migration process, ☐ Rollback plan |
| 17 | Write Observability + Monitoring | 18-observability.md | ☐ Log format, ☐ Redaction list, ☐ Alerts, ☐ Health endpoints |
| 18 | Write Production Runbook | 26-runbook.md | ☐ Pre-deploy checklist, ☐ Deploy steps, ☐ Rollback tree, ☐ Smoke tests |
| 19 | Write Acceptance Criteria + Traceability Matrix | 21-acceptance-criteria.md, 24-traceability.md | ☐ End-to-end system pass, ☐ Every req traced to task + test |
| 20 | Write AI Handoff Pack | codex-handoff/ folder | ☐ Project context, ☐ Rules, ☐ All task files, ☐ Tasks index |

**Week 4 Gate (= Ready to Code Gate): ✓ Pass if ALL of the following:**

**Product:**
- [ ] Executive Summary reviewed and approved by stakeholder
- [ ] PRD approved: user stories cover all user types
- [ ] All P0 open questions resolved
- [ ] Risk register reviewed: all High×High risks have mitigations

**Requirements:**
- [ ] Every SRS requirement has: ID, type, priority, module, task, test
- [ ] Requirements matrix shows every requirement as Accepted or Deferred
- [ ] NFRs have measurable targets (no vague words)
- [ ] Acceptance criteria covers end-to-end happy path + security + CI gate

**Architecture:**
- [ ] System diagram exists with all components named
- [ ] Every major tech choice has an ADR
- [ ] Permission matrix: every role × every action defined
- [ ] Threat model: every sensitive asset + threat + mitigation
- [ ] MFA requirements explicitly stated

**Data:**
- [ ] Every entity defined with fields and ownership
- [ ] Every stateful entity has a complete state machine
- [ ] All state transitions have: trigger, guard, actor, side effects
- [ ] All domain events listed
- [ ] Database design: all tables, columns, indexes, FKs
- [ ] Migration rules stated

**Build:**
- [ ] All API endpoints specified (method, path, permission, shapes)
- [ ] All UI screens specified (purpose, components, states)
- [ ] Tasks are in sequential dependency order
- [ ] Each task has all required sections (goal, instructions, acceptance criteria, verification commands, stop conditions)
- [ ] Test plan with coverage target and CI pipeline steps
- [ ] Coding standards with definition of done

**Operations:**
- [ ] All environments defined with their differences
- [ ] CI/CD pipeline steps specified
- [ ] Database migration process documented
- [ ] Rollback strategy for app regression AND schema regression
- [ ] Backup strategy and restoration plan documented
- [ ] Log format defined with redaction list
- [ ] Alert conditions defined
- [ ] Health endpoints specified
- [ ] Production runbook with pre-deploy and post-deploy checklists
- [ ] Smoke test suite specified

**AI Handoff:**
- [ ] CODEX_PROJECT_CONTEXT.md: ≤ 2 pages, covers stack + security + workflows
- [ ] CODEX_IMPLEMENTATION_RULES.md: specific rules (not vague guidance)
- [ ] Every task has a file with all sections
- [ ] CODEX_TASKS_INDEX.md links to all task files with status and verification command
- [ ] AGENTS.md includes definition of done checklist

---

## Document Completeness Checklist

For each of the 26 documents, these are the minimum quality checks:

### Layer 1 — Product

**01 — Executive Summary**
- [ ] One-sentence product description
- [ ] Main problem stated concretely
- [ ] All user types listed
- [ ] MVP vs deferred explicitly stated
- [ ] Top risks named
- [ ] Fits on one page

**02 — PRD**
- [ ] Vision paragraph
- [ ] Non-goals list (as important as goals)
- [ ] Every user type has a persona with problems + needs
- [ ] Minimum 6 user stories with IDs
- [ ] Every user story has "so that" value clause
- [ ] Every user story has acceptance criteria
- [ ] Business rules are numbered and explicit
- [ ] Edge cases are concrete scenarios
- [ ] Release criteria are observable behaviors

**20 — Risk Register**
- [ ] Every risk has: description, probability, impact, mitigation
- [ ] High×High risks have immediate mitigations
- [ ] Payment/financial risks covered
- [ ] Security risks covered
- [ ] Third-party dependency risks covered

**23 — Open Questions**
- [ ] Confirmed decisions separated from open questions
- [ ] P0 (must resolve before coding) separated from others
- [ ] Every P0 question has an owner and resolution target

### Layer 2 — Requirements

**03 — Cleaned SRS**
- [ ] Every requirement has a unique ID
- [ ] ID prefixes: FR, DATA, INT, SEC, NFR, UI
- [ ] Every requirement is a single testable statement
- [ ] No vague language (no "fast", "secure", "easy")
- [ ] All SRS types covered (functional, data, integration, security, NFR, UI)

**04 — Requirements Matrix**
- [ ] Every requirement has a status (Accepted/Deferred)
- [ ] No requirement without a status

**05 — Non-Functional Requirements**
- [ ] Performance target with numbers (p95, concurrent users)
- [ ] Availability target as a percentage
- [ ] Test coverage target as a percentage
- [ ] Accessibility standard named (WCAG 2.1 AA)
- [ ] API versioning strategy stated
- [ ] Error handling standard (error shape, no stack traces)

**21 — Acceptance Criteria**
- [ ] End-to-end happy path test scenario written
- [ ] Module-level criteria for every major module
- [ ] Security acceptance criteria (no raw cards, no cross-tenant, etc.)
- [ ] CI/testing acceptance criteria (coverage %, CI gate)

**24 — Traceability Matrix**
- [ ] Every SRS area → DB entity → API → UI → Task → Test
- [ ] Every individual requirement → task ID → test ID
- [ ] Gap analysis: no requirement without a task, no task without a test

### Layer 3 — Architecture

**07 — System Architecture**
- [ ] Component diagram (even as ASCII text)
- [ ] Each component: name, technology, single responsibility
- [ ] Key request flow traced end-to-end
- [ ] Data architecture (which DB, which ORM, key principles)
- [ ] Architecture principles explicitly stated

**08 — Technology Stack & ADRs**
- [ ] One ADR per major technology decision
- [ ] Every ADR: status, context, decision, alternatives, consequences
- [ ] Frontend, backend, database, auth, hosting, testing all have ADRs

**12 — Auth/Permissions**
- [ ] Every role defined with one-sentence description
- [ ] Permission matrix: rows=actions, columns=roles
- [ ] Authentication flow step-by-step
- [ ] Company approval gate explained
- [ ] Tenant scoping rule stated explicitly
- [ ] MFA requirements stated
- [ ] Permission name constants listed

**13 — Security Threat Model**
- [ ] All sensitive assets listed by category
- [ ] Threat table: every realistic threat with mitigation
- [ ] Secure coding rules numbered and explicit
- [ ] Security acceptance criteria

### Layer 4 — Data

**06 — Domain Model**
- [ ] Every entity with purpose, key fields, ownership
- [ ] Every stateful entity has a complete state machine
- [ ] Every state machine transition has: trigger, guard, actor, side effects
- [ ] Domain events list (past tense, comprehensive)
- [ ] Glossary covers all ambiguous terms

**09 — Database Design**
- [ ] Design principles stated (UUID PKs, DECIMAL money, soft deletes, etc.)
- [ ] Every table defined with columns, types, constraints
- [ ] Every FK documented
- [ ] Index strategy: every FK, every filter column, every sort column
- [ ] Migration rules stated

### Layer 5 — Build

**10 — API Specification**
- [ ] API design principles (base path, auth, error shape, pagination shape)
- [ ] Every endpoint: method, path, purpose, access control
- [ ] Examples for complex request/response bodies
- [ ] Validation and idempotency notes for non-obvious behaviors

**15 — Task Breakdown**
- [ ] 10–14 tasks in dependency order
- [ ] Every task: goal, context, instructions, constraints, acceptance criteria, verification commands, stop conditions
- [ ] No task that depends on an incomplete previous task
- [ ] Security/payment/state transition decisions covered by stop conditions

**16 — Test Plan**
- [ ] Coverage target percentage
- [ ] Test types mapped to what they cover
- [ ] Test cases listed with IDs (TC-xxx)
- [ ] CI pipeline steps in order

**19 — Coding Standards**
- [ ] Naming conventions (variables, files, DB, API)
- [ ] File naming patterns (backend + frontend)
- [ ] Error handling rules
- [ ] Database rules
- [ ] Security rules
- [ ] Definition of done checklist

### Layer 6 — Operations

**17 — DevOps**
- [ ] Environments table (local, staging, prod) with differences
- [ ] All environment variables documented
- [ ] CI pipeline steps
- [ ] Production deploy pipeline with approval gate
- [ ] Migration process (dev → staging → prod)
- [ ] Rollback strategy for app vs schema

**18 — Observability**
- [ ] Log format (structured JSON)
- [ ] Log redaction list (never log these fields)
- [ ] Application metrics (Prometheus)
- [ ] Health endpoint specs
- [ ] Audit events list
- [ ] Alert conditions and severity

**26 — Production Runbook**
- [ ] Pre-deploy checklist (numbered, imperative)
- [ ] Deploy steps (numbered, with commands)
- [ ] Post-deploy verification (numbered, with commands)
- [ ] Rollback decision tree
- [ ] Smoke test suite
- [ ] Incident response template
- [ ] Backup verification procedure

---

## The Gap Analysis Pass

Run this after all documents are written. For every item below that is missing, fill it before starting implementation.

**Requirement gaps:**
- [ ] List all FR IDs. Verify every one has a task ID in the traceability matrix
- [ ] List all task IDs. Verify every one has at least 2 test cases in the test plan
- [ ] List all API endpoints. Verify every one maps to at least one FR or SEC requirement
- [ ] List all DB tables. Verify every one maps to at least one domain entity

**Security gaps:**
- [ ] List all endpoints that handle sensitive data. Verify every one has a rate limit
- [ ] List all state transitions that involve money. Verify every one is in a DB transaction
- [ ] List all file operations. Verify every one validates MIME type and uses private storage

**AI handoff gaps:**
- [ ] List all task IDs. Verify every one has a task file
- [ ] List all task files. Verify every one has stop conditions
- [ ] List all task files. Verify every one has verification commands
- [ ] Read CODEX_IMPLEMENTATION_RULES.md. Verify it covers: backend, frontend, DB, API, security, testing, stop conditions

---

## Quick Reference: Minimum Viable Documentation

If you're under time pressure and must start coding with incomplete docs, this is the bare minimum:

| Priority | Document | Why You Can't Skip It |
|---|---|---|
| P0 | Executive Summary | Without it, different people build different products |
| P0 | PRD (user stories + business rules) | Without it, requirements come from conversations |
| P0 | Domain Model (entities + state machines) | Without it, your DB schema will be wrong |
| P0 | Security Threat Model | Without it, you'll build the wrong security model |
| P0 | Auth/Permission Matrix | Without it, authorization will be inconsistent |
| P0 | API Specification (at least endpoints + access) | Without it, frontend and backend misalign |
| P0 | At least task-001 through task-005 task files | Without them, AI agents go off-script |
| P1 | Database Design | Can derive from domain model, but explicit is safer |
| P1 | ADRs for top 3 decisions | Without them, decisions get relitigated |
| P1 | Test Plan (coverage target + CI steps) | Without it, you won't know when you're done |
| P2 | Full observability + runbook | Important but can be written during implementation |

Never skip P0 items. The cost of their absence is always higher than the time to write them.
