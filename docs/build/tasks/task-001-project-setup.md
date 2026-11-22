# Task 001: Project Setup

## Goal
A pnpm monorepo where every workspace exists and `pnpm lint && pnpm typecheck && pnpm test` pass with placeholder code.

## Context
Read `AGENTS.md`, `docs/00-index.md`, `08` (stack and setup traps), `17` (scripts and env), `19` and `25` (tree). This folder is the repo root; keep the existing docs and `assets/` untouched.

## Requirements Covered
NFR-005, NFR-006 (tooling for them).

## Dependencies
None. Requires Node ≥ 20.11, pnpm 9 and a reachable PostgreSQL (native or hosted) whose user has CREATEDB. Stop if any is missing.

## Files and Areas
Root config files, `.env.example`, `.gitignore`, `apps/web`, `apps/worker`, `packages/core`, `packages/db` skeletons.

## Steps
1. `git init` if not already a repo.
2. Create the root `package.json`:
   - private
   - `"packageManager": "pnpm@9"`
   - engines `node >= 20.11`
   - the scripts from `17`
3. Create `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.mjs` and `prettier.config.mjs` as described in `25`.
4. Do not create any Docker files. The database is the one in `DATABASE_URL`.
5. Create `.env.example` with every variable from `17` (mock AI by default), and `.gitignore`.
6. Create the `packages/core` skeleton:
   - `package.json` named `@blueprint/core` with `"main": "src/index.ts"`, `"types": "src/index.ts"`, and scripts `test: vitest run`, `test:cov`
   - `src/index.ts` exporting `export const VERSION = '0.1.0'`
   - one test
   - `vitest.config.ts` with a coverage threshold of 80 on lines, applied only with `--coverage`
7. Create the `packages/db` skeleton: `@blueprint/db`, `"main": "src/index.ts"`, with prisma and @prisma/client as dependencies. Schema comes in task-002.
8. Create the `apps/web` skeleton:
   - Next.js 15 App Router, React 19, TypeScript
   - `next.config.ts` with `transpilePackages`, `serverExternalPackages`
   - a `page.tsx` that says "Villa Blueprint"
   - tsconfig paths `@/*`
   - `vitest.config.ts` (node environment)
9. Create the `apps/worker` skeleton: `src/index.ts` logging "worker ready", `dev` as `tsx watch src/index.ts`, `start` as `tsx src/index.ts`, and a vitest config.
10. Run `pnpm install`. Make `pnpm lint`, `pnpm typecheck` and `pnpm test` pass. Make `pnpm build` pass for web.

## Tests Required
One trivial test per workspace, so `pnpm -r test` runs everywhere.

## Acceptance Criteria
- `pnpm db:migrate` and `pnpm db:migrate:test` (added in task-002) will create `blueprint` and `blueprint_test` on the configured server.
- All four checks pass.

## Verification Commands
```bash
pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Stop Conditions
PostgreSQL unreachable, or Node or pnpm unavailable; a port already in use that you cannot free safely.
