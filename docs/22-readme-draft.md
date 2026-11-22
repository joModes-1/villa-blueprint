# README Draft

Use this as the repository's `README.md` in task-015.

## Setup

```bash
# Requirements: Node 20.11+, pnpm 9, PostgreSQL 16 (14+ works; native install or hosted)
pnpm install
cp .env.example .env            # set DATABASE_URL / DATABASE_URL_TEST; AI_PROVIDER=mock works without any key
pnpm db:migrate:test            # creates and migrates blueprint_test
pnpm db:migrate
pnpm db:seed                    # demo@blueprint.local / demo-password-123
pnpm dev                        # web http://localhost:3000, worker health http://localhost:3101/health
```

To use real AI, set `AI_PROVIDER=openrouter` and `OPENROUTER_API_KEY` in `.env`, then restart the worker.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Web and worker with reload |
| `pnpm lint` / `pnpm typecheck` | Static checks |
| `pnpm test` | Unit, API and worker tests (mock AI, test DB) |
| `pnpm test:e2e` | Browser end-to-end flow (mock AI) |
| `pnpm build` | Production build of web |
| `pnpm golden` | Real-AI quality test against the EU B2B SRS (costs money) |

## How it works

Sources → facts (with quotes) → gap interview → decision ledger → generated pack → gates → zip. See `docs/00-index.md` and `docs/27-generation-pipeline-spec.md`.
