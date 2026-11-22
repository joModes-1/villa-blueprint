# Layer 4 — Domain & Data Guide: Domain Model and Database Design

These two documents define the data structures the system operates on. The domain model is conceptual — it defines the nouns, their relationships, and their behavior. The database design is physical — it defines the exact tables, columns, types, indexes, and constraints. You write the domain model first, then derive the database design from it. Never the other way around.

---

## Document 1: Domain Model & Glossary

### What It Is
A precise description of every business object (entity) in the system, its attributes, the states it can be in, how it transitions between states, and the important things that happen (events). Plus a glossary of terms that everyone on the project must use consistently.

### Why It Exists
Without a domain model, the same concept gets different names in different parts of the codebase: what the frontend calls a "trip" the backend calls a "booking" the database calls a "reservation". This fragmentation causes bugs, missed requirements, and miscommunication. The domain model is the shared vocabulary.

More importantly, state machines (which states can an entity be in, and what are the rules for transitions) are the single most error-prone part of any CRUD application. Defining them before writing code prevents a class of bugs that are very hard to debug after the fact.

### How to Write It

**Step 1: Extract All Entities**
Go through the PRD workflows and pull out every noun. These are your entities.

Method: take your primary workflow statement and underline every noun:
```
"Agency submits booking request → operator approves booking → invoice generated → 
agency pays invoice → webhook confirms payment → booking confirmed"
```
Nouns: Agency (Company), Booking, Booking Request, Operator (Company), Invoice, Payment, Webhook

Then for each noun ask: does this need its own table? Does it have multiple states or attributes? If yes, it's an entity.

**Step 2: Define Each Entity**
For each entity, capture:
- Purpose (one sentence)
- Key attributes (the most important fields)
- State machine (if the entity has states)
- Ownership/scope (which company owns this record?)
- Relationships (what other entities is it connected to?)

Entity Template:
```
### [Entity Name]

**Purpose**: [one sentence]
**Owned by**: [which company type, or platform-level]
**Key fields**: [list the most important fields, not necessarily all of them]
**States**: [list of valid states, if applicable]
**Relationships**:
  - belongs to [Entity] (via [field])
  - has many [Entity]
```

**Step 3: Draw State Machines**
For any entity with states, draw the state machine. This is the most important step.

State machine format:
```
[state A] --[trigger / guard / actor]--> [state B]
```

Rules for state machines:
- Every transition must have: a trigger (what event causes it), a guard (what must be true), and an actor (who or what performs the transition)
- Invalid transitions must be explicitly rejected (not silently ignored)
- Final states must be clearly marked
- Side effects must be documented (what else happens when this transition occurs?)

**Tourism Project State Machine Examples:**

Company State Machine:
```
draft → submitted [actor: owner; guard: required fields complete]
submitted → pending_review [actor: system; guard: email verified]
pending_review → approved [actor: admin; guard: review complete]
pending_review → rejected [actor: admin; guard: review complete]
approved → suspended [actor: admin; guard: compliance issue]
suspended → approved [actor: admin; guard: issue resolved]
```

Booking State Machine (the most complex):
```
draft → submitted [actor: agency; guard: package available, company approved]
submitted → pending_operator_approval [actor: system; guard: submitted]
pending_operator_approval → approved [actor: operator; guard: availability confirmed]
  → side effect: invoice generated, agency notified
pending_operator_approval → rejected [actor: operator; guard: unavailable/declined]
  → side effect: agency notified
approved → payment_pending [actor: system; guard: checkout initiated]
payment_pending → paid [actor: system/webhook; guard: payment webhook verified]
  → side effect: booking confirmed, invoice marked paid, commission accrued
paid → confirmed [actor: system; guard: payment succeeded]
  → side effect: both parties notified
confirmed → completed [actor: agency or operator; guard: travel dates passed]
any active state → cancelled [actor: agency or operator or admin; guard: cancellation rules met]
cancelled → refund_requested [actor: agency or admin; guard: refund eligible]
refund_requested → refunded [actor: system/webhook; guard: provider refund confirmed]
```

**Step 4: Identify Domain Events**
Domain events are the important things that happen in the system. Each event:
- Has a name (always past tense: "BookingApproved", not "ApproveBooking")
- Triggers one or more side effects (notifications, audit logs, invoice generation)
- Can be used to reconstruct what happened to any entity

