# Tasks Index

| Status | Task | Depends on | Required docs | Expected output | Verification |
|---|---|---|---|---|---|
| Done | [task-001-project-setup](tasks/task-001-project-setup.md) | None | 00, 08, 17, 19, 25 | Monorepo, tooling, env, empty apps and packages building | `pnpm lint && pnpm typecheck && pnpm test` |
| Done | [task-002-database-schema-and-seed](tasks/task-002-database-schema-and-seed.md) | task-001 | 09 | Prisma schema, init migration, seed, prisma singleton | same |
| Done | [task-003-authentication](tasks/task-003-authentication.md) | task-002 | 10, 12, 13 | http wrapper, errors, signup, login, logout, me, rate limit, health | same |
| Done | [task-004-core-ai-ledger-and-pack-spec](tasks/task-004-core-ai-ledger-and-pack-spec.md) | task-003 | 27, 28, 29 | AI clients (openrouter + mock), JSON helper, budget, usage, catalog, pack spec, DAG, hash, state machine, assets | same |
| Done | [task-005-projects-and-sources-api](tasks/task-005-projects-and-sources-api.md) | task-004 | 06, 10 | Project CRUD with ledger rows, sources API, queue module | same |
| Done | [task-006-worker-and-source-processing](tasks/task-006-worker-and-source-processing.md) | task-005 | 07, 27 | Worker runtime, runs, parsers, fact extraction, analyze trigger, retry | same |
| Done | [task-007-analysis-interview-and-ledger](tasks/task-007-analysis-interview-and-ledger.md) | task-006 | 27, 28 | analyze job, questions API, decisions API, stale marking | same |
| Done | [task-008-document-generation](tasks/task-008-document-generation.md) | task-007 | 27, 29 | Generate API, scheduler, generate-doc, task plan, renderers, estimate | same |
| Done | [task-009-quality-gates](tasks/task-009-quality-gates.md) | task-008 | 30 | G01–G11, run-gates job, findings API | same |
| Done | [task-010-export-and-usage](tasks/task-010-export-and-usage.md) | task-009 | 29, 10 | Zip export, usage API | same |
| Done | [task-011-frontend-foundation](tasks/task-011-frontend-foundation.md) | task-010 | 11 | Tailwind, UI kit, layout, auth pages, projects page, middleware | `+ pnpm build` |
| Done | [task-012-workspace-ui](tasks/task-012-workspace-ui.md) | task-011 | 11 | Workspace with all 7 steps, polling, banners | `+ pnpm build` |
| Done | [task-013-mcp-server-and-access-tokens](tasks/task-013-mcp-server-and-access-tokens.md) | task-012 | 31, 10, 12 | Access tokens (API + Settings UI), bearer auth, apps/mcp with 17 tools | `+ pnpm build` |
| Done | [task-014-testing-devops-and-observability](tasks/task-014-testing-devops-and-observability.md) | task-013 | 16, 17, 18 | E2E, worker integration suite, golden script, CI, production start check, logging | `+ pnpm test:e2e` |
| Done | [task-015-documentation-and-final-polish](tasks/task-015-documentation-and-final-polish.md) | task-014 | 21, 22, 26 | README, acceptance sweep AC-01–AC-16, final report | all checks |
