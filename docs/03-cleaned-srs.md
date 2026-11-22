# Cleaned SRS

## Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-001 | Users sign up with name, email and password; email is unique and case-insensitive | P0 |
| FR-002 | Users log in and out; sessions last 30 days in an httpOnly cookie | P0 |
| FR-003 | Login is limited to 10 failures per 15 minutes per email+IP | P0 |
| FR-004 | Users create, list, rename and soft-delete their own projects | P0 |
| FR-005 | Each project has a mode, founder or expert, changeable before generation | P0 |
| FR-006 | Users add pasted text or markdown as a source | P0 |
| FR-007 | Users upload `.md`, `.txt`, `.json`, `.pdf` and `.docx` files as sources | P0 |
| FR-008 | Users add a Figma file by URL plus personal access token, never stored | P0 |
| FR-009 | Limits are enforced: 20 sources, 10 MB per file, 400,000 characters per project | P0 |
| FR-010 | ChatGPT and Claude `conversations.json` exports are flattened into readable conversations | P0 |
| FR-011 | Facts are extracted per chunk with category, statement, quote and confidence; facts whose quote is not in the source are dropped | P0 |
| FR-012 | Duplicate facts within a project are dropped | P1 |
| FR-013 | Analysis fills ledger decisions only from cited facts, and never overwrites user answers | P0 |
| FR-014 | Analysis creates a question with 2–4 options and a recommendation for every undecided P0 key (and P1 in expert mode) | P0 |
| FR-015 | Users answer, skip, or accept all recommended answers | P0 |
| FR-016 | After the interview, remaining keys with defaults are filled as *assumed* | P0 |
| FR-017 | Users edit any decision's value and status; the change marks affected documents stale | P0 |
| FR-018 | Generation is refused while any P0 decision is empty, listing the missing keys | P0 |
| FR-019 | An estimate of AI calls and tokens is shown before generation | P1 |
| FR-020 | Documents are generated in dependency order, in parallel when ready, as specified in `29` | P0 |
| FR-021 | Index, open questions, task breakdown, traceability, tasks index, task files, AGENTS, CLAUDE and START-HERE are rendered by code | P0 |
| FR-022 | An AI task plan of 8–16 tasks covering every FR ID produces one task file per task | P0 |
| FR-023 | Each AI document is checked for required headings and retried once if invalid | P0 |
| FR-024 | Regenerate re-runs only stale or failed documents | P1 |
| FR-025 | Background progress (done/total) is visible and auto-refreshes | P0 |
| FR-026 | Failed runs can be retried | P1 |
| FR-027 | Deterministic gates G01–G10 run after generation | P0 |
| FR-028 | An AI contradiction gate G11 runs after generation | P0 |
| FR-029 | Users accept a finding with a reason; accepted blockers no longer block export | P0 |
| FR-030 | The pack downloads as a zip in the layout of `29` | P0 |
| FR-031 | Every AI call records tokens and cost; users see per-project totals | P1 |
| FR-032 | A per-project token budget stops AI calls when exceeded | P0 |
| FR-033 | `AI_PROVIDER=mock` runs the entire pipeline offline and deterministically | P0 |
| FR-034 | Users read any generated document rendered as markdown | P0 |
| FR-035 | Users create (shown once), list and revoke personal access tokens, up to 10 active, from a browser session only | P0 |
| FR-036 | The REST API accepts `Authorization: Bearer bp_…` as an alternative to the session cookie | P0 |
| FR-037 | An MCP server exposes the 17 tools in `31`, each calling the REST API with the caller's token | P0 |
| FR-038 | MCP tools return API errors as tool errors, and `get_project_status` returns the next step | P1 |

## Constraints

- All AI provider access goes through `packages/core/src/ai`. Nothing else calls a model.
- No real model is called in automated tests.
- No secret, token, prompt or source text is ever logged.
- The output pack must not link outside itself except to the vendor hosts named in the ledger (gate G10).
