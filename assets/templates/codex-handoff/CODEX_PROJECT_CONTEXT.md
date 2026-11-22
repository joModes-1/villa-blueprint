# Codex Project Context

The system is a B2B tourism portal. Operators publish packages; agencies manage clients and request bookings; operators approve before payment; agency pays through Stripe/Pesapal; webhooks confirm payment; finance/admin reconcile invoices, refunds, commissions, payouts; documents are stored in Cloudflare R2; admins govern companies/users/settings/audit.

Stack: Next.js, NestJS, PostgreSQL, Prisma, REST, Tailwind/shadcn, R2, Resend, Google Maps, Stripe, Pesapal, Sentry, Docker, GitHub Actions, Render/Railway.

Security expectations: company-scoped RBAC, MFA privileged roles, signed URLs for private documents, verified webhooks, no raw cards, rate limits, audit logs.

Primary MVP workflows: registration/approval; package creation/publishing; package search; client/traveler management; booking submit/approve/pay/confirm; document upload/download; admin/finance dashboards.
