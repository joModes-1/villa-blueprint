# Codex Implementation Rules

Implement tasks in order. Backend: Nest modules, DTO validation, guards, transactions for state changes. Frontend: route groups, Tailwind/shadcn, loading/empty/error/success states, accessible forms. DB: Prisma migrations, UUIDs, decimal money, soft deletes, indexes. API: `/api/v1`, standard errors, pagination, OpenAPI. Security: no secrets, no sensitive logs, backend RBAC, webhook signatures, rate limits. Testing: unit/integration/API/E2E/security/accessibility as relevant.

When uncertain, stop if ambiguity affects security, payments, data integrity, or public API contracts. Otherwise make the smallest safe assumption and document it.
