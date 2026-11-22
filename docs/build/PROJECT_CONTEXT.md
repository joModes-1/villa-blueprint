# Project Context

Villa Blueprint is a web app that turns a messy idea into a build-ready documentation pack. Users add sources: pasted text, markdown, ChatGPT and Claude chat exports, PDF, DOCX, and Figma files. A worker extracts facts with verbatim quotes and maps them onto a fixed catalog of decisions (the ledger). It asks the user only the open questions, each with a recommended answer. It then generates the full pack and checks it with gates. The user downloads a zip containing `START-HERE.md`, `AGENTS.md`, `CLAUDE.md`, `docs/` and `docs/build/`, and a coding agent builds the target system from it in a few prompts.

**Stack:** pnpm monorepo; Next.js 15 (UI + REST `/api/v1`); a Node worker on pg-boss; PostgreSQL 16 + Prisma 6; Zod; Tailwind 3.4; the `openai` SDK against OpenRouter; a deterministic mock AI for tests; Vitest and Playwright. No Docker.

**Security:** owner-only projects (404 otherwise); bcrypt with opaque DB sessions; login rate limit; Origin check on mutations; sources treated as untrusted data in every prompt; nothing sensitive logged; Figma tokens never stored; token budget per project.

**MCP:** `apps/mcp` lets Claude, Cursor or any MCP client drive Blueprint with personal access tokens. Users push chats and Figma designs (read by their own client) and pull the pack. It is a thin client of the REST API; see `docs/31-mcp-server-spec.md`.

**Primary workflow:** sign up → create project → add sources → Analyze → Facts → Interview (accept recommended) → Ledger → Generate (progress) → Documents → Gates (fix or accept) → Download pack.

**The heart of the system:**
- `docs/27-generation-pipeline-spec.md`: stages, prompts, schemas, mock AI
- `28-ledger-catalog.md`: decision keys
- `29-output-pack-specification.md`: generated files, DAG, renderers, stale tracking
- `30-gate-rules.md`: G01–G11

Implement these four exactly.
