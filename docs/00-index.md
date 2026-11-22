# Documentation Index — Villa Blueprint

Project: **Villa Blueprint**. A web app that turns a messy idea (brainstorm chats, notes, PDFs, Word docs, Figma files) into a build-ready documentation pack: `docs/`, `docs/build/`, `AGENTS.md`, `CLAUDE.md` and `START-HERE.md`. Any capable coding agent can implement the target system from that pack with a handful of prompts and no decisions left open.

This folder is itself an example of the pack Blueprint produces. Its format is the format Blueprint must output.

## Confirmed Decisions

Every row is final. An implementing agent must not re-decide any of them. If a row seems to conflict with another doc, this table wins. Report the conflict.

| Area | Confirmed decision |
|---|---|
| Product | Idea → facts → gap interview → decision ledger → generated docs pack → quality gates → zip export |
| MVP | Accounts; projects; source ingest (pasted text, `.md`, `.txt`, ChatGPT and Claude chat exports, `.pdf`, `.docx`, Figma URL plus token); fact extraction; gap analysis; interview; editable decision ledger; generation of the full pack; deterministic and AI gates; zip export; per-project usage and cost; personal access tokens and an **MCP server**, so Claude, Cursor and other MCP clients can push sources in and pull the pack out. Figma designs come in either through a Figma token or through the client's own Figma connector |
| Deferred, Blueprint as an MCP *client* of other servers | Villa Code integration, credits and payments, GitHub push, teams and sharing, image or OCR ingest, cloud build of the generated pack, admin console, i18n |
| Users | Individual signed-in users. Every project belongs to exactly one user. No roles beyond "owner" |
| Modes | `founder` (default): only P0 questions are asked, and P1 gaps are auto-filled with recommended answers marked *assumed*. `expert`: P0 and P1 questions are asked |
| Repository | pnpm workspace monorepo: `apps/web`, `apps/worker`, `apps/mcp`, `packages/core`, `packages/db` |
| Runtime | Node.js ≥ 20.11, TypeScript 5 `strict` everywhere |
| Web | Next.js 15 App Router; REST route handlers under `/api/v1`; React 19; Tailwind CSS **3.4**; `lucide-react` icons; `react-markdown` + `remark-gfm` to render docs. No shadcn CLI |
| Worker | Separate Node process run with `tsx`, consuming a **pg-boss** queue in the same PostgreSQL database. No Redis |
| MCP | `apps/mcp`: a stateless Streamable HTTP MCP server (`@modelcontextprotocol/sdk` 1.x) on `MCP_PORT`, with 17 tools that call the REST API using the caller's bearer token. It has no database access. See `31` |
| Database | PostgreSQL 16 (14+ works) + Prisma 6. UUID primary keys. Schema in `packages/db/prisma/schema.prisma` |
| Packages | `@blueprint/core` and `@blueprint/db` are consumed as TypeScript source (`"main": "src/index.ts"`). No build step for packages. Next.js uses `transpilePackages` |
| Validation | Zod for every request body and every AI JSON response |
| Auth. Plus personal access tokens (`bp_…`, stored hashed) sent as `Authorization: Bearer` for the API and MCP; tokens are managed only from a browser session | Email + password. `bcryptjs` (cost 12). Opaque random session token in an httpOnly cookie `bp_session`. Only its SHA-256 hash is stored in `Session`. 30-day expiry |
| AI | OpenRouter through the `openai` SDK (`baseURL` `https://openrouter.ai/api/v1`). Two models from env: `AI_MODEL_REASONING` for analysis and architecture docs, `AI_MODEL_FAST` for everything else |
| Offline AI | `AI_PROVIDER=mock` gives a deterministic fake provider. All automated tests and E2E run with it. No test calls a real model |
| Pipeline | Stages: ingest → extract → analyze → interview → generate → gate → ready. Each stage runs as pg-boss jobs. Project status follows the state machine in `06` |
| Generation | One AI call per AI-written doc, scheduled by the dependency graph in `29`, in parallel when ready. The index, open questions, task breakdown, traceability, tasks index, task files, AGENTS, CLAUDE and START-HERE are rendered by code from the ledger and the task plan, never by AI |
| Ledger | The fixed catalog of decision keys in `28`. One row per key per project. Status `confirmed`, `assumed` or `deferred`. Docs record which keys they used, so changing a key marks exactly those docs `stale` |
| Gates | Deterministic rules G01–G10 plus AI rule G11 (contradictions). Blockers prevent export until each is fixed or accepted. See `30` |
| Export | Zip built with `jszip`, streamed from `GET /api/v1/projects/:id/export`. Same layout as this folder |
| Method content | `assets/forward-build/` and `assets/templates/` are copied into `packages/core/assets/` and loaded at runtime as prompt guidance and examples |
| Limits | 20 sources per project, 10 MB per file, 400,000 extracted characters per project, `MAX_TOKENS_PER_PROJECT` (default 2,000,000) |
| UI | Responsive, desktop-first. One workspace page per project with a seven-step stepper. Accessible forms; WCAG 2.1 AA intent |
| Testing | Vitest (unit + API integration on a test database) and Playwright (one end-to-end flow with the mock AI). Coverage ≥ 80% for `packages/core` |
| Deploy | No Docker anywhere. Three Node processes (web with `next start`, worker and mcp with `tsx`) on any Node 20 host, plus a managed PostgreSQL. Locally, PostgreSQL is a native install or a hosted URL |
| Observability | `pino` JSON logs with `requestId`; `GET /api/v1/health`; per-call usage rows in `UsageEvent` |
| Privacy | Source text and docs are visible only to their owner. Figma tokens are used once at ingest and never stored. Prompt and response bodies are never logged |

