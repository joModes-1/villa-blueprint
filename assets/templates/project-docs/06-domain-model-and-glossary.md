# Domain Model and Glossary

## Domain Summary
Operators supply tourism packages. Agencies manage clients/travelers and submit booking requests. Operators approve availability. Agencies pay approved bookings. Finance/admins reconcile payments, refunds, commissions, and payouts. Admins govern companies, users, settings, reviews, and audit logs.

## Entities and Tables

| Table | Purpose | Key notes |
|---|---|---|
| users | Human accounts | email unique, status, password_hash, email_verified_at, soft delete |
| companies | Operator/agency/platform orgs | type, approval_status, registration/tax fields, address JSON, soft delete |
| company_memberships | User-company role membership | company-scoped RBAC, invited/active/suspended states |
| roles / permissions | Permission model | seeded fixed roles first; configurable later if needed |
| auth_sessions / tokens / mfa_factors | Auth session security | hashed refresh/reset tokens; MFA secrets/recovery codes protected |
| tour_packages | Operator package master | destination, category, duration, policies, map coordinates, status |
| package_itinerary_items | Package itinerary | day/order/title/description/time fields |
| package_availability | Date windows/capacity/blackouts | indexed by package and date |
| package_pricing | Base/seasonal prices | decimal amount, USD default, UGX supported |
| package_media | Public/media object references | R2 keys, sort order, alt text |
| favorite_packages | Agency saved packages | agency scoped |
| clients / travelers | Agency-managed customer data | sensitive passport/emergency contact fields; no tourist login |
| bookings | Booking request/reservation | lifecycle state, operator/agency/package/date fields |
| booking_status_events | Immutable state transition log | actor, from/to status, reason, metadata |
| invoices / invoice_items | Financial documents | numbering, currency, tax/discount/total fields |
| payments / payment_webhook_events | Provider payments and idempotency | Stripe/Pesapal refs, signed webhook event storage |
| refunds | Refund request/provider status | reason, approval, provider metadata |
| commissions / payouts | Split and payout reconciliation | platform/operator/agency amounts, payout status |
| documents | Private/public file metadata | R2 bucket/key, MIME, checksum, visibility, related resource |
| notifications / email_events | In-app and email delivery | template/event/status metadata |
| reviews | Post-trip ratings | moderation status |
| audit_logs | Immutable sensitive action log | actor, company, action, resource, IP/user-agent, metadata |
| platform_settings | Currency/tax/commission/integration settings | versioned settings, admin-only |


## State Transitions
- Company: draft/submitted → pending_review → approved/rejected → suspended/deactivated.
- User: invited/email_unverified → active/mfa_required → suspended/deactivated/deleted.
- Package: draft → published → unpublished/archived/deleted.
- Booking: draft → submitted → pending_operator_approval → approved → payment_pending → paid → confirmed → completed; side transitions to rejected/cancelled/refund_requested/refunded.
- Payment: created → checkout_started → pending → succeeded/failed/cancelled → refunded/partially_refunded/disputed.
- Refund: requested → under_review → approved/rejected → provider_pending → completed/failed.

## Domain Events
CompanyRegistered, CompanyApproved, UserInvited, PackagePublished, BookingSubmitted, BookingApproved, InvoiceGenerated, PaymentCheckoutStarted, PaymentSucceeded, BookingConfirmed, RefundRequested, RefundApproved, DocumentUploaded, DocumentDownloaded, SettingsChanged.

## Glossary
Hosted checkout: provider-hosted payment page. Tenant scope: company-level data boundary. Signed URL: short-lived private R2 access URL. Audit log: immutable sensitive action record. Idempotency: duplicate provider callbacks are safe to process once.
