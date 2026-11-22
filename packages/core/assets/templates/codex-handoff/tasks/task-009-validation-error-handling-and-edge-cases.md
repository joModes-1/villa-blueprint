# Task 009: Validation, Error Handling, and Edge Cases

## Goal
Harden validation, state transitions, idempotency, and UX states.

## Context
This is task 9 of the greenfield implementation. Read `codex-handoff/AGENTS.md`, `CODEX_PROJECT_CONTEXT.md`, `CODEX_IMPLEMENTATION_RULES.md`, and relevant `project-docs/` files before editing.

## Requirements Covered
See `project-docs/04-requirements-matrix.md` and `24-traceability-matrix.md`; this task contributes to the requirements mapped to `task-009-validation-error-handling-and-edge-cases`.

## Dependencies
Complete and verify previous task: task-008-admin-or-management-features

## Files and Areas Likely Affected
`apps/frontend/`, `apps/backend/`, `packages/shared/`, `tests/`, `scripts/`, `.github/workflows/`, docs as behavior changes.

## Instructions for Codex
1. Inspect repository state.
2. Implement only this task’s scope.
3. Preserve existing behavior.
4. Add/update tests.
5. Update docs/API/env examples when needed.
6. Run verification commands.
7. Stop and report blockers if a critical requirement is ambiguous.

## Constraints
Do not hardcode secrets, skip authorization, store raw card data, remove validation, alter applied migrations casually, or implement deferred features without explicit instruction.

## Security Notes
Apply RBAC, input validation, audit logging, rate limiting, signed URL, and webhook verification rules wherever relevant.

## Data/Database Notes
Use Prisma migrations, transactions for booking/payment/refund transitions, decimal money, soft deletes, indexes, tenant scoping.

## API Notes
Use `/api/v1`, standard errors, pagination, DTO validation, OpenAPI annotations.

## UI Notes
Use responsive desktop-first Tailwind/shadcn components with loading/empty/error/success states and WCAG 2.1 AA awareness.

## Tests Required
Unit tests for domain logic; integration/API tests for endpoints and DB behavior; Playwright E2E when UI flow is affected; RBAC/security tests for protected resources.

## Acceptance Criteria
Task goal met, relevant tests pass, no unrelated rewrites, docs updated, blockers reported.

## Verification Commands
```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e # when UI/E2E affected
```

## Expected Final Response From Codex
Summarize what changed, files modified, tests run, blockers, and follow-up tasks.

## Stop Conditions
Stop if a critical requirement is ambiguous, a security/payment decision is missing, dependency unavailable, architecture conflict exists, or required tests cannot run.
