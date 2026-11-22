# README Draft

## EU B2B Tourism Portal

B2B tourism portal for operators, agencies, admins, and finance users. Operators publish packages, agencies manage client bookings, operators approve before payment, finance reconciles provider activity, and admins govern companies, users, settings, reviews, and audit history.

## Stack

Next.js, NestJS, PostgreSQL, Prisma, Tailwind, shadcn/ui, Cloudflare R2, Stripe, Pesapal, Resend, Google Maps, Sentry, Docker, GitHub Actions, Render/Railway.

## Local Setup

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm --filter backend prisma:migrate
pnpm --filter backend prisma:seed
pnpm dev
```

Docker Compose exposes PostgreSQL on `localhost:5433` by default.

## Quality Commands

```bash
pnpm ops:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## Runtime URLs

Frontend: `http://localhost:3000`

Backend health: `http://localhost:4000/api/v1/health`

Backend readiness: `http://localhost:4000/api/v1/health/ready`

Backend metrics: `http://localhost:4000/api/v1/metrics`

Backend OpenAPI: `http://localhost:4000/api/docs`

## Release Checks

Confirm backups/PITR, run quality gates, run `pnpm deploy:migrate`, deploy backend and frontend images from the same commit, run `pnpm deploy:smoke`, verify backup freshness or provider PITR, and monitor provider logs, readiness, metrics, and Sentry.

## Folder Structure

See `project-docs/25-repository-structure.md`.

## Troubleshooting

Login blocked: verify email and company approval. Payment stuck: inspect webhook events/provider refs. Document denied: check company scope and signed URL permission. Slow search: check indexes and filters.
