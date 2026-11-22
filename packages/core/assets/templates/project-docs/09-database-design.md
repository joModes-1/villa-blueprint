# Database Design

## Choice
PostgreSQL with Prisma migrations. Use UUID/ULID primary keys, explicit foreign keys, timestamps, soft deletes for business records, enum lifecycle states, decimal money, JSONB only for flexible metadata/options, and indexes for list/report/search paths.

## Schema Overview

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


## Important Columns
Every business table should include `id`, `created_at`, `updated_at`, and usually `deleted_at`. Tenant-scoped tables include `company_id` or explicit agency/operator company IDs. Financial tables should not be soft-deleted through normal workflows; corrections happen through statuses and audit events.

## Detailed Table Examples
### users
`id uuid PK`, `email citext unique`, `password_hash text`, `first_name`, `last_name`, `phone`, `status`, `email_verified_at`, `last_login_at`, `created_at`, `updated_at`, `deleted_at`.

### companies
`id uuid PK`, `type enum(platform/operator/agency)`, `legal_name`, `trading_name`, `registration_number`, `tax_id`, `email`, `phone`, `address_json`, `logo_document_id`, `approval_status`, `approval_reason`, `approved_by_user_id`, `approved_at`, timestamps, soft delete.

### tour_packages
`id`, `operator_company_id`, `title`, `slug`, `category`, `destination`, `description`, `duration_days`, `start_time`, `end_time`, `meeting_point`, `pickup_options_json`, `age_policy`, `languages`, `accessibility_notes`, `max_group_size`, `inclusions`, `exclusions`, `map_lat`, `map_lng`, `internal_ops_notes`, `status`, timestamps.

### bookings
`id`, `booking_reference`, `agency_company_id`, `operator_company_id`, `package_id`, `client_id`, `travel_start_date`, `travel_end_date`, `traveler_count`, `accommodation_options_json`, `transport_options_json`, `special_requests`, `status`, `approved_by_user_id`, `approved_at`, `cancellation_reason`, timestamps.

### payments
`id`, `provider`, `provider_reference`, `booking_id`, `invoice_id`, `amount numeric(12,2)`, `currency char(3)`, `status`, `checkout_url`, `paid_at`, `metadata`, timestamps.

## Constraints and Indexes
- Unique user email; unique company registration number where present.
- Package indexes: `(operator_company_id,status)`, `(destination,status)`, `(category,status)`, availability date indexes.
- Booking indexes: `(agency_company_id,status,created_at)`, `(operator_company_id,status,travel_start_date)`.
- Payment indexes: `(provider,provider_reference)`, unique webhook event ID per provider.
- Document indexes: `(company_id,related_type,related_id)`, visibility/type.
- Audit indexes: `(company_id,created_at)`, `(actor_user_id,created_at)`, `action`.

## Migration and Seed Strategy
Use Prisma migrations in `apps/backend/prisma/migrations`. Seed roles, permissions, platform company, default settings, and optional dev users. Never edit applied migrations; add forward migrations. Run production migrations after backup.

## Validation and Retention
Validate DTOs and DB constraints. Use transactions for state changes. Retention durations for passports/visas/emergency contacts are open and must be finalized before production.
