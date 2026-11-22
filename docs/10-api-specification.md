# API Specification

## API Design Principles

- Base path `/api/v1`, implemented as Next.js route handlers in `apps/web/src/app/api/v1/**/route.ts`.
- JSON in and out, except source uploads (`multipart/form-data`) and export (`application/zip`).
- Auth: the `bp_session` cookie. `requireUser(req)` resolves the user or throws `401 UNAUTHENTICATED`. Alternatively, `Authorization: Bearer bp_…` (a personal access token, see `31`). Token management endpoints accept only the cookie.
- Ownership: every `/projects/:id/**` route loads the project with `where: { id, userId, deletedAt: null }`. A project that is not found or belongs to someone else returns `404 NOT_FOUND`, never `403`, so IDs leak nothing.
- Mutations (`POST`, `PATCH`, `DELETE`) must carry an `Origin` header equal to `APP_URL`, else `403 BAD_ORIGIN`. Exception: requests authenticated by a bearer token with no cookie skip this check, because CSRF needs a cookie.
- Every body is parsed with a Zod schema. A failure returns `400 VALIDATION_ERROR` with `details`.
- Every response carries an `x-request-id` header. Errors include the same `requestId`.
- Handlers stay thin: parse, authorize, call a service in `apps/web/src/server/`, return.
- Lists are short, so there is no pagination in the MVP.

