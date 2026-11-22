# Task 004: Core — AI Clients, Ledger Catalog, Pack Spec and State Machine

## Goal
All pure building blocks the pipeline needs, unit-tested without a database.

## Context
`27` (sections "AI client", "Mock provider", "Estimate"), `28` (the whole catalog), `29` (the whole spec, DAG and stale tracking), `06` (project state machine), `08` (traps 6 and 7).

## Requirements Covered
FR-031, FR-032, FR-033 (and the foundations of FR-016, FR-020, FR-024).

## Dependencies
task-003.

## Files and Areas
`packages/core/src/{assets.ts, api-types.ts, ai/*, ledger/catalog.ts, ledger/table.ts, pack/{spec,dag,hash,slug}.ts, pipeline/{state,schemas,estimate}.ts}`, plus `packages/core/assets/`.

## Steps
1. Copy `assets/forward-build/` and `assets/templates/` into `packages/core/assets/`. Write `assets.ts`:
   - `CORE_ROOT`
   - `readGuide(file)` and `readTemplate(relPath)`, each returning '' if the file is missing
   - `truncate(text, max)`
2. `api-types.ts`: the Zod schemas and types from the end of `10`.
3. `ai/`:
   - `types.ts` with `AiCall`, `AiResult` and `AiClient`
   - `openrouter.ts`, which receives `fetch` and config as parameters so it can be tested. It honors timeout, retries, empty-output detection and `usage.cost`
   - `mock.ts`, following the tag table in `27` exactly
   - `json.ts` with `completeJson`
   - `budget.ts` with `assertBudget(usedTokens, max)` and `BudgetExceededError`
   - `index.ts` with `createAiClient(env)`
   - Usage persistence is the caller's job: core returns `AiResult`, and the worker saves `UsageEvent`
4. `ledger/catalog.ts`: `LEDGER_CATALOG` from `28`, every row, in order. Helpers `catalogByKey`, `p0Keys()`, `keysMatching('stack.*')`.
5. `ledger/table.ts`: `ledgerToMarkdown(rows)` produces `| key | area | status | value |`, with `—` for empty values.
6. `pack/spec.ts`: `PACK_SPEC` from `29`, every AI and code row, with headings and formatRules. Expand the abbreviated `after` and `context` entries to full paths. Expand guide abbreviations to filenames. `template` is the same filename under `templates/project-docs/` or `templates/codex-handoff/`.
7. `pack/dag.ts`:
   - `validateDag(spec)`, which throws on missing paths or cycles
   - `readyFiles(spec, statusByPath)`
   - `topoOrder(spec)`
   - task files are added dynamically after `internal/task-plan.json`, with `after: ['internal/task-plan.json']`
8. `pack/hash.ts`: `computeHashes(spec, ledger)` returns `Map<path, hash>`, per the "Stale tracking" section of `29`, in one pass in topological order.
9. `pack/slug.ts`: `projectSlug(name)` and `taskFileName(n, slug)`.
10. `pipeline/state.ts`: `transition(status, event)` with the full table from `06`, and `InvalidTransitionError`.
11. `pipeline/schemas.ts`: `FactsResponse`, `AnalyzeResponse`, `TaskPlan` and `ContradictionsResponse` from `27` and `30`.
12. `pipeline/estimate.ts`: `estimateGeneration(spec)`.

## Tests Required
Every core case for these modules listed in `16`: state, ai/json, ai/openrouter, ai/budget, mock determinism (the same call twice gives an identical result), dag, hash, plus:
- catalog sanity: unique keys, the 10 categories, at least one P0 per category where `28` has one
- spec sanity: every AI file has a model, a guide that exists in assets, and a template that exists

## Acceptance Criteria
- Core coverage ≥ 80%.
- `validateDag(PACK_SPEC)` passes.
- The mock produces valid JSON for every JSON tag.

## Verification Commands
```bash
pnpm --filter @blueprint/core exec vitest run --coverage && pnpm lint && pnpm typecheck
```

## Stop Conditions
None expected.
