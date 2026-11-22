# Task 003: Authentication and the API Foundation

## Goal
The handler wrapper, error model and env validation, plus signup, login, logout, me and health, fully tested.

## Context
`10` (principles, errors, auth endpoints), `12` (all of it), `13` (T2–T4, headers, logging), `19` (route handler rules).

## Requirements Covered
FR-001, FR-002, FR-003.

## Dependencies
task-002.

## Files and Areas
- `packages/core/src/errors.ts`
- `apps/web/src/server/{env,http,logger,auth}.ts`
- `apps/web/src/app/api/v1/{health,auth/signup,auth/login,auth/logout,me}/route.ts`
- `apps/web/next.config.ts` (security headers)
- `apps/web/tests/api/*`

## Steps
1. `errors.ts`:
   - `AppError(code, status, message, details?)`
   - subclasses `ValidationError` 400, `UnauthenticatedError` 401, `InvalidCredentialsError` 401, `BadOriginError` 403, `NotFoundError` 404, `ConflictError` 409 (code given), `InvalidStateError` 409, `PayloadTooLargeError` 413, `UnprocessableError` 422 (code given), `RateLimitedError` 429
2. `env.ts`: a Zod schema over `process.env` from `17`; throw with the list of missing names.
3. `logger.ts`: pino with the redaction paths from `18`.
4. `http.ts`:
   - `handle(fn)` generates a `requestId` (`req_` + 12 random hex), runs `fn`, maps `AppError` and `ZodError` to the error format in `10`, maps everything else to 500 `INTERNAL`, sets `x-request-id`, and logs one line
   - a `parseJson(req, schema)` helper
   - `assertOrigin(req)` on POST, PATCH and DELETE
   - `readCookie(req, name)`
5. `auth.ts`:
   - `signup`, `login` (rate limit and timing-equal compare), `logout`
   - `getSessionUser(req)`, `requireUser(req)`
   - `setSessionCookie(res, token)`, `clearSessionCookie(res)`
   - all exactly as in `12`
6. Route handlers per `10`.
7. Security headers in `next.config.ts` per `13`.

## Tests Required
In `apps/web/tests/api`. Call the handlers directly: `POST(new Request(url, { method, headers: { origin: APP_URL, cookie }, body }))`.
- signup success sets the cookie; duplicate email → 409 `EMAIL_TAKEN`; short password → 400 with details
- login success; wrong password and unknown email return identical bodies → 401; the 11th failure → 429; success clears the attempts
- `me` with a valid cookie → 200, with an expired session → 401, which also deletes the session
- logout deletes the session
- a mutation without Origin → 403 `BAD_ORIGIN`
- health → `{ status: 'ok', db: true }`
- a logger test: logging an object with password, token and cookie outputs `[Redacted]` (NFR-011)

## Acceptance Criteria
AC-01 and AC-02 at the API level. All checks pass.

## Verification Commands
```bash
pnpm lint && pnpm typecheck && pnpm test
```

## Stop Conditions
None expected.
