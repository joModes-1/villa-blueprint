# Implementation Rules

Implement tasks in order, one at a time, each ending green.

**Web:**
- Route handlers are wrapped in `handle()`, with Zod bodies and `loadOwnedProject` for project routes.
- Services live in `src/server/*`.
- Cookies are read from the request header.
- Client components use `api-client.ts`.
- Every view has loading, empty, error and success states.

**Worker:**
- One file per job.
- Load rows, call core, save.
- Use atomic run counters and the advisory lock in the scheduler, exactly as in `27`.

**Core:** pure functions. Prompts are worded verbatim from `27` and `30`. `PACK_SPEC` and `LEDGER_CATALOG` are data, not logic.

**Database:** the Prisma schema from `09` verbatim. One `init` migration. Transactions for multi-row changes.

**API:** paths, bodies, codes and error shape exactly as in `10`.

**Security:**
- Owner scoping on every query.
- Origin check on mutations.
- Logger redaction.
- No content in logs.
- No stored Figma tokens.

**Testing:**
- Mock AI only.
- Test database only.
- Every API route gets a test.
- Core coverage ≥ 80%.

**When uncertain:**
- Stop if the ambiguity affects security, data integrity or the API contract.
- Otherwise make the smallest conventional choice consistent with the docs, and record it as an assumption in the task report.