## Error Format

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "One or more fields are invalid.", "details": [{ "field": "email", "message": "Enter a valid email address." }], "requestId": "req_8f2c…" } }
```

| HTTP | code | When |
|---|---|---|
| 400 | VALIDATION_ERROR | body or query fails its schema |
| 401 | UNAUTHENTICATED | no or expired session |
| 401 | INVALID_CREDENTIALS | wrong email or password (same message for both) |
| 403 | BAD_ORIGIN | mutation without a matching Origin |
| 404 | NOT_FOUND | missing or not owned |
| 409 | EMAIL_TAKEN | signup with an existing email |
| 409 | INVALID_STATE | action not allowed in the project's status (message names the status) |
| 413 | FILE_TOO_LARGE | upload over 10 MB |
| 422 | SOURCE_LIMIT | more than 20 sources |
| 422 | LEDGER_INCOMPLETE | generate with P0 keys empty (`details` = missing keys with areas) |
| 422 | BUDGET_EXCEEDED | token budget would be exceeded |
| 422 | EXPORT_BLOCKED | export with open blockers |
| 422 | FIGMA_URL_INVALID / FIGMA_TOKEN_INVALID / FIGMA_FILE_NOT_FOUND | Figma source could not be fetched |
| 429 | RATE_LIMITED | too many login attempts |
| 422 | TOKEN_LIMIT | an 11th active access token |
| 500 | INTERNAL | unexpected; message is generic, details logged |

## Endpoints

| Method | Path | Purpose | Access |
|---|---|---|---|
| GET | /api/v1/health | Liveness and DB check: `{ status: "ok", db: true }` | public |
| POST | /api/v1/auth/signup | `{ name, email, password(min 10) }` → creates user, sets cookie, `201 { user }` | public |
| POST | /api/v1/auth/login | `{ email, password }` → sets cookie, `{ user }`; 10 failures per 15 min per email+IP → 429 | public, rate-limited |
| POST | /api/v1/auth/logout | Deletes the session and clears the cookie, `204` | authenticated |
| GET | /api/v1/me | `{ user: { id, email, name } }` | authenticated |
| GET | /api/v1/tokens | `{ items: { id, name, prefix, lastUsedAt, createdAt }[] }` (active only) | authenticated, cookie only |
| POST | /api/v1/tokens | `{ name(1–60) }` → `201 { token, item }`; `token` is returned only here | authenticated, cookie only |
| DELETE | /api/v1/tokens/:tokenId | Revokes (sets `revokedAt`), `204` | authenticated, cookie only, own tokens |
| GET | /api/v1/projects | `{ items: ProjectSummary[] }`, newest first | owner |
| POST | /api/v1/projects | `{ name(1–80), mode? }` → creates the project and all ledger rows, `201 { project }` | authenticated |
| GET | /api/v1/projects/:id | `{ project, counts: { sources, facts, openQuestions, documents, openBlockers }, latestRun }` | owner |
| PATCH | /api/v1/projects/:id | `{ name?, mode? }` (mode only in draft/interviewing) | owner |
| DELETE | /api/v1/projects/:id | Soft delete, `204` | owner |
| GET | /api/v1/projects/:id/sources | `{ items: SourceView[] }` (no `raw`, text cut to 500 chars) | owner |
| POST | /api/v1/projects/:id/sources | Multipart `file` + optional `title`, **or** JSON `{ kind: "text"\|"markdown", title, text(1–200000) }`, **or** JSON `{ kind: "figma", url, token }` → `201 { source }` | owner |
| DELETE | /api/v1/projects/:id/sources/:sourceId | Deletes the source and its facts, `204` | owner |
| POST | /api/v1/projects/:id/analyze | Starts the process stage → `202 { run }` | owner |
| GET | /api/v1/projects/:id/facts | `{ items: Fact[] }` grouped client-side by category | owner |
| GET | /api/v1/projects/:id/questions | `{ items: Question[] }`, open first | owner |
| POST | /api/v1/projects/:id/questions/:qid/answer | `{ answer(1–2000) }` → `{ question, decision, project }` | owner |
| POST | /api/v1/projects/:id/questions/:qid/skip | → `{ question, project }` | owner |
| POST | /api/v1/projects/:id/questions/accept-recommended | → `{ answered: number, project }` | owner |
| GET | /api/v1/projects/:id/decisions | `{ items: DecisionView[] }` in catalog order; each has key, area, category, priority, value, status, rationale, version | owner |
| PATCH | /api/v1/projects/:id/decisions/:key | `{ value(0–2000), status }` → `{ decision, staleDocuments: string[], project }` | owner |
| GET | /api/v1/projects/:id/estimate | `{ aiCalls, tokens }` from `estimateGeneration` | owner |
| POST | /api/v1/projects/:id/generate | Starts or resumes generation → `202 { run }` | owner |
| GET | /api/v1/projects/:id/documents | `{ items: { path, title, status, writer, updatedAt }[] }` in `PACK_SPEC` order (excludes `internal/`) | owner |
| GET | /api/v1/projects/:id/documents/content?path=… | `{ path, title, content, status }` | owner |
| GET | /api/v1/projects/:id/findings | `{ items: GateFinding[] }`, blockers first | owner |
| POST | /api/v1/projects/:id/findings/:fid/accept | `{ reason(3–500) }` → `{ finding, project }` | owner |
| GET | /api/v1/projects/:id/runs/latest | `{ run }` or `{ run: null }`; polled by the UI | owner |
| POST | /api/v1/projects/:id/retry | Re-enqueues the failed run's items → `202 { run }` | owner |
| GET | /api/v1/projects/:id/usage | `{ tokensIn, tokensOut, costUsd, byTag: {…} }` | owner |
| GET | /api/v1/projects/:id/export | Streams `<slug>.zip` (`Content-Disposition: attachment`) | owner |

## Upload rules

- Multipart upload infers `kind` from the extension: `.md` → markdown, `.txt` → text, `.json` → chat_export, `.pdf` → pdf, `.docx` → docx. Anything else returns `400 VALIDATION_ERROR` with "Unsupported file type".
- Before saving, check the file size against the 10 MB limit and the project's source count against 20.
- A Figma source is fetched during this request with `fetchFigma` (see `27`). The extracted text is saved as `Source.text`, with `raw = null`. The token is discarded after the fetch: never saved, queued or logged. Figma errors return `422` with code `FIGMA_URL_INVALID`, `FIGMA_TOKEN_INVALID` or `FIGMA_FILE_NOT_FOUND`.
- Adding a source sets `status: pending`. Nothing is parsed until `analyze`.

## Shared response types

Define these as Zod schemas plus inferred types in `packages/core/src/api-types.ts`. The web client imports them too.

```ts
ProjectSummary = { id, name, mode, status, updatedAt, counts: { documents, openBlockers } }
SourceView     = { id, kind, title, originalName, sizeBytes, status, error, preview, createdAt }
Fact           = { id, sourceId, category, statement, quote, confidence }
Question       = { id, key, area, prompt, why, options: string[], recommended, status, answer }
DecisionView   = { key, area, category, priority, value, status, rationale, version }
Run            = { id, stage, status, total, done, error, createdAt, finishedAt }
GateFinding    = { id, rule, severity, documentPath, message, status, acceptReason }
```
