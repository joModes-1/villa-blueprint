# Authentication, Authorization, and Permissions

## Roles
Super Admin, Platform Staff/Admin, Accountant/Finance, Tour Operator Admin, Tour Operator Staff, Travel Agency Admin, Travel Agency Staff, Guest.

## Permission Matrix
| Action | Super Admin | Platform Staff | Finance | Operator Admin/Staff | Agency Admin/Staff | Guest |
|---|---:|---:|---:|---:|---:|---:|
| Register company | - | - | - | - | - | Yes |
| Approve/suspend companies | Yes | Yes | No | No | No | No |
| Manage platform settings | Yes | Limited | No | No | No | No |
| Manage own company/staff | Yes | Yes | No | Yes/admin-limited | Yes/admin-limited | No |
| Create/manage packages | Yes | Yes | No | Yes own | No | No |
| Browse marketplace | Yes | Yes | No | Preview | Yes | No |
| Manage clients/travelers | Yes | Yes | No | No | Yes own | No |
| Submit bookings | Yes | Yes | No | No | Yes own | No |
| Approve bookings | Yes | Yes | No | Yes own | No | No |
| Start payments | Yes | Yes | Yes | No | Yes approved bookings | No |
| Approve refunds | Yes | Limited | Yes | No | No | No |
| Upload/download documents | Yes | Yes | Finance docs | Own scope | Own scope | No |
| View audit logs | Yes | Limited | Finance scope | Own company limited | Own company limited | No |

## Flows
Clerk handles interactive sign-in, sign-up, email verification, password reset, session issuance, and MFA policy. The portal backend verifies Clerk session bearer tokens, maps `sub` to `users.clerk_user_id`, and loads company memberships, roles, permissions, and approval state from the local database. Company onboarding still creates a pending company and local authorization records; the local user must be linked to the Clerk user ID before protected portal access is granted. Admin approval is required before transactions.

## Session Strategy
Clerk session tokens are short-lived and sent to `/api/v1` as bearer tokens. The backend does not trust browser role claims for portal authorization; it resolves roles and permissions server-side on each protected request. Legacy first-party JWT helpers remain only for non-production test/local compatibility unless Clerk keys are not configured.

## MFA Strategy
Clerk should enforce MFA for privileged identities. Portal roles that require elevated access remain represented in local RBAC so backend permission checks and audit trails stay company-scoped.

## Enforcement
Every protected controller uses auth and permission guards. Every tenant query filters by company scope unless global permission is explicit. Frontend guards are UX only.
