# UI/UX Specification

## Screens

| Screen | Route | Purpose | Key states |
|---|---|---|---|
| Sign up | /signup | Create an account | validation errors inline, email taken, submitting |
| Log in | /login | Sign in | invalid credentials, rate limited, submitting |
| Settings | /settings | Access tokens and MCP connect instructions | token list (name, prefix, created, last used, Revoke); "New token" dialog that shows the token **once** with Copy and the warning "You won't see this again"; the connect snippets from `31` filled with the new token and `MCP_PUBLIC_URL`; empty state "Connect Claude, Cursor or any MCP client" |
| Projects (Home) | /projects | The big prompt box (paste an idea or chat, attach files, add Figma; submitting creates the project, adds the sources and starts Analyze in one go), then recent projects | empty ("Turn your first idea into a build-ready pack"), loading, list |
| Workspace | /projects/[id] | The seven-step flow for one project | per step, below |
| Not found | any unknown or unowned route | Friendly 404 with a link to /projects | — |

`/` redirects to `/projects` when signed in, otherwise to `/login`. `apps/web/src/middleware.ts` redirects unauthenticated page requests to `/login?next=…`. The middleware checks only that the cookie exists. Pages verify the session on the server.

## Layout

- Top bar: product name "Villa Blueprint", links to Projects and Settings, the user's name, and Log out.
- Content max width 1100 px, centered, with 24 px padding (16 px under 640 px).
- Workspace header: project name (inline-editable), a mode badge (Founder or Expert, switchable while allowed), a status pill, and the **stepper**.

## Workspace stepper

Seven steps, always visible. A step is clickable when its data exists. The current step comes from the project status.

| # | Step | Shows | Primary action | Enabled when |
|---|---|---|---|---|
| 1 | Sources | Source list (kind icon, title, size, status, error), "Paste text" textarea with a title, file drop zone (`.md .txt .json .pdf .docx`, 10 MB), Figma URL plus token fields with the help text "Token is used once and never stored" | **Analyze** (disabled with 0 sources) | always |
| 2 | Facts | Facts grouped by category in collapsible sections. Each fact shows the statement, the quote in a muted blockquote, a confidence dot, and its source title | Next | facts exist |
| 3 | Interview | One card per open question: prompt, "why" text, options as radio buttons with the recommended one marked "Recommended", and a free-text "Other" field. Answered and skipped questions are collapsed below | **Accept all recommended**, plus Save on each card, plus Skip | status ≥ interviewing |
| 4 | Ledger | Table in catalog order, grouped by category: area, value (inline edit, textarea), status select (confirmed/assumed/deferred), rationale, priority badge. Empty P0 rows are highlighted red with "Required" | Save per row. After saving in ready/blocked, a toast lists the documents that became stale | status ≥ interviewing |
| 5 | Generate | Estimate ("≈ N AI calls, ≈ M tokens"), missing P0 keys listed with links to the ledger, a progress bar (done/total), and a live document list with status icons | **Generate**, or **Regenerate N stale** | status ≥ ready_to_generate |
| 6 | Documents | Left: document tree (docs, docs/build, tasks). Right: rendered markdown (`react-markdown` + `remark-gfm`, tables styled) with a Copy button | — | any document done |
| 7 | Gates and export | Findings list: severity badge, rule, document link, message, Accept (with a reason dialog). Usage card (tokens, cost). | **Download pack (.zip)**, enabled when export is allowed; otherwise disabled with the reason | status ∈ {ready, blocked} |

### Running and failed states

- While a run is `queued` or `running`: a sticky banner "Analyzing your sources… 3/5" or "Generating documents… 12/31". Actions that would change state are disabled. The UI polls `GET /runs/latest` and `GET /projects/:id` every 2 seconds, and stops polling when the run finishes.
- `failed`: a red banner with the run error and a **Retry** button that calls `/retry`.
- `stale`: a yellow banner "N documents are out of date with your ledger" with a Regenerate button.
- `blocked`: an orange banner "N issues must be fixed or accepted before export".

## Design System

The visual direction (bright violet → pink → amber gradient, a prompt-box-first home page, six screens) is defined in **`DESIGN-BRIEF.md`** at the repo root. When designs exist, match them. These tokens are the same as in the brief.

| Token | Value |
|---|---|
| Fonts | Plus Jakarta Sans (headings), Inter (body), JetBrains Mono (code), loaded with `next/font/google` |
| Primary | `#7C3AED`; hover `#6D28D9` |
| Brand gradient | `#7C3AED → #EC4899 → #F59E0B` at 120° (hero text, prompt box border, primary CTA, progress) |
| Background / surface | `#FFFDF8` / `#FFFFFF` |
| Text / muted / border | `#1E1B4B` / `#6B7280` / `#EDE9FE` |
| Success / info / warning / danger | `#14B8A6` / `#0EA5E9` / `#F59E0B` / `#EF4444` |
| Radius | 24 px prompt box, 16 px cards, 12 px inputs and buttons, full pills |
| Spacing | 4 px scale (Tailwind defaults) |

Components are local, in `apps/web/src/components/ui/`: `Button` (primary, secondary, ghost, danger; loading), `Input`, `Textarea`, `Select`, `Card`, `Badge`, `Banner`, `Dialog` (native `<dialog>`), `Toast` (simple context), `Spinner`, `EmptyState`, and `Stepper`. Icons come from `lucide-react`.

## States

Every data view has four states: loading (skeleton or spinner), empty (EmptyState with one action), error (Banner plus Retry), and success. Every mutation disables its button and shows a spinner while pending. Errors from the API show the `message` field.

## Accessibility

- Every input has a `<label>`. Errors use `aria-describedby`.
- Focus is visible (`ring-2 ring-indigo-500`). Dialogs trap focus and close on Escape.
- The stepper is a `<nav aria-label="Project steps">` with `aria-current="step"`.
- Color is never the only signal: badges carry text.
- Text contrast is at least 4.5:1.
