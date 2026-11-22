# UI/UX Specification

## Principles

Responsive desktop-first B2B dashboard; Tailwind + shadcn/ui; WCAG 2.1 AA; clear empty/loading/error/success states; permission-aware navigation; backend remains authoritative.

## Screens

| Screen                     | Route                                                      | Roles             | Purpose                                              | APIs                     |
| -------------------------- | ---------------------------------------------------------- | ----------------- | ---------------------------------------------------- | ------------------------ |
| Login/MFA                  | `/login`                                                   | Guest             | Authenticate and complete MFA                        | auth APIs                |
| Register Company           | `/register`                                                | Guest             | Company/owner registration                           | `/auth/register-company` |
| Pending Approval           | `/pending-approval`                                        | Unapproved        | Explain approval state                               | `/me`                    |
| Dashboard                  | `/dashboard`                                               | All               | Role metrics and next actions                        | `/dashboards/*`          |
| Company Profile/Staff      | `/company`, `/company/staff`                               | Company admins    | Profile and invitations                              | company APIs             |
| Package List/Editor        | `/operator/packages`, `/operator/packages/[id]`            | Operator          | CRUD, pricing, availability, media                   | package APIs             |
| Marketplace/Package Detail | `/marketplace`, `/marketplace/packages/[id]`               | Agency            | Search/filter/details/favorite                       | marketplace APIs         |
| Clients/Travelers          | `/agency/clients`                                          | Agency            | Customer records                                     | client APIs              |
| Booking Create/List/Detail | `/agency/bookings`, `/operator/bookings`, `/bookings/[id]` | scoped            | Booking lifecycle                                    | booking APIs             |
| Payments/Refunds           | `/finance/payments`, `/finance/refunds`                    | Finance/Admin     | Reconciliation                                       | finance APIs             |
| Reports                    | `/reports`                                                 | Finance/Admin     | Booking, revenue, commission, and platform summaries | report APIs              |
| Documents                  | `/documents`                                               | scoped            | Upload/download                                      | document APIs            |
| Admin Companies/Users      | `/admin/companies`, `/admin/users`                         | Admin             | Approvals and staff governance                       | admin APIs               |
| Admin Audit/Settings       | `/admin/audit-logs`, `/admin/settings`                     | Admin/Super Admin | Security and configuration                           | admin APIs               |
| Review Moderation          | `/admin/reviews`                                           | Admin             | Approve, reject, or hide submitted reviews           | review APIs              |

## UI States

Forms show inline validation and summary. Package editor supports draft save and publish checks. Booking detail shows timeline/status, invoice/payment actions, documents, and role-specific controls. Tables support pagination, filters, column reduction on smaller screens. Mobile falls back to card lists for dense tables.

Task 008 management screens use permission-aware navigation and server-authoritative APIs for company decisions, user/audit lists, versioned settings updates, finance ledgers, refund decisions, reports, and review moderation. Financial and moderation actions show loading, success, and error states and avoid collecting raw card data or provider secrets.

## Component List

Button, Input, Select, DatePicker, DataTable, StatusBadge, Timeline, FileUploader, MapPicker, MoneyDisplay, Pagination, EmptyState, ErrorAlert, LoadingSkeleton, ConfirmDialog, Toast, NotificationBell, RoleGuard.

## Validation Messages

Use clear messages: “This field is required”, “Selected dates are outside availability”, “Traveler count exceeds capacity”, “You do not have permission”, “This file type is not allowed”.

## Accessibility

All controls require labels, keyboard operation, focus states, contrast, semantic headings, and screen-reader compatible error messages.
