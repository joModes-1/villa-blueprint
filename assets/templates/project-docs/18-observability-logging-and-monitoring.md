# Observability, Logging, and Monitoring

Use structured JSON logs with requestId, route, method, status, latency, safe userId/companyId/resourceId. Redact passwords, tokens, MFA secrets, provider secrets, webhook signatures, card data, passports, visas, emergency contacts, and private document object keys.

Sentry captures errors with environment/release tags when `SENTRY_DSN` is configured and the SDK is available. Metrics: request latency/error rate, login failures, MFA failures, booking state changes, payment successes/failures, webhook failures, upload failures, email failures, backup status. Health endpoints: `/api/v1/health`, `/api/v1/health/live`, `/api/v1/health/ready`, `/api/v1/version`; Prometheus-compatible metrics are exposed at `/api/v1/metrics`.

Production readiness validation requires non-placeholder auth/document secrets, provider webhook secrets, R2 credentials, `DATABASE_URL`, `SENTRY_DSN`, non-localhost `CORS_ORIGINS`, sensitive endpoint rate-limit knobs, and `BACKUP_EXPECTED_MAX_AGE_HOURS`. Repository backup helpers provide `pnpm backup:postgres` and `pnpm backup:status`; managed production PITR must be verified in the provider console.

Audit log sensitive events: auth security, role changes, company approvals, package publish/archive, booking state changes, invoice/payment/refund/payout changes, document upload/download/delete, settings changes.

Recommended dashboards: API p95 latency by route, 4xx/5xx rates, readiness dependency status, webhook success/failure counters, payment/refund state changes, login/MFA failures, upload/document failures, backup freshness, and Sentry issue count by release.

Alerts: 5xx spike, webhook failure spike, DB connection failure, backup failure or stale backup, Sentry high severity, suspicious auth events, provider outage indicators, and readiness moving from `ok` to `degraded` for more than one release-window check.

Incident response: triage, identify impact, preserve logs/audit/payment evidence, mitigate/rollback, communicate status, write root cause and follow-up tasks.
