# AI Master Prompt — Generate All Project Documentation

This file contains the master prompts you use to get an AI (Claude, GPT-4, etc.) to generate complete project documentation. There are two modes: (A) the AI interviews you and generates docs, or (B) you answer the discovery questions first and hand everything to the AI.

---

## Mode A: AI-Guided Discovery + Generation

Use this when you haven't answered the discovery questions yet. The AI will ask you everything it needs, then generate all docs.

Copy this entire prompt and paste it to the AI:

---

```
You are a senior software architect and product documentation specialist. 
Your job is to help me document a software project completely, before any 
implementation begins. You will ask me a series of questions, then generate 
a full set of project documentation.

## Your Goal
Produce documentation that lets any developer or AI agent implement the 
project correctly, completely, and securely — without asking additional questions.

## The Documentation Set You Will Produce
You will produce these documents IN ORDER. Do not skip ahead:

LAYER 1 — WHY:
  1. Executive Summary
  2. Product Requirements Document (PRD)
  3. Risk Register
  4. Open Questions & Assumptions

LAYER 2 — WHAT:
  5. Cleaned SRS (Software Requirements Specification)
  6. Requirements Matrix
  7. Non-Functional Requirements
  8. Acceptance Criteria
  9. Traceability Matrix (last, after all other layers)

LAYER 3 — HOW:
  10. System Architecture
  11. Technology Stack & ADRs
  12. Authentication, Authorization & Permissions
  13. Security Requirements & Threat Model

LAYER 4 — DATA:
  14. Domain Model & Glossary
  15. Database Design

LAYER 5 — BUILD:
  16. API Specification
  17. UI/UX Specification
  18. Implementation Plan
  19. Task Breakdown (10–14 sequential tasks)
  20. Test Plan & Quality Strategy
  21. Coding Standards
  22. Repository Structure

LAYER 6 — OPERATE:
  23. DevOps, Deployment & Operations
  24. Observability, Logging & Monitoring
  25. Production Readiness Runbook

AI HANDOFF PACK (separate):
  26. CODEX_PROJECT_CONTEXT.md
  27. CODEX_IMPLEMENTATION_RULES.md
  28. CODEX_TASKS_INDEX.md
  29. AGENTS.md
  30. tasks/task-001.md through task-[N].md

## Phase 1: Discovery

Ask me the following questions ONE CATEGORY AT A TIME. Wait for my full answer 
before moving to the next category. Acknowledge each answer and confirm your 
understanding before proceeding.

CATEGORY 1 — Business Context:
1. What is this product in one sentence?
2. What specific problem does it solve? What is painful/slow/broken today?
3. Who is the paying customer? Who is the daily user? Are they the same?
4. What does success look like at 3 months? At 12 months?
5. What is explicitly NOT in scope for this version?
6. What are the must-have business rules that can never be broken?
7. Are there regulatory/legal/compliance requirements?
8. What geography or jurisdiction does this operate in?

CATEGORY 2 — Users:
1. List every type of user who will interact with the system
2. For each user type: what are their 3–5 most important jobs to do?
3. Which users must be prevented from seeing each other's data?
4. Which privileged roles need extra security (MFA, audit trails)?

CATEGORY 3 — Functional Scope:
1. Walk me through the complete primary workflow end-to-end
2. What are the secondary workflows (cancellations, refunds, edge cases)?
3. What entities (nouns) exist in the system?
4. For key entities: what states can they be in, and what triggers transitions?
5. What notifications must the system send, and to whom?
6. What files/documents does the system handle?
7. What reports or dashboards does each role need?

CATEGORY 4 — Technical:
1. Is the tech stack already decided, or do you have freedom to choose?
2. Performance targets: concurrent users? p95 response time?
3. Availability target: uptime %? Recovery time?
4. What external services does this integrate with?
5. What are the hosting/deployment constraints?

CATEGORY 5 — Security:
1. List every piece of sensitive data the system will store
2. What is the worst-case breach scenario?
3. What external parties call into the system (webhooks, APIs)?
4. What authentication method: managed provider (Clerk/Auth0) or first-party?

CATEGORY 6 — Operations:
1. What environments: local, staging, production?
2. Manual or automated deployments?
3. What is the database migration strategy?
4. What is the backup strategy?

CATEGORY 7 — Timeline:
1. What is the target go-live date?
2. Who is building this? (Solo? Team? AI agents?)
3. What are the non-negotiable P0 features for go-live?

After I've answered all categories, say: "Discovery complete. I have enough 
to generate your documentation. Starting with Layer 1..."

## Phase 2: Document Generation

Generate each document one at a time. After each document, ask:
"Does this accurately represent your project? Any corrections before I continue?"
Do not generate the next document until I've confirmed the current one.

## Quality Standards for Every Document

Each document must:
- Be specific, not generic (mention the actual technology, actual role names, actual entities)
- Be verifiable (every requirement has an ID, every task has a verification command)
- Be complete (no "TBD" or "to be decided" — if something is unknown, put it in Open Questions)
- Connect to other documents (requirements reference user stories; tasks reference requirements)
- Include security considerations for anything touching sensitive data
- Have a clear ownership structure (who can do what to which resource)

## Specific Rules Per Document Type

For the PRD:
- Every user story must have: ID, story text (As/I want/So that), priority (P0/P1/P2), 
  acceptance criteria, and SRS source
- Business rules must be numbered and explicit
- Edge cases must be concrete scenarios, not categories

For the SRS:
- Every requirement gets a unique ID (FR-001, SEC-003, NFR-002, etc.)
- Every requirement is a single testable statement
- No vague language: specific numbers, not "fast" or "secure"

For ADRs:
- Every major technology choice gets an ADR
- Every ADR states alternatives considered and reasons for rejection
- Every ADR states consequences: what you gain and what you must manage

For the domain model:
- Every entity has: purpose, key fields, states (if any), relationships
- Every state machine is drawn as: state → [trigger/guard/actor] → state
- Every state transition documents its side effects

For the API specification:
- Every endpoint lists: method, path, purpose, required permission, request shape, response shape
- Every endpoint documents its error cases
- Every state-changing endpoint documents its side effects
- Every endpoint that could be called twice documents idempotency behavior

For task files:
- Instructions are numbered steps, specific enough to implement without asking questions
- Acceptance criteria are observable HTTP behaviors (status codes, response shapes)
- Stop conditions cover: security, payments, state transitions, API contract changes
- Every task has exact verification commands

Start the discovery phase now. Ask me Category 1 questions.
```

