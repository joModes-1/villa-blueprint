# Open Questions and Assumptions

There are no open questions that block implementation. Everything below is decided. An agent must not revisit it.

## Assumptions

| Area | Assumption | Revisit when |
|---|---|---|
| Default models | `AI_MODEL_REASONING=anthropic/claude-sonnet-4.5`, `AI_MODEL_FAST=deepseek/deepseek-v3.1-terminus`. Both are env-configurable | After the golden test, if quality or cost misses NFR-004 |
| Auth scope | No password reset, email verification or MFA in the MVP | Before public launch |
| Billing | No payments; cost is tracked and capped per project only | Villa integration phase |
| Storage | Uploads are kept in Postgres until parsed | Uploads exceed 10 MB or volume grows |
| Real-time | Polling every 2 s instead of websockets | More than 200 concurrent active runs |
| Single owner | No sharing or teams | Agency customers ask for it |

## Deferred

| Item | Note |
|---|---|
| Villa Code integration | Shared account and wallet; Villa `/guard` and reverse-scan drift checks against the pack |
| GitHub push | Push the pack into a new or existing repo |
| Image and OCR ingest | Screenshots and whiteboard photos |
| Cloud build | Run the coding agent for the user |
| Admin console | Usage across users |
| MCP client | Blueprint connecting out to other MCP servers (Figma, Notion…); today users' own AI clients bring that content in through Blueprint's MCP server |
| i18n | English only |

## Unanswered questions

None.
