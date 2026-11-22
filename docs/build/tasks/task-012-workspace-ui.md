# Task 012: Workspace UI

## Goal
The complete project workspace: the seven steps, live progress, and all banners, wired to the API, so a user can go from sources to downloaded zip in the browser.

## Context
`11` (workspace stepper table, running and failed states, Documents view), `10` (endpoints), `06` (which actions each status allows).

## Requirements Covered
FR-005 to FR-034 (UI), with FR-034 (document viewer) primary.

## Dependencies
task-011.

## Files and Areas
`apps/web/src/app/projects/[id]/page.tsx` and `apps/web/src/components/workspace/*` (Stepper, RunBanner, SourcesStep, FactsStep, InterviewStep, LedgerStep, GenerateStep, DocumentsStep, GatesStep, MarkdownView), plus `src/lib/use-poll.ts`.

## Steps
1. `page.tsx`, a client component:
   - load the project
   - derive the current step from its status, per `11`
   - render the header (inline rename, mode badge or switch while allowed, status pill), the Stepper, the RunBanner and the active step
2. `use-poll.ts`: calls a loader every 2 s while `active` is true; stops on unmount; no overlapping requests.
3. `RunBanner` polls `runs/latest` and the project while a run is `queued` or `running`. It shows the stage label and `done/total`, and the failed, stale and blocked banners with their buttons (Retry, Regenerate, go to Gates).
4. **SourcesStep:**
   - a paste form (title and text)
   - a file drop zone plus file input, with accept `.md,.txt,.json,.pdf,.docx` and a client-side 10 MB check
   - a Figma form (URL and token, password-type input, "never stored" help)
   - the list with delete
   - Analyze
5. **FactsStep:** grouped, collapsible categories; the quote in a blockquote; source title; confidence dot with a text label.
6. **InterviewStep:** a card per open question, with radio options, the recommended badge, an Other text field, Save and Skip. "Accept all recommended" at the top. Answered and skipped questions collapsed below.
7. **LedgerStep:** a grouped table with inline edit (textarea and status select) and Save per row. Empty P0 rows are red with "Required". A toast lists the stale documents after a save.
8. **GenerateStep:** the estimate; missing P0 keys linking to the ledger rows; a Generate or "Regenerate N stale" button; a progress bar; and the document list with status icons, refreshed while running.
9. **DocumentsStep:**
   - a tree grouped by folder
   - `MarkdownView` uses `react-markdown` + `remark-gfm`, no `rehype-raw`, with styled tables, headings and code
   - a Copy button
10. **GatesStep:**
    - findings with severity badge, rule, document link (opens it in DocumentsStep), message, and an Accept dialog requiring a reason
    - a usage card (tokens and cost)
    - a Download button calling `/export` through a plain `<a href>` (cookies are sent automatically). It is disabled with the reason when export isn't allowed.
11. Every step has the loading, empty, error and success states. Buttons disable while pending.

## Tests Required
- DOM tests for:
  - InterviewStep: "Accept all recommended" calls the endpoint and refreshes
  - LedgerStep: a red P0 row is shown
  - GatesStep: Download is disabled with a blocker open
- `pnpm build` passes; the workspace JS stays within NFR-013. Check `next build` output: First Load JS for `/projects/[id]` ≤ 300 kB.

## Acceptance Criteria
- Manually, with `pnpm dev` and the mock AI: paste text → Analyze → Accept all → Generate → Ready → read a doc → Download a zip that opens.
- All checks plus build pass.

## Verification Commands
```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Stop Conditions
None expected.
