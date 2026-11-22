# MCP Server Specification

## Purpose

Blueprint exposes an **MCP server** so users can drive it from the AI tools they already use: Claude Code, Claude Desktop, Cursor, or any MCP client that supports Streamable HTTP with custom headers.

- **Push in.** A user brainstorming in Claude says "send this conversation to my Blueprint project". To share designs, the user's client reads Figma with **its own** Figma connector, then sends the screens, components, texts and design tokens to Blueprint as a markdown source. Blueprint never integrates with Figma's MCP itself.
- **Drive the flow.** Analyze, answer questions, edit decisions, generate, and review gate findings, all from chat.
- **Pull out.** A coding agent (Claude Code, for example) lists and reads the pack files and writes them into a fresh repo, then follows `START-HERE.md`. There is no zip handling.

Blueprint as an MCP **client** that connects out to other servers is deferred (see `23`).

## Architecture

| Item | Decision |
|---|---|
| App | `apps/mcp`, a Node `http` server, run with `tsx` |
| SDK | `@modelcontextprotocol/sdk` 1.x: `McpServer` (`server/mcp.js`) and `StreamableHTTPServerTransport` (`server/streamableHttp.js`) |
| Mode | **Stateless.** For each `POST /mcp`, create a new `McpServer` and a transport with `sessionIdGenerator: undefined`, call `server.connect(transport)`, then `transport.handleRequest(req, res, body)`. Close both when the response ends. `GET` and `DELETE /mcp` return 405. `GET /health` returns `ok` |
| Data access | **Through the Blueprint REST API only.** The MCP app has no database access. Each tool calls `${API_URL}/api/v1/…`, forwarding the caller's `Authorization: Bearer <token>` header. All ownership, validation, state and limit rules therefore stay in one place (`10`) |
| Auth | The request must carry `Authorization: Bearer bp_…`, or the app answers HTTP 401 before MCP handling. The token is validated by the API on every tool call |
| Port | `MCP_PORT` (default 3102). The public URL shown to users is `MCP_PUBLIC_URL` (default `http://localhost:3102/mcp`) |
| Errors | An API error becomes a tool result with `isError: true` and text `<code>: <message>`. A network error becomes `isError: true` with `API_UNREACHABLE: …` |
| Results | Text content. Structured data is returned as pretty-printed JSON text, capped at 100,000 characters with a `…(truncated)` marker |
| Logging | One line per tool call: `{ tool, ms, ok }`. Never arguments, results or tokens |

## Tools

Register these with `server.registerTool(name, { title, description, inputSchema }, handler)`, where `inputSchema` is a Zod raw shape. Copy the descriptions verbatim. They are what the user's AI reads to decide when to call a tool.

| Tool | Input | API call | Description |
|---|---|---|---|
| `whoami` | — | GET /me | Show which Blueprint account this connection uses. |
| `list_projects` | — | GET /projects | List my Blueprint projects with their status. |
| `create_project` | `name` (1–80), `mode?` (`founder`\|`expert`) | POST /projects | Create a Blueprint project for a new product idea. Founder mode asks fewer questions. |
| `add_text_source` | `projectId`, `title` (1–120), `text` (1–200,000), `kind?` (`text`\|`markdown`, default `markdown`) | POST /projects/:id/sources | Add material about the idea: a brainstorm conversation, notes, requirements, or a design description. To share a Figma design, first read it with your Figma tools, then send the screens, components, visible texts and design tokens as markdown, with a title starting "Figma: ". Send long conversations whole; do not summarize them. |
| `add_figma_source` | `projectId`, `url`, `figmaToken` | POST /projects/:id/sources (kind figma) | Import a Figma file directly with a Figma personal access token. The token is used once and never stored. Prefer `add_text_source` when you can read Figma yourself. |
| `analyze_project` | `projectId` | POST /projects/:id/analyze | Extract facts from all new sources and find the decisions that are still open. Runs in the background: poll `get_project_status`. |
| `get_project_status` | `projectId` | GET /projects/:id and GET /projects/:id/runs/latest | Get the project status, counts, background progress, and the suggested next step. |
| `list_open_questions` | `projectId` | GET /projects/:id/questions (open only) | List the questions Blueprint still needs answered, with options and a recommended answer. |
| `answer_question` | `projectId`, `questionId`, `answer` (1–2000) | POST …/questions/:qid/answer | Answer one open question. |
| `accept_recommended_answers` | `projectId` | POST …/questions/accept-recommended | Accept the recommended answer for every open question. |
| `get_ledger` | `projectId` | GET …/decisions | Show every product decision: value, status and priority. |
| `set_decision` | `projectId`, `key`, `value` (0–2000), `status` (`confirmed`\|`assumed`\|`deferred`) | PATCH …/decisions/:key | Change a decision. Documents that depend on it become stale and need regenerating. |
| `generate_pack` | `projectId` | POST …/generate | Generate (or regenerate stale parts of) the build pack. Runs in the background: poll `get_project_status`. |
| `list_findings` | `projectId` | GET …/findings | List quality-gate findings. Blockers must be fixed (by changing decisions and regenerating) or accepted before the pack can be used. |
| `accept_finding` | `projectId`, `findingId`, `reason` (3–500) | POST …/findings/:fid/accept | Accept a finding with a reason. |
| `list_pack_files` | `projectId` | GET …/documents | List the files of the generated pack with their status. |
| `read_pack_file` | `projectId`, `path` | GET …/documents/content?path= | Read one pack file. To build the product: read every file from `list_pack_files`, write each to the same path in an empty repository, then follow `START-HERE.md`. |

`get_project_status` adds a `nextStep` string computed in the MCP app from the status:

| Status | nextStep |
|---|---|
| draft | Add sources, then call analyze_project |
| processing / generating / gating | Wait a few seconds and call get_project_status again |
| interviewing | Call list_open_questions, then answer them or call accept_recommended_answers |
| ready_to_generate | Call generate_pack |
| stale | Call generate_pack to regenerate stale documents |
| blocked | Call list_findings; fix via set_decision + generate_pack, or accept_finding |
| ready | Call list_pack_files and read_pack_file to get the pack |
| failed | Retry in the web app (Retry button), then check again |

## Access tokens

| Item | Rule |
|---|---|
| Format | `bp_` + `randomBytes(32).toString('base64url')`; shown **once** at creation |
| Storage | `api_tokens.tokenHash = sha256(token)` hex; `prefix` = the first 10 characters, for display |
| Limit | 10 active tokens per user |
| Create, list, revoke | Only with a browser session (cookie). A bearer token cannot manage tokens |
| Use | `requireUser` accepts a session cookie **or** `Authorization: Bearer bp_…`. Revoked or unknown → 401. Update `lastUsedAt` at most once per 5 minutes |
| CSRF | Bearer-authenticated requests without a cookie skip the Origin check (CSRF needs a cookie) |

## Connect instructions (shown on /settings)

Render these with the user's token and `MCP_PUBLIC_URL` filled in:

```text
Claude Code:
claude mcp add --transport http villa-blueprint <MCP_PUBLIC_URL> --header "Authorization: Bearer <token>"
```

```json
{ "mcpServers": { "villa-blueprint": { "type": "http", "url": "<MCP_PUBLIC_URL>", "headers": { "Authorization": "Bearer <token>" } } } }
```

The JSON form is labelled "Cursor and other MCP clients (mcp.json)", with a note that each client's config location differs.
