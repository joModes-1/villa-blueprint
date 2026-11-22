# Test Plan and Quality Strategy

## Strategy
Write tests alongside implementation. Target about 80% coverage for backend/core domain logic. Critical flows get Playwright E2E. Provider interactions use sandbox or verified fixtures/mocks.

| Test ID | Requirement | Scenario | Expected | Priority | Automation |
|---|---|---|---|---|---|
| TC-AUTH-001 | FR-001 | Register company | Pending company + verification email | P0 | API/E2E |
| TC-AUTH-002 | FR-002 | Verify/login/reset | Secure session/reset flow | P0 | API |
| TC-RBAC-001 | SEC-002 | Cross-company access | 403 and no data leak | P0 | API |
| TC-PKG-001 | FR-005 | Package CRUD | Own package only, audit events | P0 | API/E2E |
| TC-PKG-002 | FR-006 | Publish validation | Missing required fields blocked | P0 | API/UI |
| TC-SEARCH-001 | FR-007 | Package filters | Correct paginated results | P0 | API/E2E |
| TC-BOOK-001 | FR-010 | Submit booking | pending_operator_approval | P0 | API/E2E |
| TC-BOOK-002 | FR-011 | Operator approval | valid transition/invoice | P0 | API |
| TC-PAY-001 | FR-014 | Checkout/webhook | paid/confirmed idempotently | P0 | API |
| TC-DOC-001 | FR-019/SEC-005 | Private document | signed URL only for authorized user | P0 | API |
| TC-DASH-001 | FR-017 | Dashboard scope | metrics limited by role/company | P0 | API/E2E |
| TC-UI-001 | UI-001 | Accessibility smoke | no critical axe violations | P0 | Automated |
| TC-BACKUP-001 | NFR-004 | Restore drill | staging restore succeeds | P0 | Manual/Ops |

CI should run install, lint, typecheck, unit, integration, build, and E2E smoke where possible. UAT should verify the complete booking/payment path with sandbox providers before production.
