# API Specification

## API Design Principles

- Base path: `/api/v1`.
- Auth: Clerk session bearer token. The backend maps the verified Clerk user ID to local user/company membership records before enforcing permissions.
- Error shape: `{ "error": { "code", "message", "details", "requestId" } }`.
- Lists: `page`, `pageSize`, `total`, `totalPages`, `items`.
- Filters/sort are allowlisted; all protected endpoints enforce permission and company scope.
- Mutating endpoints that affect accounts, bookings, finance, documents, roles, permissions, or settings must write audit logs.

## Example Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "details": [
      { "field": "email", "message": "Enter a valid email address." }
    ],
    "requestId": "req_01HXYZ"
  }
}
```

## Implemented MVP Endpoints

The backend applies the `/api/v1` global prefix to the REST API. Swagger/OpenAPI UI is served at `/api/docs`.

| Method | Path                                                                                             | Purpose                                            | Access                                              |
| ------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------------- | --------------------------------------------------- |
| GET    | `/health`, `/health/live`, `/health/ready`                                                       | Liveness and readiness probes                      | public/ops-safe                                     |
| GET    | `/version`, `/metrics`                                                                           | Release metadata and Prometheus-compatible metrics | public/ops-safe                                     |
| POST   | `/auth/register-company`                                                                         | Company and owner registration                     | public, rate-limited                                |
| POST   | `/auth/verify-email`                                                                             | Verify email token                                 | public, rate-limited                                |
| POST   | `/auth/login`, `/auth/mfa/verify`, `/auth/refresh`, `/auth/logout`                               | Legacy local session flow for non-production compatibility | public/authenticated, rate-limited          |
| POST   | `/auth/password/forgot`, `/auth/password/reset`                                                  | Legacy local password reset flow                   | public, rate-limited                                |
| GET    | `/me`                                                                                            | Current profile, company, role, and permissions    | authenticated                                       |
| GET    | `/company`                                                                                       | Current company profile and active staff list      | `companies:manage`, approved company                |
| PATCH  | `/company`                                                                                       | Update safe current-company profile fields         | `companies:manage`, approved company                |
| POST   | `/company/staff`                                                                                 | Invite or re-invite operator/agency staff membership | `companies:manage`, approved company              |
| POST   | `/company/staff/accept`                                                                          | Accept a staff invitation token                    | public token                                        |
| DELETE | `/company/staff/{membershipId}`                                                                  | Deactivate current-company staff membership        | `companies:manage`, approved company                |
| GET    | `/admin/companies`                                                                               | Company list and registration queue                | `companies:approve`                                 |
| POST   | `/admin/companies/{id}/approve`, `/admin/companies/{id}/reject`, `/admin/companies/{id}/suspend` | Company approval decisions                         | `companies:approve`, platform actor                 |
| GET    | `/admin/users`                                                                                   | User and membership governance list                | `companies:manage`                                  |
| GET    | `/admin/audit-logs`                                                                              | Audit log list                                     | `audit_logs:view`                                   |
| GET    | `/admin/settings`                                                                                | Platform settings list                             | `audit_logs:view`                                   |
| PATCH  | `/admin/settings/{key}`                                                                          | Versioned platform setting update                  | `settings:manage`                                   |
| GET    | `/operator/packages`                                                                             | Operator-scoped package list                       | `packages:manage`, approved company                 |
| POST   | `/operator/packages`                                                                             | Create operator-owned draft package                | `packages:manage`, approved company                 |
| GET    | `/operator/packages/{id}`                                                                        | Operator-scoped package detail                     | `packages:manage`, approved company                 |
| PATCH  | `/operator/packages/{id}`                                                                        | Update operator-owned draft package                | `packages:manage`, approved company                 |
| POST   | `/operator/packages/{id}/publish`                                                                | Publish a complete operator-owned package          | `packages:manage`, approved company                 |
| POST   | `/operator/packages/{id}/archive`                                                                | Archive operator-owned package                     | `packages:manage`, approved company                 |
| GET    | `/marketplace/packages`                                                                          | Search published packages with allowlisted filters | `marketplace:browse`, approved company              |
| GET    | `/marketplace/packages/{id}`                                                                     | Published package detail                           | `marketplace:browse`, approved company              |
| POST   | `/marketplace/packages/{id}/favorite`                                                            | Save a published package to agency favorites       | agency `marketplace:browse`, approved company       |
| DELETE | `/marketplace/packages/{id}/favorite`                                                            | Remove a published package from agency favorites   | agency `marketplace:browse`, approved company       |
| GET    | `/agency/clients`, `/agency/clients/{id}`                                                        | Agency-scoped client and traveler records          | `clients:manage`, approved company                  |
| POST   | `/agency/clients`                                                                                | Create agency client record                        | `clients:manage`, approved company                  |
| PATCH  | `/agency/clients/{id}`                                                                           | Update agency client record                        | `clients:manage`, approved company                  |
| DELETE | `/agency/clients/{id}`                                                                           | Soft-delete agency client record                   | `clients:manage`, approved company                  |
| POST   | `/agency/clients/{id}/travelers`                                                                 | Create traveler under agency client                | `clients:manage`, approved company                  |
| PATCH  | `/agency/travelers/{id}`                                                                         | Update traveler record                             | `clients:manage`, approved company                  |
| DELETE | `/agency/travelers/{id}`                                                                         | Soft-delete traveler record                        | `clients:manage`, approved company                  |
| GET    | `/agency/bookings`, `/agency/bookings/{id}`                                                      | Agency-scoped booking list/detail                  | `bookings:submit`, approved company                 |
| POST   | `/agency/bookings`                                                                               | Submit agency booking request                      | `bookings:submit`, approved company                 |
| POST   | `/agency/bookings/{id}/cancel`, `/agency/bookings/{id}/complete`                                 | Cancel or complete agency-scoped booking           | `bookings:submit`, approved company                 |
| GET    | `/operator/bookings`, `/operator/bookings/{id}`                                                  | Operator-scoped booking queue/detail               | `bookings:approve`, approved company                |
| POST   | `/operator/bookings/{id}/approve`                                                                | Approve operator-scoped pending booking            | `bookings:approve`, approved company                |
| POST   | `/operator/bookings/{id}/reject`, `/operator/bookings/{id}/cancel`, `/operator/bookings/{id}/complete` | Reject, cancel, or complete operator-scoped booking | `bookings:approve`, approved company                |
| POST   | `/bookings/{bookingId}/payments/checkout`                                                        | Record Stripe/Pesapal checkout intent              | payment permission, approved company                |
| POST   | `/webhooks/stripe`, `/webhooks/pesapal`                                                          | Verified provider callbacks                        | provider signature, rate-limited                    |
| POST   | `/bookings/{bookingId}/refunds`                                                                  | Request refund                                     | refund permission, approved company                 |
| POST   | `/admin/refunds/{id}/approve`, `/admin/refunds/{id}/reject`                                      | Refund decision                                    | finance/admin permission                            |
| GET    | `/finance/invoices`, `/finance/payments`, `/finance/refunds`, `/finance/commissions`, `/finance/payouts` | Finance reconciliation lists                       | finance/admin permission                            |
| PATCH  | `/finance/invoices/{id}`                                                                         | Edit unpaid draft/issued invoice totals/items      | finance/admin permission                            |
| POST   | `/documents`                                                                                     | Create private document metadata                   | document permission, approved company, rate-limited |
| POST   | `/documents/{id}/download-url`                                                                   | Create short-lived signed download URL             | document permission, approved company, rate-limited |
| GET    | `/documents/{id}/signed-download`                                                               | Validate signed document URL and return safe metadata | signed URL, rate-limited                         |
| GET    | `/dashboards/{role}`                                                                             | Role-specific metrics and recent audit summary     | reports permission                                  |
| GET    | `/reports/platform`, `/reports/bookings`, `/reports/revenue`, `/reports/commissions`             | Reporting summaries                                | reports permission                                  |
| GET    | `/notifications`                                                                                 | Current user notification inbox                    | authenticated                                       |
| POST   | `/notifications/{id}/read`, `/notifications/{id}/archive`                                        | Mark current-user notification read or archived    | authenticated                                       |
| POST   | `/bookings/{bookingId}/reviews`                                                                  | Submit review for completed agency booking         | agency review permission                            |
| GET    | `/admin/reviews`                                                                                 | Review moderation queue                            | platform admin                                      |
| POST   | `/admin/reviews/{id}/approve`, `/admin/reviews/{id}/reject`, `/admin/reviews/{id}/hide`          | Review moderation decisions                        | platform admin                                      |

## MVP API Limits

The current endpoint surface covers the MVP flows above. Production rollout still requires provider/account validation for Clerk, Resend, Stripe, Pesapal, R2, Sentry, and jurisdiction-specific tax/VAT settings.

## Example Booking Request

```json
{
  "packageId": "pkg_123",
  "clientId": "client_123",
  "travelStartDate": "2026-09-10",
  "travelEndDate": "2026-09-14",
  "travelerIds": ["trav_1", "trav_2"],
  "accommodationOptions": { "tier": "standard" },
  "transportOptions": { "pickupPoint": "Entebbe Airport" },
  "specialRequests": "Vegetarian meals"
}
```

## Validation and Idempotency Notes

- Date-only request fields must be real calendar dates in `YYYY-MM-DD` format.
- Operator booking approval creates an issued invoice and invoice item from package pricing in the same transaction.
- Duplicate operator booking approval for an already approved booking returns the current booking without writing another status event, invoice, or audit log.
- Duplicate operator rejection for an already rejected booking and duplicate cancellation for an already cancelled booking return the current booking without repeating side effects.
- Manual booking completion is scoped to the booking agency or operator, accepts active approved/paid/confirmed bookings, is idempotent for already completed bookings, and writes booking status and audit records.
- Marketplace favorite writes are agency-scoped, idempotent, and return `{ favorite, packageId }`; package list/detail responses include `isFavorite` for the current company when applicable.
- Notification inbox endpoints are scoped to the authenticated user ID, return unread counts with list responses, and only mutate owned notifications.
- Staff invitation creates an `INVITED` company membership, an invitation token, in-app notification, and Resend-backed email event. Accepting the token activates the user and membership so Clerk can link the account by email on sign-in.
- Workflow notifications create in-app notification records and email events for company decisions, staff invitations, booking state changes, and successful payment settlement. Resend delivery is attempted when `RESEND_API_KEY` is configured; otherwise email events remain queued for later delivery.
- Manual invoice editing is finance-scoped and blocked after payment has started or when the invoice is no longer `DRAFT`/`ISSUED`; totals are recalculated from items, tax, and discount.
- Duplicate refund requests for a booking with an open refund return the existing refund without creating another refund, booking status event, or audit log.
- Duplicate refund approval or rejection for an already decided refund returns the current refund without repeating side effects.
- Payment checkout accepts provider selection and records a checkout intent only; raw card fields such as card number/CVC/expiry are rejected. Current MVP responses include `checkoutUrl: null` and `providerIntegrationStatus: "ADAPTER_NOT_CONFIGURED"` until Stripe/Pesapal hosted checkout adapters are wired.
- Payment webhook endpoints require configured provider signing secrets and store provider event IDs idempotently so duplicate callbacks do not repeat status-transition side effects. Successful payment webhooks mark the payment succeeded, mark its invoice paid, confirm the booking, accrue operator commission from `commission_rate_bps`, and write audit/status records.
- Document metadata creation validates MIME type and file size, stores private object-key metadata server-side only, document download URL creation returns short-lived signed URLs after RBAC/tenant checks, and signed download URLs must pass signature and expiry validation before safe metadata is returned.
- Clerk handles production sign-in, sign-up, email verification, MFA, sessions, and password reset. Auth registration and forgot-password endpoints do not return email verification or password reset tokens. Forgot-password returns the same generic response whether or not the email exists.
- Auth, upload/document, payment checkout, webhook, and sensitive write endpoints are rate-limited through environment-configurable fixed windows. Rate-limit buckets use `request.ip`/socket address by default; forwarded headers are used only when `TRUST_PROXY` or `TRUST_FORWARDED_HEADERS` is explicitly enabled.
- Observability endpoints remain under `/api/v1`: `/health` and `/health/live` return liveness, `/health/ready` returns dependency readiness checks, `/version` returns service release metadata, and `/metrics` returns Prometheus-compatible request/counter metrics.
