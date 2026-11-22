# Production Readiness Runbook

## Release Checks

1. Confirm provider-managed database backups/PITR are enabled, or create a repository-managed backup with `DATABASE_URL=... BACKUP_DIR=backups pnpm backup:postgres`.
2. Check backup freshness with `BACKUP_DIR=backups BACKUP_EXPECTED_MAX_AGE_HOURS=24 pnpm backup:status` when using repository-managed backup artifacts.
3. Verify production configuration before rollout: `pnpm ops:validate`, and confirm provider secret stores contain non-placeholder values for Clerk auth, document signing, R2, Stripe, Pesapal, Resend, Google Maps, Sentry, CORS, and rate-limit settings.
4. Run quality gates from the release commit: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`. Run `pnpm test:e2e` when the release affects browser flows or when validating a full release candidate.
5. Run migrations with `DATABASE_URL=... pnpm deploy:migrate`.
6. For a fresh environment, bootstrap the first platform admin with `PLATFORM_ADMIN_BOOTSTRAP_ENABLED=true`, `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`, and `PLATFORM_ADMIN_MFA_RECOVERY_CODE` set in the backend environment before `pnpm --filter backend prisma:seed`. Password and recovery code must each be at least 12 characters. Remove the bootstrap values after the first successful login.
7. Deploy backend and frontend images from the same commit.
8. Run `API_BASE_URL=https://api.example.com/api/v1 FRONTEND_BASE_URL=https://app.example.com pnpm deploy:smoke`.
9. Watch `/api/v1/health/ready`, `/api/v1/version`, `/api/v1/metrics`, provider logs, and Sentry during the release window.

Do not proceed to production if webhook signing secrets, document signing secrets, provider credentials, platform-admin bootstrap access for fresh deployments, or backups/PITR are missing. Record any skipped gate with the command, reason, and whether the issue is pre-existing.

Rate limiting uses the server-observed client IP by default. Enable `TRUST_PROXY=true` or `TRUST_FORWARDED_HEADERS=true` only behind a trusted proxy that strips or rewrites client-supplied forwarded headers.

## Health and Metrics

- `/api/v1/health` and `/api/v1/health/live`: liveness checks for load balancers.
- `/api/v1/health/ready`: dependency readiness, including database reachability and Sentry wiring status.
- `/api/v1/version`: service version, commit, release, and environment.
- `/api/v1/metrics`: Prometheus-compatible counters and latency histogram buckets.

## Logging and Incident Handling

Request logs are structured JSON and include request ID, route, method, status, and latency. Sensitive values are redacted before logging: passwords, tokens, MFA and provider secrets, webhook signatures, card data, passports/visas, emergency contacts, and private document object keys.

For incidents, preserve logs, audit logs, webhook evidence, payment references, and backup/PITR state before mitigation. Prefer rollback to the previous app image for application regressions; prefer forward fixes for schema changes unless a restore has been rehearsed and explicitly approved.

## Rollback Checklist

1. Identify whether the incident is application-only, schema/data-related, provider-related, or configuration-related.
2. For application-only regressions, redeploy the last known-good backend/frontend image tags from the same release family.
3. For schema/data issues, stop new writes if needed, preserve audit/payment evidence, and prefer a forward fix. Restore from backup only when the restore path has been rehearsed and explicitly approved.
4. Re-run `pnpm deploy:smoke` against the restored target URLs.
5. Confirm Sentry and provider logs are stable before closing the incident.

## Post-Release Evidence

Capture the release commit/image tags, migration result, smoke-test result, backup/PITR confirmation, readiness status, version payload, Sentry release/environment tags, and any follow-up items found during validation.
