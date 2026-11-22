# Villa Blueprint

Turn a messy idea (a brainstorm chat, notes, PDFs, Word files, a Figma file) into a **build-ready documentation pack** that any AI coding agent can implement in a handful of prompts.

Sources → facts (with quotes) → gap interview → decision ledger → generated pack → quality gates → zip.
See [docs/00-index.md](docs/00-index.md) and [docs/27-generation-pipeline-spec.md](docs/27-generation-pipeline-spec.md).

## Setup

```bash
# Requirements: Node 20.11+, pnpm 9, PostgreSQL 14+ (16 recommended; native install or hosted, no Docker)
pnpm install
cp .env.example .env            # set DATABASE_URL / DATABASE_URL_TEST; AI_PROVIDER=mock works without any key
pnpm db:migrate:test            # creates and migrates blueprint_test
pnpm db:migrate
pnpm db:seed                    # demo@blueprint.local / demo-password-123
pnpm dev                        # web http://localhost:3000, worker health :3101, MCP http://localhost:3102/mcp
```

The database user needs `CREATEDB`. The database must use UTF8 encoding.

To use real AI, set `AI_PROVIDER=openrouter` and `OPENROUTER_API_KEY` in `.env`, then restart the worker.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Web, worker and MCP server with reload |
| `pnpm lint` / `pnpm typecheck` | Static checks |
| `pnpm test` | Unit, API, DOM, worker and MCP tests (mock AI, test database), one workspace at a time |
| `pnpm test:e2e` | Browser end-to-end flows (mock AI). Set `E2E_WEB_PORT`, `E2E_WORKER_PORT`, `E2E_MCP_PORT` if 3000/3101/3102 are busy |
| `pnpm build` | Production build of web |
| `pnpm db:deploy` | Apply migrations in production |
| `pnpm golden` | Real-AI quality test against the EU B2B SRS (costs money; needs `AI_PROVIDER=openrouter` and a key) |

## Run in production

No Docker. Any host that runs Node 20 from a repository checkout, plus a managed PostgreSQL:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm db:deploy                           # once per release, before starting web
pnpm --filter @blueprint/web start       # health: GET /api/v1/health
pnpm --filter @blueprint/worker start    # health: GET :$WORKER_HEALTH_PORT/health
pnpm --filter @blueprint/mcp start       # health: GET :$MCP_PORT/health (expose over HTTPS at MCP_PUBLIC_URL)
```

Deploy the **whole checkout**: the worker and web read `packages/core/assets/` at runtime. The production build downloads the Google fonts, so the build host needs internet access. See [docs/17](docs/17-devops-deployment-and-operations.md) and [docs/26](docs/26-production-readiness-runbook.md).

## Connect Claude, Cursor or any MCP client

In **Settings** create an access token, then run the Claude Code command shown there, or paste the JSON into your client's MCP config. Then ask: “send this chat to my Blueprint project”. See [docs/31](docs/31-mcp-server-spec.md).

## Layout

`apps/web` (Next.js UI and `/api/v1`), `apps/worker` (pg-boss jobs), `apps/mcp` (MCP server, REST client only), `packages/core` (pure logic), `packages/db` (Prisma). Rules for coding agents are in [AGENTS.md](AGENTS.md).
