# Task 013: MCP Server and Access Tokens

## Goal
Users create access tokens in Settings and connect Claude, Cursor or any MCP client. Through the MCP tools they can push conversations and Figma designs into a project, run the whole flow, and let a coding agent read the finished pack.

## Context
`31` (the whole spec: architecture, the 17 tools with their descriptions, nextStep table, tokens, connect snippets), `10` (token endpoints, bearer auth principle), `12` (access tokens row), `13` (T11), `11` (Settings screen).

## Requirements Covered
FR-035, FR-036, FR-037, FR-038.

## Dependencies
task-012.

## Files and Areas
- `packages/db` schema: the `ApiToken` model from `09`, plus a new migration `api_tokens`
- `apps/web/src/server/auth.ts` (bearer support), `apps/web/src/server/tokens.ts`, `app/api/v1/tokens/**`
- `app/settings/page.tsx`
- new `apps/mcp/*` (see `25`)

## Steps
1. Add the `ApiToken` model and the `User.apiTokens` relation exactly as in `09`. Run `pnpm db:migrate --name api_tokens`.
2. Web auth:
   - `requireUser` checks the cookie first, then `Authorization: Bearer bp_…`, looking up by `sha256` with `revokedAt: null`; throttled `lastUsedAt` update
   - return the auth method (`'cookie' | 'bearer'`) so `assertOrigin` is skipped only for bearer requests with no cookie
   - add `requireCookieUser` for the token endpoints
3. `tokens.ts` and routes: list, create (limit 10 → 422 `TOKEN_LIMIT`; return the raw token once), revoke (own tokens only, otherwise 404).
4. Settings page per `11`: list, a create dialog showing the token once with Copy, Revoke with confirm, and the two connect snippets from `31` filled with the token and `MCP_PUBLIC_URL`. Add a Settings link to the top bar.
5. `apps/mcp`:
   - `package.json` named `@blueprint/mcp`, with dependencies `@modelcontextprotocol/sdk` 1.x and `zod`; scripts `dev: tsx watch src/index.ts`, `start: tsx src/index.ts`, `test: vitest run`
   - `src/api.ts`: `createApi(baseUrl, bearer, fetchImpl)` → `call(method, path, body?)`, which returns the parsed JSON or throws `ToolError(code, message)` from the API error body; network failure → `API_UNREACHABLE`
   - `src/tools.ts`: `registerTools(server, api)` registers the 17 tools from `31` with **verbatim descriptions** and Zod input shapes. Each handler calls the API and returns `{ content: [{ type: 'text', text }] }`, or `isError: true` on a `ToolError`. `get_project_status` merges the project and the latest run, and adds `nextStep`. `list_open_questions` filters to open questions. JSON results are capped at 100,000 chars
   - `src/index.ts`:
     - a `node:http` server on `MCP_PORT`
     - `GET /health` → `ok`
     - `POST /mcp` without `Authorization: Bearer bp_` → 401 JSON
     - otherwise read the JSON body, create `new McpServer({ name: 'villa-blueprint', version: '0.1.0' })`, `registerTools(server, createApi(API_URL, bearer, fetch))`, then `new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })`, `await server.connect(transport)`, `await transport.handleRequest(req, res, body)`
     - on `res` close, call `transport.close()` and `server.close()`
     - other methods and paths → 405 or 404
     - graceful shutdown on SIGTERM
     - the log line from `18`
6. Add mcp to the root `dev` script and `.env.example` (`MCP_PORT`, `API_URL`, `MCP_PUBLIC_URL`).

## Tests Required
- API: token create, list and revoke; bearer auth on `GET /me`; a revoked token → 401; an 11th → 422; token endpoints reject bearer auth; a bearer POST without Origin is accepted; a cookie POST without Origin is still 403 (AC-17).
- MCP: the cases listed under "MCP (apps/mcp)" in `16`.
- DOM: the Settings create dialog shows the token once, and closing it hides the token.

## Acceptance Criteria
AC-17. The MCP integration tests pass. Manually, with `pnpm dev`: create a token, run the Claude Code command from Settings, then in Claude ask "list my Blueprint projects", and it works.

## Verification Commands
```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Stop Conditions
The installed `@modelcontextprotocol/sdk` lacks `McpServer` or `StreamableHTTPServerTransport` at the paths above. Report the installed version and its exports, and do not hand-roll the protocol.
