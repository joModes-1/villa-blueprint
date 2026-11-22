# Non-Functional Requirements

| ID | Category | Requirement | Rationale | Target | Verification |
|---|---|---|---|---|---|
| NFR-001 | Performance | Primary pages and common APIs must be fast. | Booking/search UX depends on responsiveness. | Page p95 <=3s; common API p95 <=500ms under MVP data. | Lighthouse, Playwright, API/load tests. |
| NFR-002 | Scalability | Support path to 5,000 concurrent users. | SRS target. | Stateless API, pagination, indexes, pool controls, horizontal scaling-ready. | Load test and architecture review. |
| NFR-003 | Security | Protect auth, tenant data, payments, documents. | Sensitive PII/financial domain. | No P0/P1 findings at launch. | Security tests/review. |
| NFR-004 | Reliability | Production target 99.9%. | SRS target. | Provider tier must support target; health checks. | Uptime monitoring. |
| NFR-005 | Backup/Recovery | Recover critical data. | Bookings/finance records are business-critical. | Daily backups + PITR where available; restore drill. | Backup logs and staging restore. |
| NFR-006 | Maintainability | Code modular and tested. | Codex/human long-term work. | Clear modules, 80% backend/core coverage. | CI and review checklist. |
| NFR-007 | Observability | Detect incidents quickly. | Payment/booking failures affect trust. | Sentry, structured logs, health endpoints, provider metrics. | Alert tests/log review. |
| NFR-008 | Accessibility | Core UI usable by disabled users. | Production baseline. | WCAG 2.1 AA for MVP flows. | axe/Playwright/manual QA. |
| NFR-009 | Compatibility | Modern browser support. | SRS support. | Latest two Chrome/Firefox/Safari/Edge. | Cross-browser smoke. |
| NFR-010 | Data integrity | Booking/payment states consistent. | Prevent disputes. | DB constraints, transactions, idempotency. | Integration tests. |
| NFR-011 | Error handling | Errors safe and actionable. | Avoid data leaks and bad UX. | Standard error shape; no stack traces/secrets. | API tests/log review. |
| NFR-012 | Localization readiness | English MVP with future i18n. | Tourism can expand. | Centralized app strings where practical. | Code review. |
| NFR-013 | Usability | Forms guide users through dense B2B workflows. | Reduce support burden. | Inline validation, clear CTAs, empty/loading/error states. | UAT and E2E tests. |
| NFR-014 | API versioning | Future mobile/integration clients should not break. | Scalability of integrations. | `/api/v1`, backward-compatible changes by default. | API review. |
