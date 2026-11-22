# Project Documentation Framework — Overview

## What This Framework Is

This folder contains a complete, reusable system for documenting any software project before writing the first line of code. It was extracted from a real production project (an EU B2B tourism portal) that had 26 project docs, 4 AI handoff docs, and 14 implementation task files — all produced before implementation began.

The framework answers one question: **how do you know a project end-to-end before you start building it?**

When used correctly, this framework produces documentation that:
- Any developer can read and understand the entire system without asking questions
- Any AI agent can be briefed to implement any part of the system correctly and safely
- Any stakeholder can verify the system matches what they asked for
- Any future maintainer can understand why every decision was made

---

## The Core Problem This Solves

Most software projects fail or overrun not because developers are bad at coding, but because the thinking before the code was incomplete. The failure modes are predictable:

| Failure Mode | Root Cause | Doc That Prevents It |
|---|---|---|
| Built the wrong thing | No clear product requirements | PRD, Executive Summary |
| Scope keeps expanding | No definition of MVP vs deferred | Requirements Matrix, Open Questions |
| Security added as afterthought | No threat model | Security & Threat Model |
| Database redesigned mid-project | No domain model before schema | Domain Model, DB Design |
| Frontend/backend mismatch | No API contract agreed upfront | API Specification |
| "Done" never agreed | No acceptance criteria | Acceptance Criteria, Test Plan |
| AI agent breaks existing behavior | No implementation rules and stop conditions | AI Handoff Pack |
| Production deploy goes wrong | No runbook | Production Runbook |
| Can't trace why feature exists | No traceability | Traceability Matrix |

---

## The 6-Layer Mental Model

Every project's documentation lives in exactly 6 layers. Each layer must be reasonably stable before the next layer can be written accurately. You can iterate back, but going forward without completing a layer creates rework.

```
┌────────────────────────────────────────────────────┐
│  LAYER 1: WHY — Business & Product                 │
│  Executive Summary, PRD, Risk Register,            │
│  Open Questions                                    │
├────────────────────────────────────────────────────┤
│  LAYER 2: WHAT — Requirements                      │
│  SRS, Requirements Matrix, NFRs,                   │
│  Acceptance Criteria, Traceability                 │
├────────────────────────────────────────────────────┤
│  LAYER 3: HOW — Architecture & Decisions           │
│  System Architecture, ADRs, Auth/Permissions,      │
│  Security & Threat Model                           │
├────────────────────────────────────────────────────┤
│  LAYER 4: DATA — Domain & Database                 │
│  Domain Model & Glossary, Database Design          │
├────────────────────────────────────────────────────┤
│  LAYER 5: BUILD — Implementation Plan              │
│  API Spec, UI/UX Spec, Implementation Plan,        │
│  Task Breakdown, Test Plan, Coding Standards,      │
│  Repository Structure                              │
├────────────────────────────────────────────────────┤
│  LAYER 6: OPERATE — Production Readiness           │
│  DevOps & Deployment, Observability & Monitoring,  │
│  Production Runbook                                │
└────────────────────────────────────────────────────┘
```

**Plus: AI Handoff Pack** — a separate briefing pack written after all 6 layers are complete. It compresses the full documentation into a format an AI agent can consume to implement the system correctly.

---

## The Complete Document Map

All 26 documents plus the AI handoff pack. Each doc has a single owner-question it answers.

### Layer 1 — WHY

| # | Document | Core Question It Answers |
|---|---|---|
| 01 | Executive Summary | What is this product, who is it for, and what's in the MVP? |
| 02 | Product Requirements Document | What does each user type need to do, and what are the business rules? |
| 20 | Risk Register | What can go wrong and kill this project? |
| 23 | Open Questions & Assumptions | What don't we know yet, and what are we assuming? |

### Layer 2 — WHAT

| # | Document | Core Question It Answers |
|---|---|---|
| 03 | Cleaned SRS | What are every single requirement, with IDs? |
| 04 | Requirements Matrix | Which requirements are in scope for this release? |
| 05 | Non-Functional Requirements | What are the measurable quality targets? |
| 21 | Acceptance Criteria | What exact behaviors must pass before shipping? |
| 24 | Traceability Matrix | How does every requirement connect to DB → API → UI → Task → Test? |

