# Task 002: Database Schema and Seed

## Goal
The full Prisma schema migrated, a shared client, and an idempotent seed.

## Context
`docs/09-database-design.md` contains the schema to use **verbatim**.

## Requirements Covered
FR-004 (data layer); every later task depends on this.

## Dependencies
task-001.

## Files and Areas
`packages/db/prisma/schema.prisma`, `packages/db/prisma/seed.ts`, `packages/db/src/index.ts`, `packages/db/package.json`.

## Steps
1. Copy the schema from `09` exactly.
2. Run `pnpm db:migrate --name init`, which creates `prisma/migrations/<ts>_init`.
3. `src/index.ts`:
   - export a `PrismaClient` singleton through `globalThis` (log level `warn` in dev)
   - re-export `Prisma` and every model type and enum from `@prisma/client`
4. Write `seed.ts` as specified in `09`, using `bcryptjs` cost 12 and an upsert by email.
5. Add `postinstall: prisma generate` to the db package, and the root `db:migrate:test` script from `17`.
6. Add a helper `resetTestDb()` in `packages/db/src/testing.ts`. It truncates every app table with `TRUNCATE … RESTART IDENTITY CASCADE` and refuses to run unless the database URL contains `_test`.

## Tests Required
A db test in `packages/db/tests` against `DATABASE_URL_TEST`:
- create a user, a project and a decision
- the unique `(projectId, key)` constraint throws on a duplicate
- `resetTestDb` empties the tables and refuses a non-test URL

## Acceptance Criteria
- The migration applies cleanly to both databases.
- The seed runs twice without error.
- The tests pass.

## Verification Commands
```bash
pnpm db:migrate && pnpm db:migrate:test && pnpm db:seed && pnpm db:seed && pnpm test && pnpm typecheck
```

## Stop Conditions
Postgres is not reachable.
