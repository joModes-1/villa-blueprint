# Task 014: Testing, DevOps and Observability

## Goal
The full E2E test passes; the worker integration suite is complete; the golden test script exists; CI works (no Docker); logging matches `18`.

## Context
`16` (all of it), `17` (env, scripts, deployment, CI), `18`, `26`.

## Requirements Covered
AC-01 to AC-18 (verification), NFR-001 to NFR-013.

## Dependencies
task-012.

## Files and Areas
`playwright.config.ts`, `e2e/full-flow.spec.ts`, `e2e/mcp-flow.spec.ts`, `apps/worker/tests/*` (complete), `scripts/golden-test.ts`, `scripts/golden/`, `.github/workflows/ci.yml`, logging touches.

## Steps
1. Copy `assets/golden/*` to `scripts/golden/`.
2. `playwright.config.ts` with three `webServer` entries (the third is mcp: `pnpm --filter @blueprint/mcp start`, url `http://localhost:3102/health`, `API_URL=http://localhost:3000`), all three with `AI_PROVIDER=mock`, `DATABASE_URL=$DATABASE_URL_TEST` and `APP_URL=http://localhost:3000`:
   - web: `pnpm --filter @blueprint/web start` after a build (or `dev` locally), url `http://localhost:3000/api/v1/health`
   - worker: `pnpm --filter @blueprint/worker start`, url `http://localhost:3101/health`
   - plus `globalSetup` resetting the test DB
3. `e2e/full-flow.spec.ts` and `e2e/mcp-flow.spec.ts` (AC-18) exactly as described in `16`. Read the zip entries with `jszip` from the download.
4. Complete the worker integration suite from `16`: full flow, contradiction, budget.
5. `scripts/golden-test.ts` as described in `16`. It refuses to run unless `AI_PROVIDER=openrouter` and a key are set, and prints a pass/fail table and the total cost.
6. Production run check: `pnpm build`, then start web, worker and mcp with their `start` scripts against the dev database, and confirm all three health URLs answer.
7. `.github/workflows/ci.yml` as described in `17`.
8. Logging: check the web per-request line and the worker per-job and per-AI-call lines with the fields from `18`. Add the AC-15 check: the E2E run's captured server logs (Playwright `webServer` `stdout: 'pipe'` written to a file) contain no test password, session token value or API key.

## Tests Required
`pnpm test:e2e` green; the worker suite green; `pnpm test --coverage` for core ≥ 80%.

## Acceptance Criteria
AC-01 to AC-18 all demonstrably covered by tests (list each AC with its test name in the report). CI file valid (no service containers). The production start commands work.

## Verification Commands
```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
pnpm build && pnpm --filter @blueprint/web start   # plus worker and mcp start, then curl the three health URLs
```

## Stop Conditions
The Playwright browsers cannot be installed, or the production start commands fail for a reason outside the code. Report it, with the error.
