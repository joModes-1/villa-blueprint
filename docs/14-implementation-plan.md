# Implementation Plan

## Phases

| Phase | Tasks | Outcome you can see |
|---|---|---|
| Foundation | 001–003 | Monorepo builds; database migrated; sign up and log in work through the API |
| Engine | 004–006 | Core AI client with mock; projects and sources API; worker parses and extracts facts |
| Brain | 007–008 | Interview and ledger; full pack generation with the mock AI |
| Trust | 009–010 | Gates and zip export |
| Face | 011–012 | Complete UI for the whole flow |
| Connect | 013 | Access tokens and the MCP server: drive Blueprint from Claude or Cursor |
| Proof | 014–015 | E2E green, CI, deploy commands, logs, README, golden test script |

## Build Order

Strictly sequential: task-001 → task-015. Each task ends green (`pnpm lint && pnpm typecheck && pnpm test`, plus `pnpm build` from task-011). Never start a task while the previous one has failing checks.

Why this order: the core pipeline is built and tested headlessly before any UI exists (tasks 004–010). The UI tasks then only wire screens to a working API, which is where agents are fastest and least error-prone.
