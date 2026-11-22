# Layer 6 — Operations Guide: DevOps, Observability, Production Runbook

These documents define how the system runs in production. They are often written last and read most urgently — at 2am when something is broken. Write them when things are calm so they can be executed under pressure.

---

## Document 1: DevOps, Deployment & Operations

### What It Is
Everything about how code goes from a developer's machine to production: environments, CI/CD pipelines, database migration process, secrets management, and rollback strategy.

### Why It Exists
Deployment without a written process is how data gets corrupted, migrations get skipped, and rollbacks get botched. This document makes every deployment step explicit and repeatable.

### How to Write It

**Section 1: Environments**
Define every environment and what makes each one different.

```
| Environment | Purpose | DB | Storage | Payment Provider | Notes |
|---|---|---|---|---|---|
| local | Development on developer machine | Local PostgreSQL | Local minio or R2 test | Sandbox credentials | .env.local |
| staging | Integration testing, stakeholder review | Staging PostgreSQL on provider | Staging R2 bucket | Sandbox credentials | Auto-deploys on merge to main |
| production | Live users | Production PostgreSQL with PITR | Production R2 bucket | Live credentials | Manual approval required |
```

Rules:
- Staging must mirror production configuration as closely as possible
- Never use production credentials in staging
- Never use production database in staging tests
- Each environment gets its own set of secrets (never share signing secrets between staging and prod)

**Section 2: Environment Variables**
Document every environment variable the system needs.

Template:
```
### Required for all environments
DATABASE_URL=                # PostgreSQL connection string (include pool size)
CLERK_SECRET_KEY=            # Clerk backend secret
CLERK_PUBLISHABLE_KEY=       # Clerk frontend publishable key

### Required for file storage
R2_ACCOUNT_ID=               # Cloudflare account ID
R2_ACCESS_KEY_ID=            # R2 access key
R2_SECRET_ACCESS_KEY=        # R2 secret key
R2_BUCKET_NAME=              # Private bucket name
R2_PUBLIC_BUCKET_NAME=       # Public bucket name (package media)
SIGNED_URL_SECRET=           # Secret for signing document download URLs

### Required for payments
STRIPE_SECRET_KEY=           # Stripe backend key
STRIPE_WEBHOOK_SECRET=       # Stripe webhook signing secret
PESAPAL_CONSUMER_KEY=        # Pesapal key
PESAPAL_CONSUMER_SECRET=     # Pesapal secret
PESAPAL_WEBHOOK_SECRET=      # Pesapal webhook signing secret

### Required for email
RESEND_API_KEY=              # Resend API key
EMAIL_FROM=                  # Sender address

### Required for observability
SENTRY_DSN=                  # Sentry error tracking DSN

### Optional
TRUST_PROXY=false            # Set true if behind load balancer
RATE_LIMIT_WINDOW_MS=60000   # Rate limit window (default 1 minute)
LOG_LEVEL=info               # Logging level
```

**Section 3: CI/CD Pipeline**
Write the exact CI pipeline steps.

`.github/workflows/ci.yml` runs on every PR:
```
Jobs:
  quality:
    steps:
      - checkout
      - pnpm install (with cache)
      - pnpm lint
      - pnpm typecheck
      - pnpm test
      - pnpm build
  
  staging-deploy (on merge to main only):
    needs: quality
    steps:
      - deploy backend image to staging
      - run database migrations on staging
      - run smoke tests against staging
```

`.github/workflows/deploy-production.yml` runs on manual dispatch with approval:
```
Steps:
  - checkpoint: ensure staging deploy passed
  - create backup
  - validate configuration (pnpm ops:validate)
  - run migrations (pnpm deploy:migrate)
  - deploy application images
  - run smoke tests (pnpm deploy:smoke)
  - monitor error rate for 10 minutes
  - confirm readiness endpoint is healthy
```

**Section 4: Database Migration Process**
The exact sequence for every database migration:

```
Development:
1. Write new migration: pnpm prisma migrate dev --name [description]
2. Review generated SQL before committing
3. Run tests
4. Commit migration files with the code that uses them

Staging:
1. CI runs migrations automatically on merge to main
2. If migration fails: staging deploy aborts; CI reports failure

Production:
1. Back up database (always, before any migration)
2. Validate environment: pnpm ops:validate
3. Run migration: pnpm deploy:migrate
4. This runs BEFORE deploying new application code
5. New code must be backwards compatible with old schema until migration completes
6. After deployment: run smoke tests; verify migration applied correctly

NEVER:
- Edit a migration file after it has been applied
- Run migrations and deploy simultaneously
- Skip running tests after a migration
- Apply production migrations without a current backup
```

**Section 5: Rollback Strategy**
For every type of failure, what do you do?

