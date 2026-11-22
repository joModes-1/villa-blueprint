# Repository Structure

## Tree

Create exactly this layout. There are no Dockerfiles or compose files. Files marked ★ are specified in detail elsewhere; follow that doc.

```text
villa-blueprint/
├─ package.json                  workspace scripts (see 17)
├─ pnpm-workspace.yaml           packages: ["apps/*", "packages/*"]
├─ tsconfig.base.json            strict, noUncheckedIndexedAccess, moduleResolution "Bundler", target ES2022
├─ eslint.config.mjs             flat config: typescript-eslint recommended + react-hooks
├─ prettier.config.mjs           singleQuote, printWidth 110, trailingComma "all"
├─ playwright.config.ts          webServer: web on 3000 and worker health on 3101, both with AI_PROVIDER=mock and the test DB
├─ .env.example                  every variable from 17, placeholder values
├─ .gitignore                    node_modules, .next, .env, coverage, test-results, playwright-report
├─ AGENTS.md  CLAUDE.md  START-HERE.md   copied from this pack
├─ docs/  docs/build/         copied from this pack
├─ e2e/full-flow.spec.ts         ★ 16
├─ scripts/migrate-test-db.ts    migrates the test database (see 17)
├─ scripts/golden-test.ts        ★ 16 (real AI; not part of `pnpm test`)
├─ scripts/golden/               copied from this pack's assets/golden/
├─ apps/
│  ├─ web/
│  │  ├─ package.json  next.config.ts  tailwind.config.ts  postcss.config.mjs  tsconfig.json  vitest.config.ts
│  │  ├─ src/middleware.ts                      cookie-presence redirect for pages
│  │  ├─ src/app/layout.tsx  globals.css  page.tsx  not-found.tsx
│  │  ├─ src/app/(auth)/login/page.tsx  (auth)/signup/page.tsx
│  │  ├─ src/app/projects/page.tsx  projects/[id]/page.tsx
│  │  ├─ src/app/api/v1/…/route.ts              one file per path in 10
│  │  ├─ src/components/ui/                     Button Input Textarea Select Card Badge Banner Dialog Toast Spinner EmptyState
│  │  ├─ src/components/workspace/              Stepper RunBanner SourcesStep FactsStep InterviewStep LedgerStep GenerateStep DocumentsStep GatesStep MarkdownView
│  │  ├─ src/lib/api-client.ts                  typed fetch wrapper; throws ApiError(code, message, details)
│  │  ├─ src/lib/use-poll.ts                    2 s polling hook
│  │  ├─ src/server/http.ts                     handler wrapper: requestId, error mapping, origin check, Zod parse
│  │  ├─ src/server/auth.ts  projects.ts  sources.ts  interview.ts  ledger.ts  generation.ts  gates.ts  export.ts  usage.ts
│  │  ├─ src/server/queue.ts                    lazy PgBoss singleton; enqueue(name, data)
│  │  ├─ src/server/logger.ts                   pino with redaction
│  │  └─ tests/api/*.test.ts                    route handlers called directly with Request objects
│  ├─ mcp/
│  │  ├─ package.json  tsconfig.json  vitest.config.ts
│  │  ├─ src/index.ts                           http server: POST /mcp (stateless transport per request), GET /health, 401 without bearer
│  │  ├─ src/api.ts                             fetch wrapper for API_URL with the forwarded bearer; maps errors to tool errors
│  │  ├─ src/tools.ts                           registerTools(server, api): the 17 tools from 31, descriptions verbatim
│  │  └─ tests/*.test.ts                        SDK Client against the server with a stubbed API
│  └─ worker/
│     ├─ package.json  tsconfig.json  vitest.config.ts
│     ├─ src/index.ts                           start boss, createQueue ×5, work registrations, health server on WORKER_HEALTH_PORT, graceful shutdown
│     ├─ src/context.ts                         prisma, ai client, logger
│     ├─ src/runs.ts                            createRun, incrementRun (atomic), failRun
│     ├─ src/jobs/process-source.ts  analyze-project.ts  schedule-generation.ts  generate-doc.ts  run-gates.ts
│     └─ tests/*.test.ts                        job handlers against the test DB with the mock AI
└─ packages/
   ├─ db/
   │  ├─ package.json  ("main": "src/index.ts"; scripts: generate, migrate, deploy, seed)
   │  ├─ prisma/schema.prisma ★ 09   prisma/seed.ts
   │  └─ src/index.ts                           export { prisma } (globalThis singleton) and Prisma types
   └─ core/
      ├─ package.json  ("main": "src/index.ts")  tsconfig.json  vitest.config.ts
      ├─ assets/forward-build/  assets/templates/   copied from this pack's assets/
      ├─ src/index.ts                           re-exports the public API
      ├─ src/errors.ts                          AppError(code, httpStatus, message, details) + subclasses
      ├─ src/api-types.ts ★ 10
      ├─ src/assets.ts                          readGuide(name), readTemplate(path), CORE_ROOT
      ├─ src/ai/types.ts  openrouter.ts  mock.ts  json.ts  budget.ts  index.ts ★ 27
      ├─ src/ledger/catalog.ts ★ 28   apply.ts (applyAnalysis, finishInterview)   table.ts (ledger → markdown table)
      ├─ src/pack/spec.ts ★ 29   dag.ts   hash.ts   slug.ts   zip.ts   render/*.ts ★ 29
      ├─ src/pipeline/state.ts ★ 06   chunk.ts   schemas.ts   estimate.ts   prompts/{extract,analyze,doc,taskPlan,contradictions}.ts ★ 27
      ├─ src/ingest/text.ts  chatExport.ts  pdf.ts  docx.ts  figma.ts  index.ts ★ 27
      ├─ src/gates/markdown.ts (table/heading helpers)  rules.ts ★ 30   contradictions.ts   run.ts
      └─ tests/**/*.test.ts  tests/fixtures/{chatgpt-conversations.json, claude-conversations.json}
```

## Package names

`@blueprint/web` (private), `@blueprint/worker` (private), `@blueprint/core`, `@blueprint/db`. Internal dependencies use `"workspace:*"`.

## Import alias

In `apps/web`, `@/*` maps to `src/*`.