## Documentation Map

| File | Purpose |
|---|---|
| 01-executive-summary.md | What Blueprint is and why |
| 02-product-requirements-document.md | Personas, flows, stories, MVP and deferred scope |
| 03-cleaned-srs.md | Functional requirements with IDs |
| 04-requirements-matrix.md | Requirement → priority → task |
| 05-non-functional-requirements.md | Measurable NFRs |
| 06-domain-model-and-glossary.md | Entities, project state machine, glossary |
| 07-system-architecture.md | Components, data flow, job orchestration |
| 08-technology-stack-and-adrs.md | Pinned stack and decision records |
| 09-database-design.md | Full Prisma schema |
| 10-api-specification.md | Every endpoint, body, response, error |
| 11-ui-ux-specification.md | Every screen and state |
| 12-authentication-authorization-and-permissions.md | Sessions and ownership rules |
| 13-security-requirements-and-threat-model.md | Threats and controls, including prompt injection |
| 14-implementation-plan.md | Build order |
| 15-task-breakdown.md | Task list summary |
| 16-test-plan-and-quality-strategy.md | Test layers and the mock AI |
| 17-devops-deployment-and-operations.md | Local setup, env vars, commands, deployment |
| 18-observability-logging-and-monitoring.md | Logs, health, usage |
| 19-coding-standards.md | Code conventions |
| 20-risk-register.md | Risks and mitigations |
| 21-acceptance-criteria.md | Done means |
| 22-readme-draft.md | README for the repo |
| 23-open-questions-and-assumptions.md | Assumptions made |
| 24-traceability-matrix.md | Requirement → doc → task → test |
| 25-repository-structure.md | Exact folder tree |
| 26-production-readiness-runbook.md | Go-live checklist |
| 27-generation-pipeline-spec.md | **Core.** Every stage, prompt, JSON schema and budget |
| 28-ledger-catalog.md | **Core.** Every decision key |
| 29-output-pack-specification.md | **Core.** Every generated file and its inputs |
| 30-gate-rules.md | **Core.** Every quality gate |
| 31-mcp-server-spec.md | MCP server, tools and access tokens |

## Reading Order for an Implementing Agent

`START-HERE.md` → `AGENTS.md` → this file → `27`, `28`, `29`, `30` → `09`, `10`, `11` → the current task file in `docs/build/tasks/`.