```
Application regression (new code breaks behavior, schema unchanged):
  Action: Redeploy previous image version
  Command: [provider-specific: Railway previous deployment, Render rollback]
  Time: < 5 minutes

Application with new schema (migration already applied):
  Prefer: Forward-fix in a new deployment
  Reason: Rolling back a schema migration with live data is dangerous
  Last resort: Restore database from backup (data loss from the backup point!)
  
Migration failure (migration didn't apply cleanly):
  Action: Fix the migration, re-run from staging first
  Never: Run a partial migration manually in production

Configuration error:
  Action: Fix the environment variable and redeploy (no code change needed)
```

**Section 6: Secrets Management**
```
- All secrets in environment variables (not in code, not in version control)
- .env.example contains every key with placeholder values (committed)
- .env.local contains actual secrets (gitignored)
- Production secrets managed through hosting provider's secret management
- Rotate all secrets if there is any suspicion of compromise
- Use different secrets for each environment
- Staging webhook secrets and production webhook secrets must be different
```

---

## Document 2: Observability, Logging & Monitoring

### What It Is
Defines what gets logged, what metrics are tracked, what alerts fire, and what dashboards display. Without this, when something goes wrong in production, you're debugging blind.

### How to Write It

**Section 1: Logging Standards**
Define the exact log format and rules.

```
Log format: structured JSON (not plain text)
Every log line includes:
  - timestamp (ISO 8601, UTC)
  - level (info / warn / error)
  - requestId (for correlating all log lines from one request)
  - route (e.g., "POST /api/v1/agency/bookings")
  - method (HTTP method)
  - statusCode (HTTP response status)
  - latencyMs (response time in milliseconds)
  - userId (safe: internal ID, not email/name)
  - companyId (safe: internal company ID)
  - resourceId (if applicable: bookingId, packageId, etc.)
```

**The Log Redaction List (never log these):**
```
passwords, password_hash
session tokens, refresh tokens, auth tokens
MFA secrets, MFA codes, recovery codes
credit card numbers, CVV, expiry
bank account numbers
passport numbers, visa numbers
private key material
webhook signing secrets
R2 object keys (for private documents)
API keys for any provider
```

Rule: If in doubt, don't log it. Log IDs and event names, not the sensitive data itself.

**Section 2: Error Reporting (Sentry)**
```
Report to Sentry: unexpected errors (5xx), unhandled promise rejections, uncaught exceptions
Include in Sentry context (safe): requestId, userId, companyId, environment, release version
Do NOT include in Sentry: any data from the log redaction list above
Alert on: new error types, error rate spike (>5% 5xx in 5 minutes)
```

**Section 3: Metrics**
Define every metric the system exposes.

Application metrics (Prometheus endpoint at /api/v1/metrics):
```
http_requests_total (labels: method, route, status_code)
http_request_duration_ms (histogram, labels: method, route)
```

Business metrics (tracked in DB, displayed in dashboards):
```
auth_login_attempts_total, auth_login_failures_total
booking_submissions_total, booking_approvals_total
payment_initiation_total, payment_success_total, payment_failure_total
webhook_received_total, webhook_failure_total
document_upload_total, document_download_total
email_sent_total, email_failure_total
```

**Section 4: Health Endpoints**
Every production API must expose these:

```
GET /api/v1/health         → { status: "ok" } — basic liveness (is the process alive?)
GET /api/v1/health/live    → same as /health (Kubernetes liveness probe)
GET /api/v1/health/ready   → { status: "ok", checks: { db: "ok", ... } } — dependency readiness
GET /api/v1/version        → { version: "1.2.3", commit: "abc123", environment: "production" }
GET /api/v1/metrics        → Prometheus text format metrics
```

The readiness endpoint must check all critical dependencies:
- Database connection (run a simple query)
- R2 connectivity (optional, but if R2 is down, document operations fail)

If the database is unavailable, `/health/ready` returns 503 — the load balancer stops routing traffic.

**Section 5: Audit Events**
Every sensitive action must write an immutable audit log entry.

What must always be audited:
```
Authentication: login, login failure, MFA enabled/disabled, password reset
Company: created, approved, rejected, suspended
User: invited, activated, suspended, role changed
Package: published, archived
Booking: approved, rejected, cancelled, completed
Invoice: created, edited, paid
Payment: checkout initiated, succeeded, failed
Refund: requested, approved, rejected, completed
Document: uploaded, downloaded, deleted
Settings: any platform setting changed
Admin actions: any admin-level action
```

Audit log entry must contain:
```
actor_id, actor_type (user/system/webhook)
company_id
action (e.g., "BOOKING_APPROVED")
resource_type (e.g., "booking")
resource_id
ip_address
user_agent
metadata (safe JSON: before/after state for settings changes, etc.)
created_at
```

**Section 6: Alerts**
Define what conditions trigger an alert and who gets notified.