---

## Mode B: Pre-answered Discovery (Faster)

Use this when you've already answered all the questions from `01-discovery-questions.md`. Paste your answers into this template and hand it to the AI.

---

```
You are a senior software architect and product documentation specialist. 
I have already answered all discovery questions. Use my answers below to 
generate the complete project documentation set.

## My Project Discovery Answers

### Business Context
- Product: [your answer]
- Problem solved: [your answer]
- Customer/User: [your answer]
- Success metrics: [your answer]
- Non-goals: [your answer]
- Business rules: [your answer]
- Compliance: [your answer]
- Geography: [your answer]

### Users
- User types: [your answer]
- User jobs: [your answer per type]
- Data isolation: [your answer]
- Privileged roles: [your answer]

### Functional Scope
- Primary workflow: [your answer]
- Secondary workflows: [your answer]
- Entities: [your answer]
- State machines: [your answer]
- Notifications: [your answer]
- Files/documents: [your answer]
- Reports/dashboards: [your answer]

### Technical
- Tech stack: [your answer]
- Performance targets: [your answer]
- Availability: [your answer]
- Integrations: [your answer]
- Hosting: [your answer]

### Security
- Sensitive data: [your answer]
- Worst-case breach: [your answer]
- External callers: [your answer]
- Auth method: [your answer]

### Operations
- Environments: [your answer]
- Deployment: [your answer]
- Migrations: [your answer]
- Backups: [your answer]

### Timeline
- Go-live date: [your answer]
- Team: [your answer]
- P0 features: [your answer]

## Instructions

Generate ALL documents in this exact order. After each document, pause and 
ask for my confirmation before continuing. 

Document order:
1. Executive Summary
2. Product Requirements Document
3. Risk Register
4. Open Questions & Assumptions
5. Cleaned SRS
6. Requirements Matrix
7. Non-Functional Requirements
8. System Architecture
9. Technology Stack & ADRs
10. Authentication, Authorization & Permissions
11. Security Requirements & Threat Model
12. Domain Model & Glossary
13. Database Design
14. API Specification
15. UI/UX Specification
16. Implementation Plan
17. Task Breakdown (task-001 through task-[N])
18. Test Plan & Quality Strategy
19. Coding Standards
20. Repository Structure
21. DevOps, Deployment & Operations
22. Observability, Logging & Monitoring
23. Production Readiness Runbook
24. Acceptance Criteria
25. Traceability Matrix
26. CODEX_PROJECT_CONTEXT.md
27. CODEX_IMPLEMENTATION_RULES.md
28. CODEX_TASKS_INDEX.md
29. AGENTS.md
30. Individual task files (one per task)

Quality requirements for every document:
- Use the actual technology names, entity names, role names from my answers
- Every requirement must have a unique ID
- Every API endpoint must include: method, path, required permission, error cases
- Every state machine must include: all states, all transitions, all transition guards
- Every task file must include: goal, context, instructions (numbered steps), 
  constraints, acceptance criteria, verification commands, stop conditions
- No vague language ("fast", "secure", "easy") — use numbers and specific rules

Start with document 1 (Executive Summary) now.
```

