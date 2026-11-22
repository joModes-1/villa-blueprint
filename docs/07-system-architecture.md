# System Architecture

## Components

| Component | Path | Responsibility |
|---|---|---|
| Web | `apps/web` | Next.js UI pages, REST API route handlers, session auth, enqueueing jobs, zip export |
| Worker | `apps/worker` | Consumes pg-boss queues, runs parsing, AI calls, generation, gates, and saves results |
| MCP | `apps/mcp` | Stateless MCP server (Streamable HTTP) whose tools call the web REST API with the caller's bearer token. No DB access |
| Core | `packages/core` | Pure TypeScript domain logic: ledger catalog, pack spec, prompts, parsers, gates, renderers, AI clients, state machine, API types. No Prisma, no Next |
| DB | `packages/db` | Prisma schema, migrations, seed, shared `prisma` client |
| PostgreSQL | external | Application data plus the `pgboss` schema |
| OpenRouter | external | LLM calls (not used when `AI_PROVIDER=mock`) |
| Figma REST API | external | Read-only file fetch during source processing |

Dependency direction: `web → core, db`; `worker → core, db`; `core →` nothing internal; `db →` nothing internal. Core never imports Prisma. Job handlers in the worker load rows, call core functions, and save the results.

## Data Flow

```text
Browser ──HTTPS──▶ web /api/v1 ──Prisma──▶ PostgreSQL ◀──Prisma── worker ──▶ OpenRouter / Figma
MCP client (Claude, Cursor) ──HTTPS + Bearer──▶ mcp /mcp ──HTTP + Bearer──▶ web /api/v1
                      │                                   ▲
                      └──pg-boss send (same DB)───────────┘ pg-boss work
```

1. **Sources:** `POST /sources` stores the raw bytes or text with `status: pending`.
2. **Analyze:** `POST /analyze` sets the status to `processing`, creates a run (`total` = pending sources), and sends one `process-source` job per source. Each job parses, extracts facts, and increments the run. The last one sends `analyze-project`.
3. **Analyze job:** fills decisions, creates questions, and sets the status to `interviewing` or `ready_to_generate`.
4. **Interview:** synchronous API calls update questions and decisions. The last answer runs `finishInterview`.
5. **Generate:** `POST /generate` creates the documents and a run, then sends `schedule-generation`. The scheduler and `generate-doc` jobs walk the DAG from `29`. When all are done, `run-gates` runs.
6. **Gates** save findings and set `ready` or `blocked`.
7. **Export:** `GET /export` builds the zip in the web process and streams it.

The browser polls `GET /runs/latest` and `GET /projects/:id` every 2 seconds while a run is active. There are no websockets in the MVP.

## Integrations

| Integration | Where | Config | Failure handling |
|---|---|---|---|
| OpenRouter | worker, `packages/core/src/ai/openrouter.ts` | `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `AI_MODEL_REASONING`, `AI_MODEL_FAST` | 3 attempts with backoff; 240 s timeout; job retry ×2; the run fails with a readable message |
| Figma | web, `POST /sources`, using `packages/core/src/ingest/figma.ts` | the user's token, for that one request only | the request returns 422 with a Figma code from `27`, and no source is created |

## Deployment View

| Unit | Build | Command | Scale |
|---|---|---|---|
| web | `pnpm --filter @blueprint/web build` | `pnpm --filter @blueprint/web start` (`next start -p $PORT`) | 1+ (stateless) |
| worker | none (TypeScript run by `tsx`) | `pnpm --filter @blueprint/worker start` | 1+ (pg-boss shares the work) |
| mcp | none (TypeScript run by `tsx`) | `pnpm --filter @blueprint/mcp start` | 1+ (stateless) |
| migrate | the web image | `pnpm db:deploy` before web starts | once per release |
| postgres | managed in production; a native install or hosted URL locally | — | 1 |

Graceful shutdown: on `SIGTERM` the worker calls `boss.stop({ graceful: true, timeout: 30000 })` and then `prisma.$disconnect()`.
