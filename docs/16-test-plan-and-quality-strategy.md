# Test Plan and Quality Strategy

## Test Layers

| Layer | Tool | Where | Database | AI | Runs in |
|---|---|---|---|---|---|
| Unit | Vitest | `packages/core/tests` | none | mock or none | `pnpm test` |
| API integration | Vitest | `apps/web/tests/api` | `blueprint_test` | none (queue mocked with `vi.mock('@/server/queue')`) | `pnpm test` |
| Worker integration | Vitest | `apps/worker/tests` | `blueprint_test` | mock | `pnpm test` |
| MCP integration | Vitest | `apps/mcp/tests` | none | none (API stubbed) | `pnpm test` |
| End to end | Playwright (Chromium) | `e2e/` | `blueprint_test` | mock, through a real worker | `pnpm test:e2e` |
| Golden (quality) | `tsx scripts/golden-test.ts` | `scripts/` | dev DB | **real** OpenRouter | manually, before release |

Test database: `DATABASE_URL_TEST`. A Vitest `globalSetup` in web and worker runs `prisma migrate reset --force --skip-seed` against it once. Each test file truncates its tables in `beforeEach` with `TRUNCATE … CASCADE`. Web and worker tests run with `fileParallelism: false` because they share one database.

## Critical Flows

### Unit tests (packages/core), minimum list

| Area | Cases |
|---|---|
| `pipeline/state.ts` | every allowed transition in `06`; three disallowed transitions throw |
| `pipeline/chunk.ts` | short text gives 1 chunk; 30k text gives 3 chunks, each ≤ 12,000 chars; paragraph carry-over |
| `ingest/chatExport.ts` | ChatGPT fixture → ordered `User:`/`Assistant:` lines with a conversation title; Claude fixture → same; unknown JSON → plain text |
| `ingest/pdf.ts`, `ingest/docx.ts` | a PDF built in-test with `pdf-lib` and a DOCX built with `docx` (devDependencies) return their text |
| `ingest/figma.ts` | URL parsing (design/, file/, invalid); tree walk over a stubbed `fetch` response gives pages, screens, texts and styles; 403 and 404 map to their codes; the 60k cap |
| fact filtering | a quote that is not in the chunk is dropped; dedupe |
| `ledger/apply.ts` | `applyAnalysis` drops unknown keys and bad fact IDs; never overwrites a user answer; creates missing P0 questions; `finishInterview` founder vs expert |
| `pack/dag.ts` | `PACK_SPEC` has no cycles; every `after` path exists; ready-set computation |
| `pack/hash.ts` | changing `stack.backend` changes the hashes of 07, 08 and every file that has them in `context`, and does not change 01 or 02 |
| `pack/render/*` | each renderer snapshot-tested on a fixture ledger and task plan; START-HERE groups tasks into ≤ 8 prompts |
| `gates/rules.ts` | for each of G01–G10, one passing pack and one failing pack built from small fixtures |
| `gates/contradictions.ts` | a mock with a finding whose quote is absent → dropped; present → blocker |
| `ai/json.ts` | fenced JSON parsed; invalid JSON triggers exactly one retry; a second failure throws |
| `ai/openrouter.ts` | with stubbed `fetch`: 429 then 200 succeeds; empty output retried; timeout honored; cost read from `usage.cost` |
| `ai/budget.ts` | throws `BudgetExceededError` at the limit |
| `pack/zip.ts` | the zip has the exact paths from `29` and excludes `internal/` |
| logger | redaction removes password, token, cookie, authorization and API key values (NFR-011) |

### API integration (apps/web)

Auth flows, including the rate limit (AC-01, AC-02); ownership 404 on every project route (AC-03); source limits (AC-05); generation refused with an empty P0 (AC-08); decision PATCH returns stale paths (AC-11); export blocked and then allowed (AC-12 at API level); the origin check.

### Worker integration (apps/worker)

The full pipeline with the mock AI, calling job handlers directly in order, with no pg-boss polling: process → analyze → accept recommended (service call) → generate (loop `schedule-generation` and `generate-doc` until done) → gates → status `ready`. Then the same with `MOCK_CONTRADICTION` injected into one doc's mock output → `blocked`. Then a budget of 1 token → `BUDGET_EXCEEDED`.

### MCP (apps/mcp)

Use the SDK `Client` with `StreamableHTTPClientTransport` against the server started on a random port, with `API_URL` pointing to a stub HTTP server that records requests.

- every tool calls the right method and path, and forwards the bearer header
- an API 404 becomes `isError: true` with "NOT_FOUND: …"
- a request with no bearer gets HTTP 401
- `get_project_status` returns the `nextStep` table values
- the tool list contains exactly the 17 names in `31`

Plus, in E2E, `e2e/mcp-flow.spec.ts` (AC-18): create a token through the API with a cookie session, then drive the whole flow through the real MCP server with the SDK client (poll `get_project_status` every second, up to 90 s) and read `START-HERE.md`.

### End to end (`e2e/full-flow.spec.ts`)

Sign up → New project "Notes App" → paste text (a 6-sentence description of a notes app) → Analyze → wait for the Interview step → Accept all recommended → Ledger shows no red P0 rows → Generate → wait for status Ready (timeout 90 s) → open the Documents step and see `00-index` rendered → the Gates step shows 0 blockers → Download, then assert the zip's entry names include `START-HERE.md`, `docs/build/tasks/task-001-project-setup.md` and `docs/26-production-readiness-runbook.md`.

### Golden test (`scripts/golden-test.ts`, real AI)

1. Create a user and a project in founder mode through core and db functions (no HTTP).
2. Add `scripts/golden/eu-b2b-srs.txt` as a text source, and run process, analyze, accept recommended, generate and gates in-process with `AI_PROVIDER=openrouter`.
3. Print:
   - for each row of `scripts/golden/eu-b2b-expected-decisions.md`, whether the generated `00-index` contains a matching area with a semantically equal value (judged by one extra AI call with tag `golden-judge`, yes/no per row);
   - the gate results;
   - total cost.
4. Pass: at least 80% of the expected rows match, 0 open blockers, cost ≤ 3 USD (NFR-004).

### Contradiction test

A worker-integration case: after a mock generation, overwrite `08-technology-stack-and-adrs.md` with text saying auth uses Clerk while the ledger says email/password, include `MOCK_CONTRADICTION`, and run gates. G11 must report a blocker on that document. This reproduces the eu-portal flaw.

## Coverage

`packages/core` ≥ 80% lines (`vitest --coverage`, threshold enforced in `packages/core/vitest.config.ts`). There is no threshold on apps. Every API route must have at least one test.
