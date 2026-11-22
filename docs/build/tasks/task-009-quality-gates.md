# Task 009: Quality Gates

## Goal
After generation, gates G01–G11 run, findings are saved, and the project becomes `ready` or `blocked`. Users can accept findings.

## Context
`30` (every rule, exact checks and messages, G11 prompt, the accept rules).

## Requirements Covered
FR-027, FR-028, FR-029.

## Dependencies
task-008.

## Files and Areas
- `packages/core/src/gates/{markdown,rules,contradictions,run}.ts`
- `apps/worker/src/jobs/run-gates.ts`
- `apps/web/src/server/gates.ts`, plus the findings routes

## Steps
1. `markdown.ts`:
   - `parseTables(md)` returns rows as cell arrays, excluding header and separator rows
   - `hasHeading(md, h)`
   - `stripCodeBlocks(md)`
   - `findSection(md, heading)`
2. `rules.ts`: G01–G10 exactly as in `30`, each as a separate exported function, plus `DETERMINISTIC_RULES`.
3. `contradictions.ts`: the batching, prompt and quote verification from `30`.
4. `run.ts`: `runGates(input, ai)` runs the deterministic rules, then G11, and sorts the result.
5. Worker `run-gates`:
   - load the docs, ledger, questions and plan; run the gates; record usage for G11 calls
   - in one transaction, replace findings, re-create matching previously accepted ones as `accepted`, then transition to `ready` or `blocked`
   - mark the run succeeded
6. Web:
   - `GET findings`, blockers first
   - `POST accept`: save the reason; if no open blocker remains and the status is `blocked`, transition to `ready`
7. Extend `/retry` for a failed gate run.

## Tests Required
- Core unit: a passing and a failing fixture for each of G01–G10; G11 with mock findings (one quote present, one absent).
- Worker integration:
  - the full mock flow ends `ready` with 0 blockers (AC-09 complete)
  - the contradiction test from `16` (Clerk vs JWT plus `MOCK_CONTRADICTION`) → `blocked`, with a G11 blocker on `08`
- API: accept the blocker → `ready` (AC-12, gate part).

## Acceptance Criteria
AC-09 and AC-12 (gates). All checks pass.

## Verification Commands
```bash
pnpm lint && pnpm typecheck && pnpm test
```

## Stop Conditions
None expected.