### Layer 3 — HOW

| # | Document | Core Question It Answers |
|---|---|---|
| 07 | System Architecture | What are the system components and how do they talk to each other? |
| 08 | Technology Stack & ADRs | Why was each technology chosen, and what was rejected? |
| 12 | Authentication, Authorization & Permissions | What can each role do, and how is identity enforced? |
| 13 | Security Requirements & Threat Model | What attacks are possible and how is each mitigated? |

### Layer 4 — DATA

| # | Document | Core Question It Answers |
|---|---|---|
| 06 | Domain Model & Glossary | What are the entities, their states, relationships, and key events? |
| 09 | Database Design | What are the actual tables, indexes, constraints, and migration rules? |

### Layer 5 — BUILD

| # | Document | Core Question It Answers |
|---|---|---|
| 10 | API Specification | What are all the endpoints, who can call them, and what shape is the data? |
| 11 | UI/UX Specification | What does every user-facing screen look like and how does it behave? |
| 14 | Implementation Plan | What are the delivery phases and what gets built in each? |
| 15 | Codex Task Breakdown | What are the 10–15 tasks, in order, with acceptance criteria? |
| 16 | Test Plan & Quality Strategy | What gets tested, what is the coverage target, what does CI run? |
| 19 | Coding Standards | What are the non-negotiable code conventions? |
| 25 | Repository Structure | What does the folder layout look like? |

### Layer 6 — OPERATE

| # | Document | Core Question It Answers |
|---|---|---|
| 17 | DevOps, Deployment & Operations | How does code go from dev to production? What's the rollback plan? |
| 18 | Observability, Logging & Monitoring | What gets logged, what gets alerted, what do dashboards show? |
| 26 | Production Readiness Runbook | What is the exact checklist before and after every deploy? |

### AI Handoff Pack (separate folder: `codex-handoff/`)

| File | Purpose |
|---|---|
| CODEX_PROJECT_CONTEXT.md | One-page system summary for an AI agent |
| CODEX_IMPLEMENTATION_RULES.md | Hard rules: do this, never do that, when to stop |
| CODEX_TASKS_INDEX.md | Ordered task list with dependencies |
| tasks/task-001.md … task-014.md | One file per task, full implementation instructions |
| AGENTS.md | Definition of done, quality gates, security constraints |

---

## The Traceability Chain

The single most important structural concept in this framework. Every deliverable traces back to a business need, and every business need has a test:

```
Business Need (PRD user story US-006)
  └── Requirement (SRS ID: FR-010)
        └── DB entity (bookings table, booking_status_events)
              └── API endpoint (POST /agency/bookings)
                    └── UI screen (Booking submission form)
                          └── Task (task-005-core-api-endpoints)
                                └── Test case (TC-BOOK-001)
                                      └── Acceptance criterion (Booking enters pending_approval state)
```

If you can build this chain for every feature before coding starts, you will:
- Never build something that doesn't trace to a requirement
- Never ship without knowing exactly what tests prove it works
- Always be able to answer "why does this code exist?"
- Always be able to answer "when are we done?"

---

## How to Use This Framework

### Mode 1: Human-Guided (You write the docs yourself)

Read the layer guides in order:
1. [01-discovery-questions.md](01-discovery-questions.md) — Answer all questions first
2. [02-product-layer-guide.md](02-product-layer-guide.md) — Write Layer 1 docs
3. [03-requirements-layer-guide.md](03-requirements-layer-guide.md) — Write Layer 2 docs
4. [04-architecture-layer-guide.md](04-architecture-layer-guide.md) — Write Layer 3 docs
5. [05-domain-data-layer-guide.md](05-domain-data-layer-guide.md) — Write Layer 4 docs
6. [06-build-layer-guide.md](06-build-layer-guide.md) — Write Layer 5 docs
7. [07-operations-layer-guide.md](07-operations-layer-guide.md) — Write Layer 6 docs
8. [08-ai-handoff-guide.md](08-ai-handoff-guide.md) — Write the AI briefing pack

