# Acceptance Criteria

Whole system passes when approved companies can transact end-to-end: register → verify → admin approve → operator package → agency search/client/booking → operator approve → payment checkout/webhook → invoice/confirmation → dashboard/report/audit visibility.

Module criteria: Auth/RBAC works with MFA and scoped permissions; packages support draft/publish/archive and required fields; bookings enforce lifecycle; finance reconciles provider webhooks idempotently; documents use private signed URLs; notifications send email/in-app records; admin actions are permissioned and audited; dashboards are scoped; deployment health checks/backups work.

Role criteria: Admin can govern platform; operator can manage own packages/bookings; agency can manage own clients/bookings/payments; finance can reconcile financial records; guests can only register/login/reset/verify.

Security criteria: no raw cards, no secrets in repo/logs, rate limits on sensitive endpoints, RBAC tests pass, private docs protected. Testing criteria: CI green, 80% backend/core target, critical E2E flows pass. Documentation criteria: README, AGENTS, API docs, env examples, deployment docs, observability docs, and production runbooks match implementation and clearly identify MVP limits instead of implying unavailable endpoints or workflows are complete.

Release-readiness criteria: release commands and provider steps are documented, `pnpm ops:validate` passes, smoke checks cover health/readiness/version/frontend reachability, backup/PITR expectations are explicit, rollback guidance distinguishes app image rollback from schema forward fixes, and any blocked verification gate is recorded with whether it appears pre-existing or introduced.
