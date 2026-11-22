# Coding Standards

## Standards

| Area | Rule |
|---|---|
| TypeScript | `strict`; no `any` (use `unknown` and narrow); exported functions have explicit return types |
| Layering | `core` is pure: no Prisma, no Next, no `process.env` except in `ai/index.ts`'s `createAiClient(env)`. Apps pass config in |
| Route handlers | Wrap with `handle(async (req, ctx) => …)` from `src/server/http.ts`, which adds requestId, maps `AppError` to the error format, and checks Origin on mutations. Read cookies with `req.headers.get('cookie')`. Set cookies on the returned `NextResponse`. Never call `cookies()` from `next/headers` in API code, so handlers stay callable in tests |
| Services | Business logic for web lives in `src/server/*.ts`, taking `(prisma, userId, input)`. Handlers stay thin |
| Errors | Throw `AppError` subclasses (`NotFoundError`, `InvalidStateError`, `ValidationError`, …). Never return error JSON by hand |
| Validation | Zod schemas live next to their handler (request) or in `core/pipeline/schemas.ts` (AI responses) |
| State changes | Only through `transition()` from `core/pipeline/state.ts`. Multi-row changes run in `prisma.$transaction` |
| AI | Only through `AiClient`. Every call has a `tag`. JSON calls go through `completeJson` with a schema |
| Prompts | Prompt text lives in `core/pipeline/prompts/*.ts` as exported functions returning `{ system, user }`; the wording comes from `27` |
| Naming | Files `kebab-case.ts` (React components `PascalCase.tsx`); queues `kebab-case`; DB `snake_case` via `@@map`; API JSON `camelCase` |
| React | Server components for pages that only load data; workspace steps are client components using `api-client.ts`. No global state library |
| Styling | Tailwind utility classes; colors from the tokens in `11` (set as `theme.extend.colors` `primary`, `danger`, …) |
| Logging | `logger.info({ projectId, runId, stage, ms }, 'message')`. Never log content (see `13`) |
| Tests | Same folder structure as `src`, named `*.test.ts`; arrange-act-assert; no network (stub `fetch`) |
| Dependencies | Only those listed in `08`, plus these devDependencies: `pdf-lib`, `docx`, `cross-env`, `@testing-library/react`, `@testing-library/dom`, `jsdom`, `dotenv`. Anything else needs a note in the task report |
| Formatting | Prettier; `pnpm lint` must pass with 0 warnings |