Use the templates in `../templates/` as starting points for each document.

### Mode 2: AI-Guided (You give context, AI writes the docs)

1. Answer all questions in [01-discovery-questions.md](01-discovery-questions.md)
2. Give your answers + the master prompt from [09-ai-master-prompt.md](09-ai-master-prompt.md) to an AI
3. The AI will generate all 26 documents in order
4. Review each document for accuracy before approving
5. Use [10-complete-checklist.md](10-complete-checklist.md) to verify completeness

### Mode 3: Hybrid (Most practical)

1. Write Layers 1–2 yourself (you know the business best)
2. Use AI to draft Layers 3–6 based on your Layer 1–2 docs
3. Review and refine each layer
4. Have AI write the AI handoff pack

---

## The "Ready to Code" Gate

Before writing a single line of implementation code, all of the following must be true:

**Product clarity**
- [ ] Every user type and their needs are defined
- [ ] Every user story has acceptance criteria
- [ ] MVP scope is explicit (what's in, what's deferred)
- [ ] All P0 open questions are resolved

**Technical clarity**
- [ ] System architecture diagram exists
- [ ] Every major technology choice has an ADR
- [ ] Role-permission matrix is complete
- [ ] Security threat model covers all sensitive data

**Data clarity**
- [ ] Every entity and its states are defined
- [ ] Every important state transition is documented
- [ ] Database schema exists with indexes and constraints

**Build clarity**
- [ ] Every API endpoint is specified with access control
- [ ] Tasks are in sequential order with dependencies
- [ ] Every task has a verification command
- [ ] 80%+ test coverage target is defined

**Operations clarity**
- [ ] Environments are defined (local, staging, prod)
- [ ] CI pipeline steps are specified
- [ ] Migration and rollback strategy exists
- [ ] Backup plan is defined

If any of these are missing, you are not ready to code. Writing code before this gate passes is the #1 cause of rewrites.

---

## The 5 Documents That Matter Most

If you can only write 5 documents, write these:

1. **PRD** — User stories + business rules + edge cases. The source of truth for what to build.
2. **Domain Model** — Entities + state machines + domain events. Prevents data design mistakes you cannot undo.
3. **Security & Threat Model** — Assets + threats + mitigations. Security designed in costs 10x less than bolted on.
4. **API Specification** — All endpoints with access control. The contract between frontend and backend.
5. **Task Breakdown** — Ordered tasks with acceptance criteria. What prevents scope creep and rework.

---

## Critical Anti-Patterns to Avoid

**Starting Layer N before Layer N-1 is stable**
The most common mistake. Architecture decisions made without requirements lead to over-engineering or wrong abstractions. DB design without domain model leads to schema rewrites.

**Vague NFRs**
"The system should be fast" is not a requirement. "p95 API response ≤ 3 seconds under 1,000 concurrent users" is. Every NFR must have a number.

**Requirements without IDs**
You cannot trace, verify, or reference requirements that have no IDs. Every requirement gets an ID before any other work.

**Security planned last**
A threat model is not a Layer 6 document. It belongs in Layer 3. Security decisions affect architecture, data model, API design, and task scope.

**Tasks without stop conditions**
Every AI task and every human implementation task must define when to stop and ask rather than guess. Ambiguity in payment logic, security decisions, or API contracts must never be resolved by a developer alone.

**No traceability**
Documentation that cannot be traced to a requirement creates orphan features — code no one can justify, tests no one knows exist, APIs no one knows to maintain.

**Documenting what, not why**
Every ADR, every risk, every decision must record the reason. Code that says `// don't change this` with no explanation is worse than no comment.

---

## Approximate Time Investment

| Project Duration | Documentation Time | Return |
|---|---|---|
| 1 month | 3–5 days | Prevents 1–2 week rewrite |
| 3 months | 2–3 weeks | Prevents 3–6 week rewrite |
| 6 months | 4–6 weeks | Prevents 2–3 month rewrite |
| 12 months | 6–10 weeks | Prevents 4–6 month rewrite |

The documentation investment is roughly 10–15% of total project time. The cost of skipping it is typically 30–50% of total project time in rework, rewrites, and production incidents.