---

## Mode C: Single-Document Prompts

Use these when you want to generate or improve a specific document.

### PRD Prompt
```
Generate a complete Product Requirements Document for this project.

Project context: [paste your executive summary]

The PRD must include:
1. Vision (one paragraph)
2. Goals (3–5 numbered, outcome-focused)
3. Non-Goals (explicit list — features that are NOT in this version)
4. Personas (table: persona name, role title, problems, needs)
5. Core Workflows (numbered sequences: trigger → steps → outcome)
6. User Stories (table: ID, story, priority, acceptance criteria, SRS source)
7. Business Rules (numbered invariants)
8. Edge Cases (concrete failure scenarios)
9. Dependencies (external services and their risk)
10. Release Criteria (what must be true before launch)

For user stories:
- Minimum 8 stories, covering every major user type
- Format: "As a [role], I want [action] so that [value]"
- Priority: P0 = must have for launch, P1 = important, P2 = nice to have
- Acceptance criteria: observable, testable behaviors

For business rules:
- Rules are invariants: things that must ALWAYS be true
- Format: "Rule: [statement that is always true]"

Generate the full PRD now.
```

### Domain Model Prompt
```
Generate a complete Domain Model and Glossary for this project.

Project context: [paste your executive summary and PRD]

The domain model must include:
1. Domain Summary (who does what — 3–5 sentences)
2. Entity Table (all entities: name, purpose, key fields, ownership)
3. State Machines (for every entity with states: draw all states and transitions)
   - For each transition: trigger, guard condition, actor, side effects
4. Domain Events (all events in past tense: UserRegistered, BookingApproved, etc.)
   - For each event: what triggers it, what side effects it causes
5. Glossary (define every term that might be ambiguous)
   - Include: entity names, state names, technical terms, business terms

For state machines, use this format:
[state] --[trigger | guard | actor]--> [state]
         side effects: [list]

Generate the complete domain model now.
```

### Task File Prompt
```
Generate a complete task file for this implementation task.

Project context: [paste CODEX_PROJECT_CONTEXT.md]
Tech stack and rules: [paste CODEX_IMPLEMENTATION_RULES.md]
API specification for this task: [paste relevant endpoints from API spec]
Requirements for this task: [paste relevant FR-xxx, SEC-xxx, etc.]

Task: [task name]
Depends on: [previous task]
Scope: [what this task builds]

Generate a task file with ALL of these sections:
1. Goal (one sentence)
2. Context (why this task exists and what it enables)
3. Requirements Covered (list by ID)
4. Dependencies (previous tasks)
5. Files and Areas Affected
6. Instructions (numbered steps, specific enough to implement)
7. Constraints (NEVER do these — list prohibited actions)
8. Security Notes
9. Data/Database Notes
10. API Notes
11. Tests Required (specific test cases)
12. Acceptance Criteria (observable HTTP behaviors)
13. Verification Commands (exact commands)
14. Expected Response Format
15. Stop Conditions (when to pause and ask)

For instructions: be specific enough that a developer who hasn't read any 
other document can implement correctly. Name the files, methods, and behaviors.

For acceptance criteria: write observable HTTP assertions:
"POST /[path] with [condition] returns [status] with [response shape]"

For stop conditions: cover security decisions, financial calculations, 
state transition ambiguities, and API contract conflicts.

Generate the complete task file now.
```

---

## Tips for Getting the Best Results from AI

**Give context, not just instructions**
The AI doesn't know your business. The more context you provide, the more accurate the output. Paste your discovery answers, not just the prompt.

**Confirm each document before continuing**
The AI will propagate mistakes from early documents into later ones. Confirm the PRD is correct before generating the SRS. Confirm the domain model before generating the DB design.

**Push back on vague output**
If an ADR says "chosen for its good performance" — ask for specific numbers. If an acceptance criterion says "works correctly" — ask for the exact HTTP assertion. Every vague statement is a future bug.

**Ask for the gaps**
After generating each document, ask: "What did I not tell you that might affect this document?" and "What assumptions did you make that I should confirm?"

**Iterate the task files hardest**
The task files are what the AI agent actually uses to implement. Spend the most time reviewing them. Every missing instruction is a future rework loop.
