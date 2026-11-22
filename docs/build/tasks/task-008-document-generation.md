# Task 008: Document Generation

## Goal
`POST /generate` produces the whole pack through the DAG: AI-written docs by the worker, code-written files by the renderers, the task plan, and the task files. With the mock AI it finishes in under 60 seconds. Regenerate re-runs only stale or failed files.

## Context
`27` (stage `generate` in full: system prompt, user prompt, context budget, validation, task plan), `29` (everything), `06`.

## Requirements Covered
FR-018, FR-019, FR-020, FR-021, FR-022, FR-023, FR-024.

## Dependencies
task-007.

## Files and Areas
- `packages/core/src/pipeline/prompts/{doc,taskPlan}.ts`
- `packages/core/src/pack/render/*.ts`, `packages/core/src/pack/validate.ts`
- `apps/worker/src/jobs/{schedule-generation,generate-doc}.ts`
- `apps/web/src/server/generation.ts`, plus the estimate, generate, documents and document-content routes

## Steps
1. Core `prompts/doc.ts`: `buildDocPrompt(spec, ledgerRows, contextDocs, figmaText)`. Copy the system rules verbatim from `27`, insert headings and `formatRules`, and apply the 60k context budget with even split and redistribution.
2. Core `pack/validate.ts`: `validateDoc(content, headings)`, which strips a markdown fence and returns `{ ok, missing: string[] }`.
3. Core `prompts/taskPlan.ts` and `validateTaskPlan(plan, frIds)`, covering the four rules in `27`.
4. Core renderers, each a pure function with a snapshot test:
   - `renderIndex`, `renderOpenQuestions`, `renderTaskBreakdown`, `renderTraceability`, `renderTasksIndex`
   - `renderTaskFile`, `renderAgents`, `renderClaude`, `renderStartHere`
   - Match the layouts described in `29`.
   - For `renderStartHere` and `renderAgents`, use **this pack's own `START-HERE.md` and `AGENTS.md` as the model**: same sections and same prompt pattern, filled from the ledger and plan. Prompts group 2–3 tasks each, there are at most 8, and they are followed by the "continue" and "final audit" prompts.
5. Web `generation.ts`:
   - `estimate`
   - `startGeneration`: the guards from `27`; create missing `Document` rows from `PACK_SPEC`; set `pending` (first run) or `stale`/`failed` → `pending`; create the run with total = number of pending docs; transition to `generating`; enqueue `schedule-generation`
6. Worker `schedule-generation`, inside `$transaction` with `pg_advisory_xact_lock(hashtext(projectId))`:
   - compute the ready files; render code files immediately (save `done` and `inputsHash`, and increment the run)
   - loop until no code file is ready
   - set ready AI files to `generating` and collect them
   - after the commit, enqueue `generate-doc` for each
   - if every document is `done`: enqueue `run-gates` (wired in task-009; enqueue it now anyway) and transition to `gating`
   - if any is `failed` and nothing is generating: fail the run
7. Worker `generate-doc`:
   - load the spec, the ledger and context docs (and Figma source text for `11`)
   - call the AI, validate, retry once, save, record usage, increment the run, enqueue `schedule-generation`
   - for `internal/task-plan.json`: use `completeJson` with `TaskPlan`, `validateTaskPlan` and one retry; save the JSON as content; create the task `Document` rows (`pending`) and add them to the run total
8. The documents list excludes `internal/`. Document content is fetched by `?path=`.

## Tests Required
- Core: renderer snapshots; `buildDocPrompt` budget (3 long docs are truncated evenly with the marker); `validateDoc`; `validateTaskPlan` (each rule).
- Worker integration with the mock:
  - a full generation loop (call the handlers in a loop until no jobs are queued, using an in-memory queue spy) ends with every spec file and 8 task files `done` and the status `gating`
  - a mock that omits a heading once → retried → done; omitting it twice → `failed`
- API:
  - an empty P0 → 422 `LEDGER_INCOMPLETE`, with details (AC-08)
  - estimate returns positive numbers
  - after a PATCH of `stack.backend` on a generated project, a regenerate run's total equals the stale count (AC-11)

## Acceptance Criteria
AC-08, AC-09 (up to `gating`), AC-11. All checks pass.

## Verification Commands
```bash
pnpm lint && pnpm typecheck && pnpm test
```

## Stop Conditions
None expected.
