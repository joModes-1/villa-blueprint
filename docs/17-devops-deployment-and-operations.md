# DevOps, Deployment and Operations

## Environments

| Env | Database | AI | URL |
|---|---|---|---|
| local | native or hosted PostgreSQL, database `blueprint` | `mock` by default; `openrouter` when a key is set | http://localhost:3000 |
| test | same server, database `blueprint_test` | `mock` always | http://localhost:3000 (Playwright) |
| production | managed Postgres 16 | `openrouter` | `APP_URL` |

## Environment Variables

| Name | Used by | Example | Notes |
|---|---|---|---|
| DATABASE_URL | web, worker, db | postgresql://blueprint:blueprint@localhost:5432/blueprint | required |
| DATABASE_URL_TEST | tests | postgresql://blueprint:blueprint@localhost:5432/blueprint_test | tests only |
| APP_URL | web | http://localhost:3000 | Origin check and cookie |
| NODE_ENV | all | development | `production` turns on secure cookies |
| AI_PROVIDER | worker | mock | `mock` or `openrouter` |
| OPENROUTER_API_KEY | worker | sk-or-… | required when the provider is openrouter |
| OPENROUTER_BASE_URL | worker | https://openrouter.ai/api/v1 | |
| AI_MODEL_REASONING | worker | anthropic/claude-sonnet-4.5 | |
| AI_MODEL_FAST | worker | deepseek/deepseek-v3.1-terminus | |
| AI_TIMEOUT_MS | worker | 240000 | per call |
| GENERATION_CONCURRENCY | worker | 4 | `generate-doc` local concurrency |
| MAX_TOKENS_PER_PROJECT | web, worker | 2000000 | |
| WORKER_HEALTH_PORT | worker | 3101 | `GET /health` → `ok` |
| MCP_PORT | mcp | 3102 | MCP server port; `GET /health` → `ok` |
| API_URL | mcp | http://localhost:3000 | where the MCP app reaches the REST API |
| MCP_PUBLIC_URL | web | http://localhost:3102/mcp | shown in Settings connect snippets |
| LOG_LEVEL | all | info | |

Validate env at startup with a Zod schema (`apps/web/src/server/env.ts`, `apps/worker/src/env.ts`). Exit with a readable message listing the missing variables.

## Root scripts (package.json)

| Script | Command |
|---|---|
| dev | `pnpm --parallel --filter @blueprint/web --filter @blueprint/worker --filter @blueprint/mcp dev` |
| build | `pnpm --filter @blueprint/web build` |
| lint | `eslint .` |
| typecheck | `pnpm -r exec tsc --noEmit` |
| test | `pnpm -r test` (vitest run) |
| test:e2e | `playwright test` |
| db:generate | `pnpm --filter @blueprint/db exec prisma generate` |
| db:migrate | `pnpm --filter @blueprint/db exec prisma migrate dev` |
| db:migrate:test | `tsx scripts/migrate-test-db.ts`: loads `.env` with `dotenv`, then runs `prisma migrate deploy` (via `execFileSync`, works on Windows) with `DATABASE_URL` set to `DATABASE_URL_TEST`. Prisma creates the database if it is missing |
| db:deploy | `pnpm --filter @blueprint/db exec prisma migrate deploy` |
| db:seed | `pnpm --filter @blueprint/db exec tsx prisma/seed.ts` |
| golden | `tsx scripts/golden-test.ts` |

`postinstall` in `@blueprint/db` runs `prisma generate`. Web `dev` is `next dev -p 3000`, and worker `dev` is `tsx watch src/index.ts`.

## Local Database

PostgreSQL 16 (14+ works), installed natively or hosted. The `DATABASE_URL` user needs the CREATEDB right, because Prisma creates `blueprint` and `blueprint_test` on the first migration. Put both URLs in `.env`. Nothing else is required; no Docker.

## Deployment

No Docker. Any host that runs Node 20 processes from a repository checkout (Render or Railway native Node services, a VPS with a process manager, etc.).

1. `pnpm install --frozen-lockfile`, then `pnpm build` (Next.js production build of web).
2. Run `pnpm db:deploy` once per release, before starting web.
3. Start three processes:
   - web: `pnpm --filter @blueprint/web start`, 1+ instances
   - worker: `pnpm --filter @blueprint/worker start`, 1+ instances
   - mcp: `pnpm --filter @blueprint/mcp start`, 1+ instances, exposed over HTTPS at `MCP_PUBLIC_URL`
4. Health checks: web `GET /api/v1/health`, worker `GET :3101/health`, mcp `GET :3102/health`.
5. CI (`.github/workflows/ci.yml`) runs on `ubuntu-latest` with **no service containers**. It starts the runner's preinstalled PostgreSQL (`sudo systemctl start postgresql`), creates the user with `sudo -u postgres psql -c "CREATE USER blueprint WITH PASSWORD 'blueprint' CREATEDB;"`, then runs `pnpm install`, `lint`, `typecheck`, `db:migrate:test`, `test`, `build`, and `test:e2e` after `npx playwright install --with-deps chromium`.

## Backups

Use the managed provider's daily backups, kept 7 days. There is no app-level export of all data in the MVP. Pack zips are regenerated on demand.