```
CRITICAL (page immediately):
  - 5xx error rate > 5% over 5 minutes
  - Database unreachable
  - Backup job failed
  - Payment webhook failure rate > 5%

WARNING (notify within 1 hour):
  - API p95 latency > 5 seconds
  - Readiness check degraded (not failing, but slow)
  - Email delivery failure rate > 10%
  - Sentry: new error type seen in production

MONITOR (daily review):
  - Login failure rate spike (possible credential stuffing)
  - MFA bypass attempts
  - Unusual admin activity pattern
```

---

## Document 3: Production Readiness Runbook

### What It Is
The exact step-by-step checklist that is executed before and after every production deployment. This is not a summary — it's the actual steps, in order, with commands.

### Why It Exists
Runbooks replace memory under pressure. At 2am, when something is broken and you're stressed, you don't improvise — you follow the runbook. The runbook captures the knowledge of the person who set up the system so anyone can execute it correctly.

### How to Write It

Write every step as an imperative command. If a step requires a bash command, write the command. If a step requires a UI action, write exactly what to click.

**Pre-Deploy Checklist (every production deploy):**
```
[ ] 1. Verify staging deployment passed: check CI dashboard
[ ] 2. Check current backup exists and is fresh (< 24 hours old)
[ ] 3. Run ops:validate: pnpm ops:validate (checks all required env vars)
[ ] 4. Run quality gates: pnpm lint && pnpm typecheck && pnpm test && pnpm build
[ ] 5. Review migrations: list pending migrations and verify SQL is correct
[ ] 6. Notify team: "Production deploy starting at [time], ETA [time]"
```

**Deploy Steps:**
```
[ ] 7. Create manual backup: [provider-specific backup command]
[ ] 8. Verify backup: confirm backup job completed successfully
[ ] 9. Run migrations: pnpm deploy:migrate
[ ] 10. Verify migrations: check migration log for errors
[ ] 11. Deploy application: [provider-specific: deploy new image]
[ ] 12. Wait for deployment health check to pass (max 5 minutes)
[ ] 13. Run smoke tests: pnpm deploy:smoke
```

**Post-Deploy Verification:**
```
[ ] 14. Check health: curl https://api.example.com/api/v1/health/ready
[ ] 15. Check version: curl https://api.example.com/api/v1/version (confirms new version running)
[ ] 16. Check Sentry: no new errors in first 10 minutes
[ ] 17. Check error rate: metrics show no 5xx spike
[ ] 18. Test critical path manually: attempt a login, browse packages, check dashboard
[ ] 19. Notify team: "Production deploy complete, monitoring for 30 minutes"
```

**Rollback Decision Tree:**
```
Is the issue a code bug (schema unchanged)?
  → YES: Redeploy previous version image
    1. Identify previous image version
    2. Deploy previous image
    3. Verify health/ready returns 200
    4. Run smoke tests

Is the issue a migration (schema already changed)?
  → Minor: Write a forward-fix migration and deploy
  → Major data corruption: 
    1. Put site in maintenance mode
    2. Notify all active users
    3. Restore from last backup
    4. Verify data integrity post-restore
    5. Redeploy last known good version

Is the issue a configuration error?
  → Fix the environment variable and redeploy (no code/schema change)
```

**Smoke Test Suite (pnpm deploy:smoke):**
The smoke test suite verifies minimum production viability. Write it as a script that runs these checks and fails if any fail:

```
1. GET /api/v1/health/ready → 200 and status: "ok"
2. GET /api/v1/version → 200 and correct release version
3. POST /api/v1/auth/login (invalid credentials) → 401 (auth system up)
4. GET /api/v1/marketplace/packages (no auth) → 401 (auth guard working)
5. GET /api/v1/metrics → 200 (Prometheus metrics serving)
```

**Incident Response Template:**
When something breaks in production, use this template to organize the response:

```
INCIDENT REPORT — [YYYY-MM-DD HH:MM] UTC

Severity: P0 (system down) / P1 (major feature broken) / P2 (minor issue)

1. SYMPTOM: What is broken? What are users experiencing?
2. DETECTION: How was this detected? (alert / user report / monitoring)
3. CURRENT STATE: What is the system state right now?
4. IMMEDIATE ACTION: What is being done right now?
5. ROOT CAUSE: (fill in after incident is resolved)
6. RESOLUTION: (fill in after incident is resolved)
7. PREVENTION: What change prevents this from happening again?
```

**Backup Verification (monthly):**
Run this monthly to confirm backups are actually restorable:

```
[ ] 1. Identify most recent backup
[ ] 2. Restore backup to isolated staging database
[ ] 3. Verify row counts match production expectations
[ ] 4. Run smoke queries against restored DB
[ ] 5. Confirm restore time meets RTO target
[ ] 6. Document result in backup verification log
```

### The Golden Rule of Runbooks
A runbook that has never been tested is not a runbook — it's a wishlist. Before going to production:
- Walk through every step of the pre-deploy and post-deploy checklist
- Execute a test rollback in staging
- Time the restore from a staging backup
- Have a team member follow the runbook for the first production deploy, not from memory
