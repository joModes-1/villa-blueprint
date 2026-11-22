# Output Pack Specification

This defines every file Blueprint generates for a user's project. Implement it as data in `packages/core/src/pack/spec.ts`, exported as `PACK_SPEC: PackFileSpec[]`. The generator, the stale tracker, the gates and the zip builder all read this one list.

```ts
export interface PackFileSpec {
  path: string;                 // path inside the zip, e.g. "docs/09-database-design.md"
  title: string;
  writer: 'ai' | 'code';
  model?: 'reasoning' | 'fast'; // required when writer = 'ai'
  after: string[];              // paths that must be done before this one starts (DAG)
  keys: string[] | 'all';       // ledger keys whose change makes this file stale
  context: string[];            // earlier generated paths included in the prompt (subset of `after`, or the same)
  guide?: string;               // forward-build guide file used as instructions (assets/forward-build/…)
  template?: string;            // example file used for depth and format (assets/templates/…)
  headings?: string[];          // required "## " headings, checked by gate G01
  formatRules?: string;         // extra format rule appended to the system prompt (see below)
}
```

Scheduling: a file starts when every path in `after` is `done`. All ready files start in parallel, up to `GENERATION_CONCURRENCY` (default 4). Code-written files run instantly inside the worker job that unblocks them.

`task-plan.json` is an internal artifact, never exported. It is the AI's structured task list, stored as a `Document` with path `internal/task-plan.json`.

## AI-written files

The guide column abbreviates `assets/forward-build/` filenames: `02` = `02-product-layer-guide.md`, `03` = `03-requirements-layer-guide.md`, `04` = `04-architecture-layer-guide.md`, `05` = `05-domain-data-layer-guide.md`, `06` = `06-build-layer-guide.md`, `07` = `07-operations-layer-guide.md`, `08` = `08-ai-handoff-guide.md`. Every AI-written file's `template` is an eu-portal example from `assets/templates/`. For `docs/NN-*.md`, it is `templates/project-docs/` + the same filename. For `docs/build/PROJECT_CONTEXT.md`, it is `templates/codex-handoff/CODEX_PROJECT_CONTEXT.md`. For `docs/build/IMPLEMENTATION_RULES.md`, it is `templates/codex-handoff/CODEX_IMPLEMENTATION_RULES.md`. The template folder keeps its original eu-portal names, but the generated pack never uses "codex" names.

| path | model | after | keys | guide | required headings |
|---|---|---|---|---|---|
| docs/01-executive-summary.md | fast | — | product.*, scope.*, users.personas, risk.top | 02 | Summary; Problem; Solution; Users; MVP Scope; Key Risks |
| docs/02-product-requirements-document.md | reasoning | 01 | product.*, scope.*, users.*, rules.business, flows.primary | 02 | Vision; Personas; User Stories; Workflows; Business Rules; MVP Scope; Deferred |
| docs/20-risk-register.md | fast | 02 | risk.top, scope.*, integrations.*, data.sensitivity | 02 | Risks |
| docs/03-cleaned-srs.md | reasoning | 02 | all | 03 | Functional Requirements; Constraints |
| docs/04-requirements-matrix.md | fast | 03 | scope.* | 03 | Matrix |
| docs/05-non-functional-requirements.md | fast | 03 | nfr.*, ops.*, ui.accessibility, security.compliance | 03 | Non-Functional Requirements |
| docs/21-acceptance-criteria.md | fast | 03 | rules.business, flows.primary | 03 | Acceptance Criteria |
| docs/07-system-architecture.md | reasoning | 03 | architecture.style, stack.*, api.style, integrations.*, ops.hosting | 04 | Components; Data Flow; Integrations; Deployment View |
| docs/08-technology-stack-and-adrs.md | reasoning | 07 | stack.*, architecture.style, api.style, auth.method, ops.*, testing.strategy | 04 | Stack; ADRs |
| docs/12-authentication-authorization-and-permissions.md | reasoning | 07 | auth.*, rbac.model, users.roles, users.multi_tenant | 04 | Authentication; Roles; Permission Matrix |
| docs/13-security-requirements-and-threat-model.md | reasoning | 12 | security.*, data.sensitivity, auth.*, integrations.payments | 04 | Threats; Controls |
| docs/06-domain-model-and-glossary.md | reasoning | 03 | data.entities, data.lifecycles, rules.business | 05 | Entities; State Machines; Glossary |
| docs/09-database-design.md | reasoning | 06, 08 | data.*, stack.database, users.multi_tenant | 05 | Schema Overview; Important Columns; Indexes |
| docs/10-api-specification.md | reasoning | 09, 12 | api.style, rbac.model, flows.primary | 05 | API Design Principles; Endpoints; Error Format |
| docs/11-ui-ux-specification.md | fast | 10 | ui.*, flows.primary, users.personas | 05 | Screens; States; Design System |
| internal/task-plan.json | reasoning | 10, 11, 13 | all | 06 | *(JSON, see `27` stage `generate`)* |
| docs/14-implementation-plan.md | fast | internal/task-plan.json | timeline.target | 06 | Phases; Build Order |
| docs/16-test-plan-and-quality-strategy.md | fast | internal/task-plan.json | testing.strategy, nfr.* | 06 | Test Layers; Critical Flows; Coverage |
| docs/19-coding-standards.md | fast | 08 | stack.*, api.style | 06 | Standards |
| docs/25-repository-structure.md | fast | 08 | stack.*, architecture.style | 06 | Tree |
| docs/17-devops-deployment-and-operations.md | fast | 08 | ops.*, data.retention | 07 | Environments; Environment Variables; Deployment; Backups |
| docs/18-observability-logging-and-monitoring.md | fast | 17 | ops.observability, nfr.* | 07 | Logging; Metrics; Alerts |
| docs/22-readme-draft.md | fast | 17, 25 | product.one_liner, stack.* | 07 | Setup; Commands |
| docs/26-production-readiness-runbook.md | fast | 17, 18 | ops.*, data.retention | 07 | Go-Live Checklist; Rollback |
| docs/build/PROJECT_CONTEXT.md | fast | 10, 11 | all | 08 | *(none)* |
| docs/build/IMPLEMENTATION_RULES.md | fast | 08, 13, 19 | stack.*, security.*, testing.strategy | 08 | *(none)* |

