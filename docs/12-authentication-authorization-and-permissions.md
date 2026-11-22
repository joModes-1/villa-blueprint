# Authentication, Authorization and Permissions

## Authentication

| Item | Rule |
|---|---|
| Signup | `name` (1–80), `email` (valid, lower-cased, trimmed), `password` (10–200 chars). Hash with `bcryptjs` cost 12. Create the session immediately |
| Login | Find by lower-cased email, then `bcrypt.compare`. Unknown email and wrong password both return `401 INVALID_CREDENTIALS` with the same message, and run a dummy compare against a fixed hash so timing is equal |
| Rate limit | Before checking credentials, count `login_attempts` with `key = email|ip` from the last 15 minutes. At 10 or more, return `429 RATE_LIMITED`. Insert a row on each failure. Delete that key's rows on success |
| Session token | `crypto.randomBytes(32).toString('base64url')`. Store `sha256(token)` hex in `sessions.tokenHash`, with `expiresAt` = now + 30 days |
| Cookie | `bp_session=<token>`; `HttpOnly`; `SameSite=Lax`; `Path=/`; `Secure` when `NODE_ENV=production`; `Max-Age` 30 days |
| Resolve | `getSessionUser(req)` hashes the cookie, finds an unexpired session, and returns the user. Expired sessions are deleted when found |
| Logout | Delete the session row and send the cookie with `Max-Age=0` |
| Access tokens | `bp_` + 32 random bytes (base64url), shown once. Store `sha256` hex plus the first 10 characters as `prefix`. `requireUser` also accepts `Authorization: Bearer bp_…` (unknown or revoked → 401) and updates `lastUsedAt` at most every 5 minutes. Create, list and revoke require the cookie session. Max 10 active |
| IP | From `x-forwarded-for` (first entry), then `x-real-ip`, else `"unknown"` |

There is no password reset, email verification or MFA in the MVP (deferred; see `23`).

## Roles

| Role | Who | Can |
|---|---|---|
| Owner | the user who created a project | everything on that project |
| Anonymous | not signed in | health, signup, login, and the `/login` and `/signup` pages |

There are no shared projects and no admin role in the MVP.

## Permission Matrix

| Resource / action | Anonymous | Signed-in non-owner | Owner |
|---|---|---|---|
| Health, signup, login | ✓ | ✓ | ✓ |
| Me, logout, create project, list own projects | — | ✓ (self only) | ✓ |
| Create, list or revoke access tokens | — | cookie session only (self) | cookie session only |
| Read or modify a project and anything under it (sources, facts, questions, decisions, documents, findings, runs, usage, export) | — | 404 | ✓ |

Enforcement:
- `requireUser` runs in every non-public handler.
- `loadOwnedProject(id, userId)` runs in every `/projects/:id/**` handler, with the query `where: { id, userId, deletedAt: null }`.
- Child records are always looked up through the owned project, for example `where: { id: qid, projectId: project.id }`. Never by bare ID.
- The worker trusts only IDs from the queue, and re-reads the project's `userId` for `UsageEvent`.
