# DevOps, Deployment, and Operations

## Environments

Local, staging, production. Use separate databases, R2 buckets, provider keys, webhooks, and Sentry environments.

## Docker and CI/CD

Docker images for frontend, backend, optional worker. GitHub Actions runs lint/typecheck/tests/build/security checks, then deploys staging; production deploy should require approval.

Implemented repository hooks:

- `apps/backend/Dockerfile` builds the NestJS API image, generates Prisma client code, exposes `4000`, and health-checks `/api/v1/health`.
- `apps/frontend/Dockerfile` builds the Next.js standalone image and health-checks `/`.
- `.github/workflows/ci.yml` runs install, Prisma generate, migration deploy validation, deployment config validation, audit, lint, typecheck, unit/API tests, build, Playwright E2E, and optional staging deployment.
- `.github/workflows/deploy-production.yml` is manually dispatched and bound to the `production` GitHub environment for approval before provider rollout.
- `render.yaml` and `railway/` provide provider starter configs using Docker images and provider-managed secret injection.

## Environment Variables

Include safe `.env.example` keys: `DATABASE_URL`, `CLERK_SECRET_KEY` or `CLERK_JWT_KEY`, `CLERK_AUTHORIZED_PARTIES`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `DOCUMENT_SIGNING_SECRET`, `RESEND_API_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_PUBLIC`, `R2_BUCKET_PRIVATE`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PESAPAL_*`, `PESAPAL_WEBHOOK_SECRET`, `GOOGLE_MAPS_API_KEY`, `SENTRY_DSN`, `CORS_ORIGINS`, and `RATE_LIMIT_*` knobs for auth, uploads/documents, payments, and webhooks.

## Migration/Release

Backup first, run Prisma migrate deploy, deploy app image, verify health checks, run smoke tests, monitor Sentry/logs. Use expand/contract migrations for risky changes.

Operational commands:

- `pnpm ops:validate` checks deployment files, required environment examples, CI workflow wiring, Docker health checks, and deploy helper scripts.
- `pnpm deploy:migrate` runs `prisma migrate deploy` for the backend. It requires `DATABASE_URL`.
- `pnpm deploy:smoke` checks backend health, readiness, version metadata at `API_BASE_URL`, and optionally the frontend at `FRONTEND_BASE_URL`.
- CI validates deployment config with `pnpm ops:validate`.
- `pnpm backup:status` checks repository-managed PostgreSQL backup artifacts in `BACKUP_DIR` against `BACKUP_EXPECTED_MAX_AGE_HOURS`. Managed provider PITR must still be confirmed in the provider console.

Provider flow:

1. Create or verify a fresh database backup/PITR checkpoint.
2. Run `pnpm ops:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` from the release commit.
3. Run `pnpm deploy:migrate` before app rollout.
4. Deploy backend and frontend images from the same commit/image tag.
5. Run smoke tests against deployed URLs.
6. Confirm provider PITR or run `pnpm backup:status` for repository-managed backup drill artifacts.
7. Monitor provider logs, `/api/v1/health/ready`, `/api/v1/metrics`, and Sentry during the release window.

## Rollback

Keep previous images available. Prefer forward fixes for schema changes. For destructive changes, require backup and rollback rehearsal.

Provider rollback should redeploy the previous backend/frontend image tags. Schema rollback is not automatic; use forward fixes unless a rehearsed restore is explicitly approved.

## Backup/Restore

Daily database backups and PITR where provider supports it. R2 versioning/lifecycle where practical. Perform staging restore drill before production launch.

Repository helpers:

- `pnpm backup:postgres` writes a compressed `pg_dump` using `DATABASE_URL` and optional `BACKUP_DIR`.
- `pnpm backup:status` reports whether the newest local `.sql`/`.sql.gz` backup artifact is within `BACKUP_EXPECTED_MAX_AGE_HOURS`.
- `scripts/deploy/restore-postgres.sh` restores a `.sql` or `.sql.gz` file only when `CONFIRM_RESTORE=yes` is set.

Managed production databases should still use provider-native daily backups and PITR where the selected Render/Railway tier supports it. The script is a deterministic fallback and restore-drill helper, not a replacement for provider PITR.

## Production Checklist

- HTTPS is enforced by the provider/load balancer.
- Production secrets are configured outside git: Clerk auth keys, document signing secret, R2 keys/buckets, Stripe/Pesapal keys and webhook secrets, Resend, Google Maps, Sentry, and non-localhost `CORS_ORIGINS`.
- Sensitive rate-limit knobs are set for auth, uploads/documents, payments, and webhooks.
- Privileged users have MFA enabled and admin account recovery is documented.
- Provider webhooks point to `/api/v1/webhooks/stripe` and `/api/v1/webhooks/pesapal` with verified signing secrets.
- CI quality gates pass: lint, typecheck, tests, build, deployment config validation, audit, and E2E smoke where browsers are available.
- `/api/v1/health/ready`, `/api/v1/version`, and `/api/v1/metrics` are reachable after rollout.
- Sentry release/environment tags are visible and structured logs redact secrets, payment data, travel documents, and private object keys.
- Backups/PITR are enabled and a staging restore drill has been run before production launch.
- The production runbook in `project-docs/26-production-readiness-runbook.md` has been reviewed for the release.
