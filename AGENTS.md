# AGENTS.md — Villa Blueprint

## Project Overview

Build **Villa Blueprint** exactly as specified in `docs/` and `docs/build/`. **This folder is the repository root: build in place.** Work through `docs/build/tasks/` in order, task-001 to task-015. Make small, verified changes.

Authority order when two sources seem to disagree:
1. The decision table in `docs/00-index.md`
2. `docs/27`–`30` (pipeline, ledger, pack, gates)
3. `09`, `10`, `11`, `12`, `13`
4. The task file
5. Everything else

If you find a real conflict, follow the higher source and mention the conflict in your task report.

## Run Commands

```bash
pnpm install
cp .env.example .env          # set DATABASE_URL and DATABASE_URL_TEST; AI_PROVIDER=mock needs no key
pnpm db:migrate:test        # creates and migrates blueprint_test
pnpm db:migrate
pnpm dev
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
```

## Coding and Architecture Rules

- pnpm monorepo: `apps/web` (Next.js 15 UI + `/api/v1` route handlers), `apps/worker` (pg-boss jobs), `apps/mcp` (MCP server, REST client only), `packages/core` (pure logic, no Prisma or Next), `packages/db` (Prisma).
- Packages are consumed as TypeScript source; there is no build step for them.
- Follow `08` "Known setup traps" exactly.
- Copy `assets/forward-build` and `assets/templates` to `packages/core/assets/`, and `assets/golden` to `scripts/golden/`, in task-004 and task-014.
- All AI access goes through `packages/core/src/ai`. Prompts are worded exactly as in `27` and `30`.
- All project status changes go through `transition()`.
- Prisma schema: use `09` verbatim.
- API: use `10` exactly — paths, bodies, error codes.
- UI: follow `11`.

Docker is not used anywhere: no Dockerfiles, no compose files, no containers in CI.

## Security Rules

- Do not hardcode secrets.
- Never log passwords, tokens, cookies, API keys, prompts, source text or AI output.
- Every `/projects/:id/**` handler must use `loadOwnedProject`.
- Never skip Zod validation.
- Never store Figma tokens.
- Never call a real AI model in tests.
- Do not add dependencies beyond `08` and `19` without stating why in the report.

## Testing Rules

- Write tests alongside the code, in the same task.
- Tests use the mock AI and the test database.
- A task is not done while any check fails, unless the failure is pre-existing and documented.

## Stop Conditions

Stop and report — do not guess — if:
- a required tool is missing (a reachable PostgreSQL server for `DATABASE_URL`, Node ≥ 20.11, pnpm 9)
- a check fails for a reason outside the task
- following the docs would break security, data integrity or the API contract

For anything else that is unspecified, choose the smallest conventional option consistent with the docs, and list it under "Assumptions" in your report.

## Definition of Done (per task)

1. The task's acceptance criteria are met.
2. `pnpm lint && pnpm typecheck && pnpm test` pass, plus `pnpm build` from task-011 on, and `pnpm test:e2e` from task-014 on.
3. No unrelated rewrites.
4. The report contains: what changed, files, tests run with results, assumptions, and blockers.
5. The task's row in `docs/build/TASKS_INDEX.md` has its Status set to `Done`.