List all events for the system:
```
Auth events: UserRegistered, EmailVerified, UserLoggedIn, PasswordReset, MFAEnabled
Company events: CompanyRegistered, CompanyApproved, CompanyRejected, CompanySuspended
Package events: PackageCreated, PackageDraft, PackagePublished, PackageArchived
Booking events: BookingSubmitted, BookingApproved, BookingRejected, BookingCancelled, BookingConfirmed, BookingCompleted
Payment events: PaymentCheckoutStarted, PaymentSucceeded, PaymentFailed, RefundRequested, RefundApproved, RefundCompleted
Document events: DocumentUploaded, DocumentDownloaded
Admin events: SettingsChanged
```

**Step 5: Write the Glossary**
Every technical or business term that might be ambiguous gets a definition. If two people on the team might mean different things by the same word, it goes in the glossary.

Glossary format:
```
**[Term]**: [precise definition]. Not to be confused with [similar term].
```

Essential terms to define for any project:
- Every entity name
- Every state name
- Any technical term an AI agent or new developer might misunderstand
- Any business term with a non-obvious meaning

Example from tourism:
```
**Hosted checkout**: A payment flow where the payer is redirected to the payment provider's 
own page to enter card details. The platform never sees raw card numbers. Required for 
PCI compliance.

**Tenant scope**: The principle that all database queries for business records 
include a companyId filter. A user from Company A cannot access Company B's records.

**Signed URL**: A time-limited URL that proves the possessor has permission to 
access a private R2 object. Generated server-side after RBAC check. Expires in 
minutes, not days.

**Idempotency**: A duplicate operation produces the same result as the first 
operation, without side effects being repeated. Critical for webhook processing — 
a payment webhook received twice does not trigger two payments.
```

---

## Document 2: Database Design

### What It Is
The physical database schema — tables, columns, types, constraints, indexes, and the rules for managing schema changes (migrations). Derived directly from the domain model.

### Why It Exists
Database design mistakes are the most expensive mistakes in software. Adding a missing column is cheap. Removing an incorrect column that already has production data requires a migration, a data transformation, and a deployment window. Getting the design right before writing code prevents this class of problem.

### How to Write It

**Section 1: Database Design Principles**
State the rules that apply to every table before listing any table.

Standard principles for a business application:
```
1. Primary keys: UUID (v4) or ULID for all tables — never auto-increment integers
   Why: UUIDs are safe to generate client-side, don't leak record counts, are safe in distributed systems

2. Timestamps: every table has created_at and updated_at (auto-managed)
   Why: required for debugging, auditing, and time-based queries

3. Soft delete: business records use deleted_at instead of DELETE
   Why: financial records and audit trails must be preserved; physical deletion loses history
   Exception: sessions, tokens, and temporary records use physical delete

4. Money: DECIMAL(19,4) for all monetary amounts — never FLOAT
   Why: floating point cannot represent exact decimal values; 0.1 + 0.2 ≠ 0.3 in floats

5. Foreign keys: explicit FK constraints with defined ON DELETE behavior
   Why: database enforces referential integrity; prevents orphaned records

6. Status/state: ENUM or VARCHAR with a CHECK constraint — never unconstrained string
   Why: prevents invalid states from entering the database

7. Tenant scoping: every business entity table has a company_id FK
   Why: enables row-level security enforcement at the query level

8. Sensitive data: hash passwords with bcrypt; never store plaintext secrets in DB columns
   Why: database breaches expose data directly; hashing limits impact
```

**Section 2: Table Definitions**
For each entity, define:
- Table name (snake_case)
- Column name, type, constraints, notes
- Relationships (FKs)
- Important constraints (UNIQUE, CHECK)

Format:
```
### [table_name]

| Column | Type | Constraint | Notes |
|---|---|---|---|
| id | UUID | PK | Generated as uuid_generate_v4() |
| [field] | [type] | [NOT NULL / NULLABLE] | [any important note] |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| deleted_at | TIMESTAMPTZ | NULLABLE | null = not deleted (soft delete) |

Indexes: [list every index and why it exists]
FKs: [list every FK relationship]
```

