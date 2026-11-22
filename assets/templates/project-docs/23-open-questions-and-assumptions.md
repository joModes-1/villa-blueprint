# Open Questions and Assumptions

| Area | Confirmed decision |
|---|---|
| MVP | Registration, company approval, auth/RBAC, package management, agency search/bookings, operator approval, invoices, payments, basic dashboards/reports, notifications, documents, admin management |
| Deferred v1 | Supplier portals, advanced hotel inventory, advanced vehicle scheduling, internal chat, CMS, real-time analytics, fraud detection, native mobile apps, payment terminals, complex exports |
| Users | B2B only; tourists/clients are agency-managed records and do not log in |
| Roles | Super Admin, Platform Staff/Admin, Tour Operator Admin, Tour Operator Staff, Travel Agency Admin, Travel Agency Staff, Accountant/Finance |
| Approval | All operator and agency registrations require admin approval before transactions |
| Booking lifecycle | draft → submitted → pending_operator_approval → approved → payment_pending → paid → confirmed → completed; side states rejected, cancelled, refund_requested, refunded |
| Payment rule | Operator approval required before payment |
| Settlement | Platform collects first, records commissions, then reconciles payouts |
| Currency | USD default; UGX supported |
| Stack | Next.js + TypeScript, NestJS + TypeScript, PostgreSQL + Prisma |
| Architecture | Modular monolith REST API in a monorepo |
| Auth | Email/password, email verification, password reset, JWT access/refresh, company approval |
| MFA | Required for Super Admin, Platform Staff/Admin, Accountant/Finance |
| RBAC | Company-scoped RBAC plus global super-admin permissions |
| Payments | Stripe for international cards; Pesapal/mobile money for local payments and payouts |
| Storage | Cloudflare R2 |
| Notifications | Email + in-app in MVP; SMS later |
| Email/maps | Resend and Google Maps API |
| UI | Responsive desktop-first, Tailwind CSS + shadcn/ui, WCAG 2.1 AA |
| Localization | English MVP; i18n-ready architecture |
| Deployment | Render/Railway managed deployment + Docker images + Cloudflare R2 |
| CI/observability | GitHub Actions; Sentry + structured logs + provider metrics |
| Testing | Tests alongside implementation; 80% backend/core coverage; critical Playwright E2E flows |
| Data/security | Sensitive PII/financial controls; Uganda-first compliance with GDPR-ready practices where practical |
| Deletes/backups | Soft-delete business records; hard-delete transient tokens/temp files; daily backups + PITR where supported |


## Assumptions
| ID | Assumption | Reason | Risk | Needs confirmation before |
|---|---|---|---|---|
| A-001 | This folder is the project root. | User confirmed it will be root folder. | Codex may create files in wrong place if changed. | task-001 |
| A-002 | USD default and UGX supported. | User specified. | Multi-currency accounting complexity. | finance build |
| A-003 | Tax/VAT rates configurable, not hardcoded. | SRS lacks rates. | Incorrect invoices if not confirmed. | production |
| A-004 | Stripe/Pesapal accounts and webhooks are available. | User selected providers. | Payment redesign/delay. | task-005 |
| A-005 | Retention durations are not finalized. | SRS omitted. | Compliance changes later. | production |

## Critical Before Coding
Confirm package manager if not pnpm and provider sandbox access strategy. 

## Important Before MVP
Tax/VAT and invoice numbering; refund eligibility/cutoffs; file size/type limits; dashboard metric formulas. 

## Can Decide Later
SMS provider, supplier portals, CMS, advanced analytics, additional languages.
