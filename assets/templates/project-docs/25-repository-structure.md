# Repository Structure

## Recommendation
Monorepo because frontend/backend are TypeScript and benefit from shared types, a single CI pipeline, and Codex-friendly context.

| Path | Purpose | Owner/Concern | Notes |
|---|---|---|---|
| `apps/frontend/` | Next.js app | Frontend | route groups by user area |
| `apps/backend/` | NestJS API | Backend | domain modules and Prisma |
| `apps/worker/` | Optional worker | Backend/DevOps | emails/reminders/webhooks later |
| `packages/shared/` | Shared types/constants | Full stack | no app dependencies |
| `packages/config/` | Shared TS/lint/prettier config | Tooling | optional |
| `tests/e2e/` | Playwright tests | QA | full-stack critical flows |
| `scripts/` | maintenance/dev scripts | DevOps | smoke, seed, backup helpers |
| `docker/` | Docker support | DevOps | entrypoints/config |
| `.github/workflows/` | CI/CD | DevOps | lint/test/build/deploy |
| `project-docs/` | Implementation docs | Product/Architecture | this package |
| `codex-handoff/` | Codex instructions | Codex | task-by-task files |

```text
project-root/
  apps/frontend/src/app/(auth|agency|operator|admin|finance)/
  apps/frontend/src/components/ src/lib/ src/features/
  apps/backend/src/modules/{auth,companies,rbac,packages,clients,bookings,finance,documents,notifications,reports,admin,audit,health}/
  apps/backend/prisma/{schema.prisma,migrations,seed.ts}
  packages/shared/src/
  tests/e2e/
  scripts/
  docker/
  .github/workflows/
  project-docs/
  codex-handoff/
  .env.example
  docker-compose.yml
  package.json
  pnpm-workspace.yaml
  turbo.json
  README.md
  AGENTS.md
```

Codex should create workspace config, app directories, `.env.example`, Docker/CI files first. Do not modify real `.env`, generated build output, or applied migrations without explicit reason.
