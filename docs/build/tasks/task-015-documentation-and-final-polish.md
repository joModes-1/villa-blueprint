# Task 015: Documentation and Final Polish

## Goal
A releasable repository: README, every acceptance criterion verified, no rough edges, and a final report.

## Context
`21` (AC list), `22` (README), `26` (go-live), `05` (NFRs).

## Requirements Covered
All.

## Dependencies
task-014.

## Files and Areas
`README.md`, small fixes anywhere, and `docs/build/TASKS_INDEX.md` statuses.

## Steps
1. Write `README.md` from `22`.
2. Walk AC-01 to AC-18. For each, confirm the test that proves it passes, and fix anything that doesn't.
3. Check the NFRs that are measurable locally: NFR-003 (mock flow ≤ 60 s, from the E2E timing), NFR-005, NFR-006, NFR-007, NFR-011, NFR-012, NFR-013. Record the numbers.
4. UI sweep in the browser: every step's empty, loading and error state; keyboard-only pass through sign-up and the workspace; no console errors.
5. Remove dead code, unused dependencies and stray `console.log`. Lint has 0 warnings.
6. Set every task row in `TASKS_INDEX.md` to `Done`.
7. Final report:
   - the AC table (AC, test, result)
   - the NFR numbers
   - every assumption made across all tasks
   - known limitations (the deferred list from `23`)
   - the exact command to run the golden test with a real key

## Tests Required
Everything green.

## Acceptance Criteria
AC-16: a clean clone, plus `pnpm install`, `cp .env.example .env` (pointing at a PostgreSQL server), `pnpm db:migrate` and `pnpm db:migrate:test`, followed by all checks, passes.

## Verification Commands
```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
```

## Stop Conditions
None.