### Format rules per file

These are stored as `formatRules?: string` on the spec, and appended to the system prompt as rule 9. The gates in `30` depend on them.

| path | formatRules |
|---|---|
| 03-cleaned-srs.md | Under "Functional Requirements", one table `\| ID \| Requirement \| Priority \|` with IDs FR-001… and priority P0/P1/P2 |
| 04-requirements-matrix.md | One table `\| ID \| Requirement \| Priority \| Status \|` listing every FR ID from 03 |
| 05-non-functional-requirements.md | One table `\| ID \| Requirement \| Target \|` with IDs NFR-001…; every Target contains a number |
| 06-domain-model-and-glossary.md | Under "Entities", one table `\| Entity \| Description \| Key fields \|` |
| 09-database-design.md | Under "Schema Overview", one table `\| Table \| Purpose \| Key notes \|` whose first column is the exact table name |
| 10-api-specification.md | Under "Endpoints", one table `\| Method \| Path \| Purpose \| Access \|`; Access is never empty |
| 11-ui-ux-specification.md | Under "Screens", one table `\| Screen \| Route \| Purpose \| Key states \|` |

`context` for each AI-written file equals its `after` list, plus `docs/03-cleaned-srs.md` for every file at or after `07`. Prefixes like `03` in the `after` column abbreviate the full `docs/03-…` path. A key ending in `.*` means every key with that prefix.

## Code-written files

These are rendered by pure functions in `packages/core/src/pack/render/`. No AI is involved, which is what keeps them consistent with the ledger.

| path | after | keys | renderer and content |
|---|---|---|---|
| docs/00-index.md | — | all | `renderIndex(ledger, spec)`: title, the one-liner, a `| Area | Confirmed decision |` table with one row per ledger key whose status is confirmed or assumed (assumed values suffixed " *(assumed)*"), then the documentation map from `PACK_SPEC` |
| docs/23-open-questions-and-assumptions.md | — | all | `renderOpenQuestions(ledger, questions)`: tables "Assumptions" (status assumed) and "Deferred" (status deferred), each `\| Key \| Area \| Value \| Rationale \|`, then "Unanswered questions" `\| Key \| Question \| Status \|` (open or skipped). Gate G07 looks for the key in the Assumptions table |
| docs/15-task-breakdown.md | internal/task-plan.json | all | `renderTaskBreakdown(plan)`: one row per task with number, title, depends-on, requirement IDs |
| docs/24-traceability-matrix.md | internal/task-plan.json, 03, 05, 16 | all | `renderTraceability(srsIds, plan)`: every FR/NFR ID parsed from 03 and 05, the tasks that list it, and the doc it comes from |
| docs/build/TASKS_INDEX.md | internal/task-plan.json | all | `renderTasksIndex(plan)`: the eu-portal table format (Status, Task, Depends on, Required docs, Expected output, Verification) |
| docs/build/tasks/task-NNN-slug.md | internal/task-plan.json | all | `renderTaskFile(task, ledger)`: sections Goal, Context, Requirements Covered, Dependencies, Files and Areas, Steps, Tests Required, Acceptance Criteria, Verification Commands, Stop Conditions |
| AGENTS.md | docs/build/IMPLEMENTATION_RULES.md, internal/task-plan.json | all | `renderAgents(ledger, plan)`: overview, run commands (from `stack.*`), architecture rules, security rules, testing rules, definition of done |
| CLAUDE.md | AGENTS.md | — | `renderClaude()`: one line, "Read and follow AGENTS.md. Start with START-HERE.md." |
| START-HERE.md | AGENTS.md | all | `renderStartHere(ledger, plan)`: what the pack is, reading order, and the **numbered prompts**, grouping tasks 2–3 per prompt, never more than 8 prompts, plus the "continue" prompt and the final-audit prompt (see this folder's `START-HERE.md` for the exact wording pattern) |

## Zip layout

```text
<project-slug>/
  START-HERE.md
  AGENTS.md
  CLAUDE.md
  docs/00-index.md … 26-production-readiness-runbook.md
  docs/build/PROJECT_CONTEXT.md
  docs/build/IMPLEMENTATION_RULES.md
  docs/build/TASKS_INDEX.md
  docs/build/tasks/task-001-*.md …
```

`<project-slug>` is the project name, lower-cased, with non-alphanumerics replaced by `-`, at most 50 characters. `internal/*` is never exported.

## Stale tracking

Each generated `Document` stores `inputsHash`. That is the SHA-256 of the JSON of `{ keys: values of its ledger keys, sorted by key; context: inputsHash of each context path }`. After any ledger edit, recompute every file's hash in DAG order, in one pass. A hash depends only on ledger values and the hashes before it, so a changed key flows down the DAG in that same pass. Mark a file `stale` when its new hash differs from its stored one. Regenerate re-runs only stale files, in DAG order, and stores the new hash.
