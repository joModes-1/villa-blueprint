# Product Requirements Document

## Vision
Enable trusted B2B tourism transactions by giving operators a place to publish packages and agencies a place to discover, book, pay, and manage client travel while admins maintain governance and auditability.

## Goals
1. Digitize operator package and booking operations.
2. Let agencies search, compare, book, and pay for packages after operator approval.
3. Give finance/admin users complete visibility into invoices, payments, refunds, commissions, and payouts.
4. Protect sensitive traveler/business/financial data from the start.

## Non-Goals
Tourist login portal, native apps, supplier dashboards, advanced room/vehicle inventory, full CMS, real-time analytics, fraud scoring, payment terminals, and raw card processing are not MVP goals.

## Personas
| Persona | Problems | Needs |
|---|---|---|
| Operator Operations Manager | Manual package and booking tracking | Rich package editor, booking approval queue, reports |
| Agency Booking Agent | Slow comparison and approval coordination | Search, client records, booking requests, payment/invoice access |
| Platform Admin | Trust, compliance, disputed operations | Company approval, audit logs, platform monitoring |
| Finance User | Reconciliation complexity | Payment/refund/commission/payout views |

## Core Workflows
1. Register company → verify email → admin approval → login.
2. Operator creates/publishes package → agency searches package → agency submits booking.
3. Operator approves booking → invoice/payment pending → agency pays through hosted provider → webhook confirms booking.
4. Agency/operator/admin manage cancellations/refunds/documents/reports.

## User Stories
| ID | Story | Priority | Acceptance criteria | SRS source |
|---|---|---|---|---|
| US-001 | As an operator/agency, I want to register my company so that I can join the platform. | P0 | Required fields validated, email verification sent, company pending approval. | Account Management |
| US-002 | As an admin, I want to approve/reject companies so that only legitimate businesses transact. | P0 | Decision reason/audit log/notification recorded. | Approve Registrations |
| US-003 | As an operator, I want to manage rich packages so agencies can book them. | P0 | Draft/publish/archive, required publish fields, media/availability/pricing saved. | Tour Package Management |
| US-004 | As an agency, I want to search/filter packages so I can find suitable tours. | P0 | Filters combine; results paginated; drafts hidden. | Tour Package Browsing |
| US-005 | As an agency, I want to manage clients/travelers so booking details are reusable. | P0 | Agency-scoped records, sensitive fields protected. | Client Management |
| US-006 | As an agency, I want to submit booking requests so operators can approve availability. | P0 | Booking enters pending approval, status event stored, notification sent. | Booking Management |
| US-007 | As an operator, I want to approve/reject bookings so I control capacity. | P0 | Valid state transitions only, invoice generated on approval. | Booking Approval |
| US-008 | As an agency, I want to pay approved bookings so trips become confirmed. | P0 | Hosted checkout, verified webhook, idempotent confirmation. | Online Payments |
| US-009 | As finance, I want to track invoices/payments/refunds/commissions/payouts. | P0 | Provider refs, statuses, reports, no hard delete. | Payment & Financial |
| US-010 | As users, I want notifications so I know about approvals/bookings/payments. | P0 | Email and in-app notifications for key events. | Notifications |
| US-011 | As authorized users, I want secure document upload/download. | P0 | R2 storage, signed URLs, MIME/size validation, access audit. | Document Management |
| US-012 | As admin, I want dashboards/audit/settings so I can govern the platform. | P0 | Scoped metrics, audit logs, configurable currency/tax/commission fields. | Platform Monitoring/System Configuration |
| US-013 | As an agency, I want to rate completed trips so future agencies can assess quality. | P2 | Only completed trips can be reviewed; admin can moderate. | Review & Feedback |

## Business Rules
Admin approval required before transactions; payment after operator approval; platform collects first; USD default and UGX supported; no raw card storage; all sensitive actions audited; soft delete business records; backend authorization is authoritative.

## Edge Cases
Duplicate company registration, expired reset token, unapproved company attempting transaction, unavailable package dates, duplicate webhooks, payment success after cancellation, MFA device loss, invalid file type, cross-company access attempts.

## Dependencies
Stripe, Pesapal, Resend, Cloudflare R2, Google Maps, PostgreSQL, Render/Railway, GitHub Actions, Sentry.

## Release Criteria
All P0 stories pass acceptance tests, critical E2E flows pass, security checklist passes, staging deployment works, backups configured, open production-blocking questions resolved.
