# Task 011: Frontend Foundation

## Goal
A styled app shell with working sign-up, log-in, log-out and projects-list pages on the existing API.

## Context
`11` (screens, layout, design system, states, accessibility), `19` (React and styling rules), `12` (middleware rule).

## Requirements Covered
FR-001, FR-002, FR-003, FR-004 (UI).

## Dependencies
task-010.

## Files and Areas
Tailwind config and `globals.css`; `apps/web/src/components/ui/*`; `apps/web/src/lib/api-client.ts`; `src/middleware.ts`; `app/layout.tsx`, `page.tsx`, `not-found.tsx`, `(auth)/login`, `(auth)/signup`, `projects/page.tsx`.

## Steps
1. Tailwind 3.4 setup, with the color tokens from `11` as `theme.extend.colors` (`primary`, `surface`, `border`, `muted`, `success`, `warning`, `danger`).
2. UI kit components from `11`, each accessible: labels, `aria-describedby` for errors, focus rings, a native `<dialog>`, and toasts through a context provider in the layout.
3. `api-client.ts`:
   - `api<T>(path, { method, body, form })` sends credentials `same-origin` and JSON headers
   - throws `ApiError { code, message, details, status }`
   - on 401, redirects to `/login?next=…`
4. `middleware.ts` redirects page routes without the `bp_session` cookie to `/login?next=…`, excluding `/login`, `/signup`, `/api/*` and `/_next/*`.
5. Layout: a top bar with name, Projects link, user name (from `/me`, fetched on the server in the layout using the request cookie and a direct service call), and a Log out button.
6. Login and signup forms: client-side validation that mirrors the API rules, server error display (including 429), and on success a redirect to `next` or `/projects`.
7. Projects page:
   - list cards showing name, status pill, mode badge, updated time, and blockers count
   - the empty state from `11`
   - a "New project" dialog (name and mode) that creates the project and navigates to `/projects/[id]`
   - delete with a confirm dialog
8. `projects/[id]/page.tsx` is a placeholder that loads the project and shows its name and status. The real workspace comes in task-012.

## Tests Required
- Vitest + `@testing-library/react` (devDependency, jsdom environment for `*.dom.test.tsx`) for: the login form error rendering; `api-client` 401 redirect handling (mock `fetch`).
- `pnpm build` passes.

## Acceptance Criteria
- Manually, with `pnpm dev`: sign up → projects empty state → create a project → open the placeholder → log out → redirected to login.
- All checks plus build pass.

## Verification Commands
```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Stop Conditions
None expected.
