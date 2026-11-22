# Task 007: Analysis, Interview and Ledger

## Goal
After processing, analysis fills the ledger from cited facts and writes questions. Users answer, skip or accept all recommended answers. The interview finishes with defaults. Users can edit any decision, and edits report which documents became stale.

## Context
`27` (stage `analyze`, stage `interview`), `28` (resolution order), `29` (stale tracking), `06` (transitions), `10` (questions, decisions and facts endpoints).

## Requirements Covered
FR-013, FR-014, FR-015, FR-016, FR-017.

## Dependencies
task-006.

## Files and Areas
- `packages/core/src/pipeline/prompts/analyze.ts`, `packages/core/src/ledger/apply.ts`
- `apps/worker/src/jobs/analyze-project.ts`
- `apps/web/src/server/{interview,ledger}.ts` and their routes
- tests

## Steps
1. Core:
   - `prompts/analyze.ts`, with the wording from `27`
   - `applyAnalysis(ledger, questions, facts, response, mode) → { decisionUpdates, questionsToCreate, questionIdsToDelete }`, a pure function implementing post-processing steps 1–5 from `27`
   - `finishInterview(ledger, mode) → decisionUpdates`
2. Worker `analyze-project`:
   - a `completeJson` call with `AnalyzeResponse`, saving a `UsageEvent`
   - apply the result in one transaction, bumping `version` on changed decisions
   - status: `interviewing`, or run `finishInterview` and go to `ready_to_generate`
   - the run is created with `total: 1` and marked succeeded
   - register the queue in the worker index
3. Web:
   - `GET facts`
   - `GET questions` (include `area` from the catalog)
   - `POST answer`, `POST skip`, `POST accept-recommended`. After each, if no question remains open, run `finishInterview` and transition to `ready_to_generate`. All of this happens in one transaction
   - `GET decisions` in catalog order, merged with the catalog (`area`, `category`, `priority`)
   - `PATCH decisions/:key`: validate the key against the catalog, save, and bump the version. Then, if documents exist, recompute hashes with `computeHashes` and compare them to the stored `inputsHash`. Set differing `done` documents to `stale`, and transition `ready`/`blocked` → `stale`. Return `staleDocuments`
4. Extend `POST /retry` to handle a failed `analyze` run by re-enqueueing `analyze-project`.

## Tests Required
- Core unit (`16`): `applyAnalysis` and `finishInterview`, founder vs expert.
- Worker integration with the mock: after process and analyze, the project is `interviewing`, `product.one_liner` is confirmed with a cited fact, and every other P0 key has an open question.
- API:
  - accept-recommended → all answered, status `ready_to_generate`, P1 keys `assumed` (AC-07)
  - answering one question makes its decision `confirmed`, with `sourceRefs.questionId`
  - re-running analyze does not overwrite that answer (BR-05)
  - PATCH with an unknown key → 400
  - PATCH before any generation → `staleDocuments: []`

## Acceptance Criteria
AC-06 (complete) and AC-07. All checks pass.

## Verification Commands
```bash
pnpm lint && pnpm typecheck && pnpm test
```

## Stop Conditions
None expected.
