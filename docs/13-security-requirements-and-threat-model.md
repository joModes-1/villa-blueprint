# Security Requirements and Threat Model

## Threats

| ID | Threat | Asset | Likelihood | Impact |
|---|---|---|---|---|
| T1 | Another user reads or changes my project by guessing IDs | sources, docs | medium | high |
| T2 | Credential stuffing or brute-force login | accounts | medium | high |
| T3 | Session theft through XSS | sessions | low | high |
| T4 | CSRF triggers mutations from another site | projects | low | medium |
| T5 | Prompt injection inside an uploaded source changes pipeline behavior or leaks other data | pack integrity | high | medium |
| T6 | Malicious or huge upload (zip bomb, giant PDF) exhausts memory or CPU | worker | medium | medium |
| T7 | Figma token leaks through the DB or logs | user's Figma | low | high |
| T8 | Runaway AI spend | money | medium | high |
| T9 | Secrets committed or logged | infra | low | high |
| T10 | Rendered markdown injects scripts | browser | low | high |
| T11 | A leaked access token gives API and MCP access | projects | medium | high |

## Controls

| Threat | Control | Where |
|---|---|---|
| T1 | Owner-scoped queries everywhere; 404 for non-owners; child lookups go through the owned project | `12`, `apps/web/src/server/projects.ts` |
| T2 | Rate limit of 10 failures per 15 min per email+IP; bcrypt cost 12; generic error message; timing-equal compare | `apps/web/src/server/auth.ts` |
| T3 | HttpOnly cookie; no `dangerouslySetInnerHTML`; CSP header | `next.config.ts` headers |
| T4 | `SameSite=Lax` plus a required `Origin === APP_URL` check on every mutation | `apps/web/src/server/http.ts` |
| T5 | System prompts state that sources are data; every AI response is Zod-validated; facts need verbatim quotes; decisions need valid fact IDs; AI never sees another project's data; AI output never runs as code | `27`, core pipeline |
| T6 | 10 MB per upload checked before reading the body into memory; 20 sources; 400k characters per project; parsers run in the worker; Figma output capped at 60k | API and worker |
| T7 | Figma is fetched inside the `POST /sources` request and the token is discarded right after: never in the DB, the job queue or logs; redacted by the logger as a backstop | web `sources.ts`, logger |
| T8 | `MAX_TOKENS_PER_PROJECT` checked before each call; estimate shown before generation; `UsageEvent` for every call | core AI client |
| T9 | `.env` is git-ignored; `.env.example` holds placeholders only; pino `redact` for `token`, `password`, `authorization`, `cookie`, `OPENROUTER_API_KEY` | repo, logger |
| T10 | `react-markdown` without `rehype-raw` (raw HTML ignored) | Documents viewer |
| T11 | Tokens hashed at rest and shown once; revocable; cannot create more tokens; `lastUsedAt` visible; MCP app logs no arguments or tokens and has no DB access | `31`, web auth |

## Security headers

Set in `next.config.ts` for all routes:
- `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'`. In development, also allow `'unsafe-eval'` in `script-src`.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`

## Logging rules

- Never log request bodies, source text, prompts, AI responses, passwords, tokens or cookies.
- Log only IDs, counts, durations, codes and statuses.
