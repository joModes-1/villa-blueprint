# Technology Stack and ADRs

## Stack

Pin to these major versions, and use the latest minor at install time.

| Concern | Package | Version |
|---|---|---|
| Package manager | pnpm | 9 |
| Runtime | Node.js | ≥ 20.11 (`"engines"` in root `package.json`) |
| Language | typescript | 5.6+ (`strict: true`, `noUncheckedIndexedAccess: true`) |
| Web framework | next, react, react-dom | 15, 19, 19 |
| Styling | tailwindcss, postcss, autoprefixer | 3.4, 8, 10 |
| Icons | lucide-react | latest |
| Markdown view | react-markdown, remark-gfm | 9, 4 |
| ORM | prisma, @prisma/client | 6, 6 |
| Queue | pg-boss | 10 |
| Validation | zod | 3 |
| AI SDK | openai (pointed at OpenRouter) | 4 |
| Passwords | bcryptjs, @types/bcryptjs | 2.4 |
| Parsing | pdf-parse 1.1, mammoth 1.8 | — |
| Zip | jszip | 3 |
| MCP server | @modelcontextprotocol/sdk | 1 |
| Logging | pino, pino-pretty (dev only) | 9 |
| Worker runner | tsx | 4 |
| Tests | vitest, @vitest/coverage-v8, @playwright/test | 2, 2, 1.48+ |
| Lint and format | eslint 9 (flat config), typescript-eslint 8, eslint-plugin-react-hooks 5, prettier 3 | — |

## Known setup traps (follow exactly)

1. **pdf-parse:** import `pdf-parse/lib/pdf-parse.js`, not `pdf-parse`. The package root runs a debug block that reads a test PDF and crashes outside its own repo. Add a `declare module 'pdf-parse/lib/pdf-parse.js'` type.
2. **pg-boss 10:** call `await boss.createQueue(name)` for every queue at startup, in both web and worker, before `send` or `work`. Handlers receive an **array** of jobs. Use `localConcurrency` on `work` for parallelism.
3. **pg-boss in Next.js:** web only sends jobs. Keep one `PgBoss` instance on `globalThis` and `start()` it once, lazily, in `apps/web/src/server/queue.ts`.
4. **Next.js config:** `transpilePackages: ['@blueprint/core', '@blueprint/db']` and `serverExternalPackages: ['pg-boss', 'pdf-parse', 'mammoth']`. Route handlers use the default Node.js runtime. `middleware.ts` only checks that the cookie exists, because middleware runs on the edge.
5. **Prisma in Next.js dev:** reuse one `PrismaClient` through `globalThis` in `packages/db/src/index.ts`, to avoid exhausting connections on hot reload.
6. **Workspace packages as TS source:** `packages/core/package.json` has `"main": "src/index.ts"` and `"types": "src/index.ts"`, and the same for `db`. No build step. The worker runs with `tsx`, and Next transpiles them.
7. **Assets path:** `packages/core/assets/` is read with `fs` at runtime through `path.join(CORE_ROOT, 'assets', …)`, where `CORE_ROOT` is resolved from `require.resolve('@blueprint/core/package.json')`. Deploy the whole repository checkout, so `packages/core/assets` is present at runtime.
8. **Windows-friendly:** no native modules (that's why `bcryptjs`, not `bcrypt`). npm scripts avoid shell-specific syntax, and `cross-env` is used where env vars are set inline.

## ADRs

### ADR-001 Full-stack Next.js plus a separate worker
Status: Accepted.
**Decision:** Next.js App Router serves the UI and the REST API. A separate Node worker runs AI jobs.
**Alternatives:** a separate NestJS API; serverless functions only.
**Reasoning:** one web deployable keeps the build small. AI calls run 30 s to 4 min, which is too long for request handlers, so they run in a worker.
**Consequence:** two processes share the database and the queue.

### ADR-002 pg-boss on PostgreSQL for jobs
Status: Accepted.
**Decision:** pg-boss.
**Alternatives:** BullMQ with Redis; Agenda with Mongo.
**Reasoning:** no extra infrastructure; jobs are transactional with the data they change.
**Consequence:** throughput is limited to what Postgres can poll. That is plenty here.

### ADR-003 Opaque DB sessions, not JWT
Status: Accepted.
**Decision:** a random 32-byte token in an httpOnly cookie, with only its SHA-256 hash stored.
**Alternatives:** JWT; Auth.js.
**Reasoning:** instant revocation, simplest correct option, no provider setup.
**Consequence:** one indexed DB read per request.

### ADR-004 OpenRouter with two model tiers
Status: Accepted.
**Decision:** the `openai` SDK against OpenRouter. `AI_MODEL_REASONING` for analysis, architecture, data, API and gates. `AI_MODEL_FAST` for the rest.
**Reasoning:** one key, any model, cost reported per call.
**Consequence:** model quality is configuration. Defaults are documented in `17`.

### ADR-005 Deterministic mock AI for every automated test
Status: Accepted.
**Decision:** `AI_PROVIDER=mock`.
**Reasoning:** tests must be fast, free and stable. Real-model checks run separately (the golden test in `16`).
**Consequence:** the mock must keep producing outputs that pass all gates.

### ADR-006 The ledger is the source of truth; some files are rendered by code
Status: Accepted.
**Decision:** generated docs read the ledger and never re-decide. Index, open questions, task files and agent files are rendered by code.
**Reasoning:** this removes the main source of contradictions, such as the eu-portal Clerk-versus-JWT conflict.
**Consequence:** a ledger edit means a regenerate.

### ADR-007 Raw uploads stored in Postgres until parsed
Status: Accepted.
**Decision:** `sources.raw` as `bytea`, nulled after parsing.
**Alternatives:** object storage.
**Reasoning:** 10 MB cap; no extra service.
**Consequence:** the DB holds pending uploads briefly.

### ADR-009 MCP server as a thin client of the REST API
Status: Accepted.
**Decision:** `apps/mcp` exposes tools that call `/api/v1` with the caller's bearer token. It is stateless Streamable HTTP and has no database access.
**Alternatives:** MCP inside Next.js route handlers; MCP with direct Prisma access; Blueprint as an MCP client of Figma.
**Reasoning:** one place for ownership, validation and state rules. The Node SDK transport fits a plain `http` server. Users' own clients already have Figma connectors, so Blueprint receives designs as text instead of integrating with each design tool.
**Consequence:** a third small deployable; every tool call is one or two HTTP requests to web.

### ADR-008 Method content shipped as files
Status: Accepted.
**Decision:** the forward-build guides and the example templates live in `packages/core/assets/`.
**Reasoning:** the generator's "know-how" is versioned with the code and editable without code changes.
**Consequence:** improving the generated pack's quality is mostly editing markdown.
