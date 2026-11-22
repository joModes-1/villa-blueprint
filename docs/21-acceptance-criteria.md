# Acceptance Criteria

## Acceptance Criteria

| ID | Given / When / Then |
|---|---|
| AC-01 | Given a new visitor, when they sign up with a valid name, email and 10+ char password, then they land on /projects signed in |
| AC-02 | Given 10 failed logins for an email+IP in 15 min, when an 11th is tried, then the API returns 429 RATE_LIMITED |
| AC-03 | Given user A's project ID, when user B requests any of its endpoints, then the response is 404 |
| AC-04 | Given a project in draft, when the user adds pasted text, a `.pdf`, a `.docx`, a ChatGPT export and a Claude export, then all five appear with status pending |
| AC-05 | Given a 21st source or an 11 MB file, when uploaded, then 422 SOURCE_LIMIT or 413 FILE_TOO_LARGE is returned and nothing is saved |
| AC-06 | Given sources, when Analyze runs with the mock AI, then facts exist, every fact's quote is a substring of its source, and the project moves to interviewing |
| AC-07 | Given open questions, when "Accept all recommended" is clicked, then all are answered, P1 defaults fill as assumed, and status is ready_to_generate |
| AC-08 | Given an empty P0 decision, when Generate is clicked, then 422 LEDGER_INCOMPLETE lists the missing key and nothing is queued |
| AC-09 | Given a complete ledger and the mock AI, when Generate runs, then every PACK_SPEC file and every task file reaches done, gates run, and status is ready, all within 60 s |
| AC-10 | Given a ready project, when the user downloads the pack, then the zip contains START-HERE.md, AGENTS.md, CLAUDE.md, 27 docs files, the 3 docs/build files (PROJECT_CONTEXT, IMPLEMENTATION_RULES, TASKS_INDEX) and the task files, and no internal/ path |
| AC-11 | Given a ready project, when the user edits `stack.backend`, then the response lists the stale documents (including 08) and status is stale; Regenerate re-runs only those |
| AC-12 | Given a document containing MOCK_CONTRADICTION, when gates run, then a G11 blocker exists, export returns 422 EXPORT_BLOCKED, and after accepting it the export works |
| AC-13 | Given any project, when generation is attempted beyond MAX_TOKENS_PER_PROJECT, then it is refused or the run fails with BUDGET_EXCEEDED and no further AI call is made |
| AC-14 | Given a failed run, when Retry is clicked, then only failed items re-run |
| AC-15 | Given any log line produced during the E2E run, then it contains no password, token, cookie or API key value |
| AC-16 | Given `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e`, then all pass on a clean clone after `pnpm install`, a `.env` pointing at a PostgreSQL server, `pnpm db:migrate` and `pnpm db:migrate:test` |
| AC-17 | Given a signed-in user, when they create a token, then it is shown once; it authenticates API calls as a bearer token; after it is revoked, the same call returns 401 |
| AC-18 | Given a running web, worker and MCP server with the mock AI, when an MCP client uses only tools (create_project, add_text_source, analyze_project, get_project_status, accept_recommended_answers, generate_pack, list_pack_files, read_pack_file), then it reads `START-HERE.md` of a ready pack |
