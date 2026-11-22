# Codex Task Breakdown

## task-001-project-setup: Project Setup
Goal: Create monorepo, tooling, Docker, CI skeleton. Dependencies: None. Acceptance: tests pass, docs updated, blockers reported. Verification: `pnpm lint && pnpm test && pnpm build` plus task-specific checks. Common mistakes: broad rewrites, skipped tests, missing RBAC, stale docs.

## task-002-database-schema-and-migrations: Database Schema and Migrations
Goal: Implement Prisma schema, migrations, seeds. Dependencies: task-001-project-setup. Acceptance: tests pass, docs updated, blockers reported. Verification: `pnpm lint && pnpm test && pnpm build` plus task-specific checks. Common mistakes: broad rewrites, skipped tests, missing RBAC, stale docs.

## task-003-authentication-and-authorization: Authentication and Authorization
Goal: Implement auth, MFA, RBAC, company approval gates. Dependencies: task-002-database-schema-and-migrations. Acceptance: tests pass, docs updated, blockers reported. Verification: `pnpm lint && pnpm test && pnpm build` plus task-specific checks. Common mistakes: broad rewrites, skipped tests, missing RBAC, stale docs.

## task-004-core-domain-models: Core Domain Models
Goal: Implement domain services/models for companies, packages, clients, bookings, finance, documents. Dependencies: task-003-authentication-and-authorization. Acceptance: tests pass, docs updated, blockers reported. Verification: `pnpm lint && pnpm test && pnpm build` plus task-specific checks. Common mistakes: broad rewrites, skipped tests, missing RBAC, stale docs.

## task-005-core-api-endpoints: Core API Endpoints
Goal: Implement REST endpoints and OpenAPI for MVP flows. Dependencies: task-004-core-domain-models. Acceptance: tests pass, docs updated, blockers reported. Verification: `pnpm lint && pnpm test && pnpm build` plus task-specific checks. Common mistakes: broad rewrites, skipped tests, missing RBAC, stale docs.

## task-006-frontend-foundation: Frontend Foundation
Goal: Implement Next.js shell, design system, API client, route guards. Dependencies: task-005-core-api-endpoints. Acceptance: tests pass, docs updated, blockers reported. Verification: `pnpm lint && pnpm test && pnpm build` plus task-specific checks. Common mistakes: broad rewrites, skipped tests, missing RBAC, stale docs.

## task-007-core-user-flows: Core User Flows
Goal: Implement operator and agency package/booking/payment/document UI flows. Dependencies: task-006-frontend-foundation. Acceptance: tests pass, docs updated, blockers reported. Verification: `pnpm lint && pnpm test && pnpm build` plus task-specific checks. Common mistakes: broad rewrites, skipped tests, missing RBAC, stale docs.

## task-008-admin-or-management-features: Admin and Management Features
Goal: Implement admin, finance, reports, settings, review moderation. Dependencies: task-007-core-user-flows. Acceptance: tests pass, docs updated, blockers reported. Verification: `pnpm lint && pnpm test && pnpm build` plus task-specific checks. Common mistakes: broad rewrites, skipped tests, missing RBAC, stale docs.

## task-009-validation-error-handling-and-edge-cases: Validation, Error Handling, and Edge Cases
Goal: Harden validation, state transitions, idempotency, and UX states. Dependencies: task-008-admin-or-management-features. Acceptance: tests pass, docs updated, blockers reported. Verification: `pnpm lint && pnpm test && pnpm build` plus task-specific checks. Common mistakes: broad rewrites, skipped tests, missing RBAC, stale docs.

## task-010-security-hardening: Security Hardening
Goal: Add rate limits, headers, audit coverage, upload/payment security checks. Dependencies: task-009-validation-error-handling-and-edge-cases. Acceptance: tests pass, docs updated, blockers reported. Verification: `pnpm lint && pnpm test && pnpm build` plus task-specific checks. Common mistakes: broad rewrites, skipped tests, missing RBAC, stale docs.

## task-011-testing-suite: Testing Suite
Goal: Complete unit/integration/API/E2E/accessibility/security tests. Dependencies: task-010-security-hardening. Acceptance: tests pass, docs updated, blockers reported. Verification: `pnpm lint && pnpm test && pnpm build` plus task-specific checks. Common mistakes: broad rewrites, skipped tests, missing RBAC, stale docs.

## task-012-devops-and-deployment: DevOps and Deployment
Goal: Implement Docker, GitHub Actions, Render/Railway deployment, migration flow. Dependencies: task-011-testing-suite. Acceptance: tests pass, docs updated, blockers reported. Verification: `pnpm lint && pnpm test && pnpm build` plus task-specific checks. Common mistakes: broad rewrites, skipped tests, missing RBAC, stale docs.

## task-013-observability-and-production-readiness: Observability and Production Readiness
Goal: Implement Sentry, logs, health, metrics, backups, runbooks. Dependencies: task-012-devops-and-deployment. Acceptance: tests pass, docs updated, blockers reported. Verification: `pnpm lint && pnpm test && pnpm build` plus task-specific checks. Common mistakes: broad rewrites, skipped tests, missing RBAC, stale docs.

## task-014-documentation-and-final-polish: Documentation and Final Polish
Goal: Finalize README, API docs, release checklist, QA fixes. Dependencies: task-013-observability-and-production-readiness. Acceptance: tests pass, docs updated, blockers reported. Verification: `pnpm lint && pnpm test && pnpm build` plus task-specific checks. Common mistakes: broad rewrites, skipped tests, missing RBAC, stale docs.
