# Requirements Matrix

| ID | Type | Requirement | Priority | Module/role | Task | Test |
|---|---|---|---|---|---|---|
| FR-001 | Functional | Register operator/agency companies and owner users | P0 | Auth/Companies | task-003 | TC-AUTH-001 |
| FR-002 | Functional | Email verification, login, logout, password reset, sessions | P0 | Auth | task-003 | TC-AUTH-002 |
| FR-003 | Functional | Admin approves/rejects company registrations | P0 | Admin | task-003/task-008 | TC-ADMIN-001 |
| FR-004 | Functional | Company-scoped staff, roles, and permissions | P0 | RBAC | task-003 | TC-RBAC-001 |
| FR-005 | Functional | Operators create/edit/publish/archive tour packages | P0 | Packages | task-004/task-005 | TC-PKG-001 |
| FR-006 | Functional | Packages include itinerary, pricing, availability, media, policies, map pin, pickup details | P0 | Packages | task-004 | TC-PKG-002 |
| FR-007 | Functional | Agencies search/filter published packages | P0 | Marketplace | task-005/task-007 | TC-SEARCH-001 |
| FR-008 | Functional | Agencies save favorite packages | P1 | Marketplace | task-007 | TC-FAV-001 |
| FR-009 | Functional | Agencies manage clients/travelers without tourist login | P0 | Clients | task-004/task-005 | TC-CLIENT-001 |
| FR-010 | Functional | Agencies submit booking requests with travelers/dates/preferences | P0 | Bookings | task-004/task-005 | TC-BOOK-001 |
| FR-011 | Functional | Operators approve/reject/cancel own package bookings | P0 | Bookings | task-005/task-007 | TC-BOOK-002 |
| FR-012 | Functional | System enforces booking lifecycle and confirmations | P0 | Bookings | task-005 | TC-BOOK-003 |
| FR-013 | Functional | Generate invoices for approved/paid bookings | P0 | Finance | task-005 | TC-FIN-001 |
| FR-014 | Functional | Stripe/Pesapal hosted payment initiation and webhook reconciliation | P0 | Payments | task-005/task-010 | TC-PAY-001 |
| FR-015 | Functional | Track payments, refunds, commissions, and payouts | P0 | Finance | task-005/task-008 | TC-PAY-002 |
| FR-016 | Functional | Refund request, approval, rejection, and provider status tracking | P1 | Finance/Admin | task-008 | TC-REF-001 |
| FR-017 | Functional | Role-specific dashboards | P0 | Dashboards | task-007/task-008 | TC-DASH-001 |
| FR-018 | Functional | Booking, revenue, commission, and platform reports | P1 | Reports | task-008 | TC-REP-001 |
| FR-019 | Functional | Upload/download package media and private documents via R2 | P0 | Documents | task-005/task-007 | TC-DOC-001 |
| FR-020 | Functional | Email and in-app notifications for key workflows | P0 | Notifications | task-005/task-007 | TC-NOTIF-001 |
| FR-021 | Functional | Post-trip reviews and admin moderation | P2 | Reviews | task-008 | TC-REV-001 |
| FR-022 | Functional | Admin manages users, companies, packages, bookings, finance, settings, audit logs | P0 | Admin | task-008 | TC-ADMIN-002 |
| FR-023 | Functional | Admin configures currencies, tax placeholders, commissions, email templates, integrations, maintenance mode | P1 | Admin/Settings | task-008 | TC-CONFIG-001 |
| DATA-001 | Data | Strict company-level data isolation | P0 | Data/RBAC | task-002/task-003 | TC-DATA-001 |
| DATA-002 | Data | Soft-delete business records and retain audit history | P0 | Data | task-002 | TC-DATA-002 |
| DATA-003 | Data | Store sensitive document metadata separately from R2 object bytes/keys | P0 | Documents | task-002/task-005 | TC-DOC-002 |
| INT-001 | Integration | Resend transactional email | P0 | Notifications | task-005 | TC-INT-001 |
| INT-002 | Integration | Google Maps package pins and pickup points | P1 | Packages/UI | task-007 | TC-INT-002 |
| INT-003 | Integration | Stripe webhooks | P0 | Payments | task-005/task-010 | TC-INT-003 |
| INT-004 | Integration | Pesapal/mobile-money and payout webhooks/reconciliation | P0 | Payments | task-005/task-010 | TC-INT-004 |
| SEC-001 | Security | Password hashing, token rotation, privileged MFA | P0 | Auth | task-003/task-010 | TC-SEC-001 |
| SEC-002 | Security | Server-side authorization on all protected endpoints | P0 | API/RBAC | task-003/task-010 | TC-SEC-002 |
| SEC-003 | Security | Rate-limit auth, uploads, payments, webhooks, sensitive writes | P0 | API | task-010 | TC-SEC-003 |
| SEC-004 | Security | No raw card data; hosted checkout only | P0 | Payments | task-010 | TC-SEC-004 |
| SEC-005 | Security | Private documents use signed URLs, validation, and access audit logs | P0 | Documents | task-010 | TC-SEC-005 |
| NFR-001 | Non-functional | Path to 5,000 concurrent users with stateless API, pagination, indexes, horizontal scaling | P1 | Architecture | task-013 | TC-PERF-001 |
| NFR-002 | Non-functional | Primary pages target <=3s p95 under MVP data sizes | P1 | Frontend/API | task-011/task-013 | TC-PERF-002 |
| NFR-003 | Non-functional | 99.9% production uptime target subject to provider tier | P1 | Operations | task-012/task-013 | TC-OPS-002 |
| NFR-004 | Non-functional | Daily backups and PITR where supported | P0 | Operations | task-012 | TC-BACKUP-001 |
| UI-001 | UI | Responsive desktop-first WCAG 2.1 AA dashboards using Tailwind/shadcn | P0 | Frontend | task-006/task-007 | TC-UI-001 |

Status starts as `Accepted` for confirmed MVP items and `Deferred` for explicitly deferred version 1 items. Codex should update status only when implementation and tests exist. Requirement IDs use FR, NFR, SEC, DATA, INT, and UI prefixes as requested.
