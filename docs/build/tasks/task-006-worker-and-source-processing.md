# Task 006: Worker Runtime and Source Processing

## Goal
`POST /analyze` starts a run. The worker parses every pending source, extracts facts with verified quotes, counts progress atomically, and, on the last source, enqueues `analyze-project`. Failed runs can be retried.

## Context
`27` (stages table, run counters, stage `process`), `07` (data flow, shutdown), `08` (pg-boss and pdf-parse traps), `13` (T5–T7).

## Requirements Covered
FR-010, FR-011, FR-012, FR-025, FR-026.

## Dependencies
task-005.

## Files and Areas
- `packages/core/src/ingest/*`, `packages/core/src/pipeline/{chunk.ts, prompts/extract.ts}`, a `filterFacts` function in core
- `apps/worker/src/{index,env,context,runs}.ts`, `apps/worker/src/jobs/process-source.ts`
- web `analyze`, `runs/latest` and `retry` handlers
- tests

## Steps
1. Core ingest:
   - `text.ts`
   - `chatExport.ts`, plus fixtures for both formats in `packages/core/tests/fixtures`
   - `pdf.ts`, using the `pdf-parse/lib/pdf-parse.js` import
   - `docx.ts`
   - `figma.ts` already exists from task-005; add its unit tests here
   - `index.ts` with `parseSource(kind, raw|text) → { text, meta }`. For `figma`, return the existing text unchanged
2. Core `chunk.ts`, `prompts/extract.ts` (wording from `27`), and `filterFacts(facts, chunk, existingStatements)`, which applies the quote check and dedupe.
3. Worker `index.ts`:
   - validate env
   - start PgBoss and create all queues
   - `work('process-source', { localConcurrency: 3 }, …)`
   - a health HTTP server on `WORKER_HEALTH_PORT`
   - SIGTERM/SIGINT graceful stop
4. `runs.ts`:
   - `createRun(projectId, stage, total)`
   - `incrementRun(runId)` with the atomic SQL from `27`, returning `{ done, total }`
   - `failRun(runId, error)`, which also transitions the project to `failed`
5. `jobs/process-source.ts`:
   - parse, apply the 400k project cap, then extract per chunk with `completeJson` and the mock or real AI
   - save a `UsageEvent` per call, filter, insert the facts
   - mark the source `parsed`; on a parse error, mark the source `failed` with the error code and do not fail the run
   - increment the run; if `done === total`, enqueue `analyze-project`
6. Web:
   - `POST /analyze`: state guard → `transition` → `processing`; create a run with total = pending sources; enqueue one `process-source { sourceId, runId }` per source → `202`
   - `GET /runs/latest`
   - `POST /retry`: re-enqueue the failed sources of the latest failed `process` run (other stages are added in tasks 007–009)

## Tests Required
- Core unit: chatExport, pdf, docx, figma, chunk, filterFacts (per `16`).
- Worker integration on the test DB with the mock AI. Call the job handler functions directly:
  - two sources processed; facts saved; the run reaches `done = total`
  - `analyze-project` is enqueued exactly once, even when both handlers finish "together": run them with `Promise.all` and spy on `enqueue`
  - a corrupt PDF → source `failed`, and the run still completes
- API: analyze with 0 sources → 409; analyze → 202 with a run.

## Acceptance Criteria
AC-06 up to facts saved (the status move to `interviewing` comes in task-007). All checks pass.

## Verification Commands
```bash
pnpm lint && pnpm typecheck && pnpm test
```

## Stop Conditions
None expected.
