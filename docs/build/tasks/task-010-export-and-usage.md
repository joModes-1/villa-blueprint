# Task 010: Export and Usage

## Goal
Download the pack as a zip, and show per-project usage and cost. Enforce the token budget end to end.

## Context
`29` (zip layout and slug), `10` (export and usage endpoints), `27` (budget), `13` (T8).

## Requirements Covered
FR-030, FR-031, FR-032.

## Dependencies
task-009.

## Files and Areas
`packages/core/src/pack/zip.ts`, `apps/web/src/server/{export,usage}.ts`, plus the export and usage routes.

## Steps
1. `zip.ts`: `buildZip(projectName, docs: { path, content }[]) → Promise<Uint8Array>`, using `jszip` with the root folder `<slug>/`, skipping `internal/`, and ordering files by `PACK_SPEC` and then the task files.
2. Export route:
   - status guard: `ready`, or `blocked` with no open blocker; otherwise 422 `EXPORT_BLOCKED`
   - load `done` docs, build the zip
   - respond with `Content-Type: application/zip` and `Content-Disposition: attachment; filename="<slug>.zip"`
3. Usage route: sum `usage_events` for the project, with `byTag` grouping by the tag prefix (`extract`, `analyze`, `doc`, `task-plan`, `contradictions`).
4. Budget check: confirm the worker calls `assertBudget` before every AI call (tasks 006–009). Add an integration test: `MAX_TOKENS_PER_PROJECT=1` makes the run fail with `BUDGET_EXCEEDED` and creates no further `UsageEvent` (AC-13).

## Tests Required
- Unit: the zip has the exact paths and no `internal/`; slug rules.
- API: export blocked → 422; ready → a zip whose entries include `START-HERE.md`, `AGENTS.md`, `CLAUDE.md`, 27 `docs` files, 3 `docs/build` files and the task files (AC-10). Usage totals match the inserted events.
- Worker: the budget test.

## Acceptance Criteria
AC-10, AC-12 (export part) and AC-13. All checks pass.

## Verification Commands
```bash
pnpm lint && pnpm typecheck && pnpm test
```

## Stop Conditions
None expected.