**Real example from tourism project:**
```
### bookings

| Column | Type | Constraint | Notes |
|---|---|---|---|
| id | UUID | PK | |
| agency_company_id | UUID | FK → companies | The booking agency |
| operator_company_id | UUID | FK → companies | The package operator |
| package_id | UUID | FK → tour_packages | |
| client_id | UUID | FK → clients | The lead client |
| status | ENUM | NOT NULL | draft/submitted/pending_operator_approval/approved/payment_pending/paid/confirmed/completed/cancelled/rejected/refund_requested/refunded |
| travel_start_date | DATE | NOT NULL | |
| travel_end_date | DATE | NOT NULL | |
| special_requests | TEXT | NULLABLE | |
| cancellation_reason | TEXT | NULLABLE | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |
| deleted_at | TIMESTAMPTZ | NULLABLE | Soft delete |

Indexes:
  - (agency_company_id, status, created_at) — agency booking list queries
  - (operator_company_id, status, travel_start_date) — operator booking queue
  - (package_id, status) — availability/capacity queries
```

**Section 3: Critical Tables List**
Document every table and its one-line purpose, organized by domain.

Example organization:
```
Authentication: users, auth_sessions, auth_tokens, mfa_factors
Companies: companies, company_memberships, roles, permissions
Packages: tour_packages, package_itinerary_items, package_availability, package_pricing, package_media
Bookings: bookings, booking_status_events, favorite_packages
Finance: invoices, invoice_items, payments, payment_webhook_events, refunds, commissions, payouts
Clients: clients, travelers
Documents: documents
Notifications: notifications, email_events
Admin: audit_logs, platform_settings
Reviews: reviews
```

**Section 4: Index Strategy**
Indexes are not optional — they are correctness for production performance. Define them upfront.

Rules for indexing:
- Every foreign key should have an index (DB won't create one automatically in PostgreSQL)
- Every column used in WHERE clauses on large tables needs an index
- Every column used in ORDER BY on large tables needs an index
- Composite indexes: column order matters — most selective column first, then range column
- Don't index columns with very low cardinality (boolean, tiny enums) — they're often worse than a table scan

Critical indexes for most business apps:
```
users: (email) UNIQUE
companies: (type, approval_status) — admin approval queue
bookings: (agency_company_id, status, created_at), (operator_company_id, status)
payments: (provider, provider_reference) UNIQUE — idempotency
audit_logs: (company_id, created_at, action) — audit query
documents: (company_id, related_type, related_id) — document lookup
```

**Section 5: Migration Rules**
The rules for managing schema changes over time.

```
1. Schema changes happen through migrations only — never edit the database directly in any environment
2. Migrations run in transactions — if a migration fails, it rolls back completely
3. Applied migrations are never edited — if you made a mistake, write a new migration that fixes it
4. Migrations must be backwards compatible where possible — add new columns before dropping old ones
5. Dropping a column requires: deprecate in code first → deploy → write migration → deploy
6. Run migrations before deploying new application code (so old code can still read new schema)
7. Test migrations in staging with production-like data volumes before running in production
```

**Section 6: Data Relationships Diagram**
At minimum, list the key relationships as a text ERD:

```
users (1) ──< company_memberships >── (1) companies
companies (1) ──< tour_packages (many)
tour_packages (1) ──< bookings (many)
bookings (1) ──< invoices (1)
invoices (1) ──< payments (many)
payments (1) ──< refunds (many)
bookings (1) ──< booking_status_events (many)
companies (1) ──< documents (many)
```

### Common Database Design Mistakes

**Using auto-increment IDs**
Auto-increment IDs leak record counts ("my booking ID is 14" reveals you have few bookings). They also create issues in distributed systems. Use UUIDs.

**Using FLOAT for money**
Float arithmetic is imprecise. `0.1 + 0.2 = 0.30000000000000004` in floating point. Financial calculations require exact decimal arithmetic. Use DECIMAL(19,4).

**Storing computed values**
Don't store `invoice_total` if it can be computed from `sum(invoice_items.amount)`. Computed values get out of sync. Exception: denormalize only when performance measurement proves it's necessary.

**Missing soft deletes**
Hard-deleting a booking or payment removes history. Use `deleted_at` nullable timestamp for all business records. Filter by `deleted_at IS NULL` in queries.

**Missing tenant scope columns**
Every table that holds company-specific data needs `company_id`. Without it, tenant isolation must be enforced in application code only — a much harder guarantee to maintain.

**No index on FK columns**
PostgreSQL doesn't automatically create indexes on foreign key columns. A query like "show all bookings for this company" does a full table scan without an index on `company_id`.

**States as unconstrained strings**
`booking.status = 'aprroved'` (typo) will happily save to the database if status is an unconstrained VARCHAR. Use ENUMs or CHECK constraints to enforce valid state values at the database level.
