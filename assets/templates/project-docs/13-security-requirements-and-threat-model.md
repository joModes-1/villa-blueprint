# Security Requirements and Threat Model

## Sensitive Assets

Passwords, refresh tokens, MFA secrets, recovery codes, passports, visas, emergency contacts, licenses, invoices, payments, refunds, payout data, R2 object keys, provider secrets, audit logs.

## Threat Table

| Threat                 | Impact                           | Likelihood | Mitigation                                                | Verification           |
| ---------------------- | -------------------------------- | ---------- | --------------------------------------------------------- | ---------------------- |
| Credential stuffing    | Account takeover                 | Medium     | Rate limits, strong hashing, MFA privileged roles         | Auth tests             |
| Cross-tenant IDOR      | Data breach                      | High       | Company-scoped services/guards                            | RBAC tests             |
| Document URL leakage   | Sensitive data exposure          | Medium     | Private R2, signed short-lived URLs, audit                | Document tests         |
| Webhook forgery        | False payment state              | Medium     | Signature verification, provider allowlists               | Webhook tests          |
| Duplicate webhook      | Double payment/refund processing | High       | Unique event IDs and transactions                         | Idempotency tests      |
| File upload abuse      | Malware/storage risk             | Medium     | MIME/size allowlists, private storage, scan-ready adapter | Upload tests           |
| SQL injection          | Data compromise                  | Low        | Prisma parameterization; raw SQL review                   | Code review            |
| Secrets in logs        | Provider compromise              | Medium     | Redaction and logging rules                               | Log review/secret scan |
| Excessive admin powers | Insider risk                     | Medium     | Least privilege, MFA, audit logs                          | Permission review      |

## Secure Coding Rules

Validate all inputs. Never hardcode secrets. Never log passwords/tokens/MFA/card/passport data. Enforce authorization server-side. Use Prisma/parameterized queries. Rate-limit sensitive endpoints. Hash passwords securely. Verify webhooks. Use HTTPS in production. Use signed URLs for private documents. Audit admin, auth, booking, financial, and document events.

## Security Acceptance Criteria

All P0 endpoints have auth/permission tests. MFA enforced for privileged roles. Login/password reset/webhook/upload endpoints rate-limited. Private documents accessible only through signed URLs after permission check. Payment success/refund state cannot be forged without valid webhook signature. Webhook signing secrets and document URL signing secrets must be configured per environment. CI includes dependency audit and secret scanning where practical.
