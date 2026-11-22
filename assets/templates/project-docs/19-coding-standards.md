# Coding Standards

General: small reviewable changes, simple maintainable code, no unrelated rewrites. TypeScript naming: camelCase variables/functions, PascalCase classes/types/components, SCREAMING_SNAKE_CASE constants. Backend Nest files use `.module.ts`, `.controller.ts`, `.service.ts`, `.dto.ts`, `.spec.ts`. Database uses snake_case mapping where practical.

API: `/api/v1`, DTO validation, standard errors, paginated lists, OpenAPI docs. Database: migrations only, transactions for multi-table state, decimal money, soft-delete business records. Security: no secrets, no sensitive logs, backend RBAC, webhook verification, rate limiting. Testing: update tests with behavior, factories for data, RBAC and validation tests for protected endpoints.

Git/PR checklist: scope clear, tests added, docs updated, migration reviewed, security considered, verification commands included.

Definition of done: requirement met, tests/lint/typecheck/build pass, docs updated, security implications addressed, blockers documented.
