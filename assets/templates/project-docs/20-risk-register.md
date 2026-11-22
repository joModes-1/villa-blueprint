# Risk Register

| Risk ID | Risk | Category | Probability | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-001 | Stripe/Pesapal support constraints | Integration | Medium | High | Validate accounts/sandbox before payment build | PM/Tech Lead | Open |
| R-002 | Unknown tax/VAT rules | Compliance | Medium | Medium | Configurable settings; confirm before production | PM/Finance | Open |
| R-003 | Sensitive document exposure | Security | Medium | High | Private R2, signed URLs, RBAC, audit | Security/Backend | Design mitigated |
| R-004 | Cross-company data leak | Security | Medium | High | Tenant guards and tests | Backend | Design mitigated |
| R-005 | Booking/payment state inconsistency | Data | Medium | High | State machine, transactions, idempotency | Backend | Open |
| R-006 | Hosting tier cannot meet 5,000 users/99.9% | Ops | Medium | Medium | Load tests and provider tier review | DevOps | Open |
| R-007 | RBAC complexity delays MVP | Delivery | Medium | Medium | Seed fixed roles first | Tech Lead | Open |
| R-008 | Retention policy unclear | Compliance | High | Medium | Open question and configurable soft delete | PM/Security | Open |
| R-009 | Codex scope creep | Delivery | Medium | Medium | AGENTS rules and small tasks | Tech Lead | Mitigated |
| R-010 | Payment/refund policy unclear | Product/Finance | Medium | High | Define cancellation/refund cutoffs before MVP launch | PM/Finance | Open |
