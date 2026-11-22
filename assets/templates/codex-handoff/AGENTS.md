# AGENTS.md — EU B2B Tourism Portal

## Project Overview
Build the EU B2B Tourism Portal according to `project-docs/` and `codex-handoff/`. Use small, verified changes.

## Run Commands
```bash
pnpm install
docker compose up -d
pnpm --filter backend prisma:migrate
pnpm dev
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Coding and Architecture Rules
Use a modular monolith. Keep NestJS modules domain-scoped. Use REST `/api/v1`. Use PostgreSQL/Prisma migrations. Use Tailwind/shadcn for frontend. Use Cloudflare R2, Stripe, Pesapal, Resend, Google Maps through adapters/services.

## Security Rules
Do not hardcode secrets. Do not skip tests unless impossible; explain why. Do not change public APIs without updating API docs. Do not remove validation or authorization. Do not bypass RBAC. Do not store raw card data. Do not introduce dependencies without justification. Keep changes small. Update docs when behavior changes. Stop and report ambiguity affecting security, payments, data integrity, or API correctness.

## Testing Rules
Add tests alongside implementation. Run relevant unit, integration, API, E2E, security, and accessibility tests. Do not mark a task done with failing tests unless the failure is pre-existing and documented.

## Definition of Done
Requirement met, tests/lint/typecheck/build pass, docs updated, security considered, blockers reported.
