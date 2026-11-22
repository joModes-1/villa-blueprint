# Task 005: Projects and Sources API

## Goal
Owners can create, read, update and delete projects (each new project gets one ledger row per catalog key), and can add and delete sources within the limits. A queue module is ready for later tasks.

## Context
`10` (projects and sources endpoints, upload rules), `06` (when sources may change), `12` (ownership), `13` (T1, T6, T7).

## Requirements Covered
FR-004, FR-005, FR-006, FR-007, FR-008, FR-009.

## Dependencies
task-004.

## Files and Areas
`apps/web/src/server/{projects,sources,queue}.ts`, plus the project and source route handlers and their tests.

## Steps
0. Build `packages/core/src/ingest/figma.ts` now, exactly as in `27` (Figma section), with `fetchImpl` injected. Task-006 adds its unit tests alongside the other parsers.
1. `projects.ts`:
   - `loadOwnedProject(prisma, id, userId)`, which throws `NotFoundError` when missing
   - `createProject`: in one transaction, create the project and `LEDGER_CATALOG.map` decision rows (status `deferred`, value '')
   - `listProjects` with counts, `getProject` with counts and the latest run, `renameOrSetMode` (mode guard per `06`), `softDelete`
2. `sources.ts`:
   - add text or markdown (JSON body), add a file (multipart via `req.formData()`), add figma (JSON)
   - check `Content-Length`, then the file size, before reading bytes, and return `413 FILE_TOO_LARGE`
   - return `SOURCE_LIMIT` at 20
   - infer the kind from the extension
   - the state guard from `06`, via `InvalidStateError`
   - for figma, call core `fetchFigma(url, token, fetch)` (task-006 builds `ingest/figma.ts`; build it here instead if it doesn't exist yet) during the request, with a 30 s timeout. Save `kind: figma`, `url`, `title` = "Figma: <file name>", `text` = the result, `raw = null`, `status: pending`. **The token is discarded after the fetch** and never saved, queued or logged. Figma errors return 422 with their code, and no source is saved
   - list (no `raw`; preview of 500 chars), delete (cascades facts)
3. `queue.ts`:
   - a lazy PgBoss singleton on `globalThis`
   - `QUEUES = ['process-source','analyze-project','schedule-generation','generate-doc','run-gates']`
   - `createQueue` for each on first use
   - `enqueue(name, data)` with `retryLimit: 2, retryDelay: 10, expireInSeconds: 900`
4. Route handlers per `10`.

## Tests Required
API tests (queue mocked):
- creating a project creates exactly one decision per catalog key
- list shows only your own projects; a user B request to user A's project → 404 on GET, PATCH, DELETE and the sources routes (AC-03)
- add text; add `.md` via multipart; add a `.pdf` (built with `pdf-lib`); add a `.json` export; an unsupported extension → 400
- a file over 10 MB → 413; a 21st source → 422 `SOURCE_LIMIT`
- adding a source in `generating` → 409 `INVALID_STATE`
- a figma source, with `fetch` stubbed to return a small file tree, is saved with its text and stores no token (assert no column of the row, and no pg-boss job, contains the token string); a stubbed 403 → 422 `FIGMA_TOKEN_INVALID` and no row

## Acceptance Criteria
AC-03, AC-04 and AC-05 at the API level. All checks pass.

## Verification Commands
```bash
pnpm lint && pnpm typecheck && pnpm test
```

## Stop Conditions
None expected.
