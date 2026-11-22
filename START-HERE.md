# START HERE — Villa Blueprint

This folder is a complete, build-ready pack. It has two jobs:

1. **Build Villa Blueprint.** Hand this folder to a coding agent (Claude Code or Codex) with the prompts below. The agent builds the whole app in this folder, which is the repository root.
2. **Show the product's output.** Blueprint's whole purpose is to produce folders exactly like this one for other people's ideas: `START-HERE.md`, `AGENTS.md`, `CLAUDE.md`, `docs/` and `docs/build/`. If this pack builds Blueprint in a few prompts, the format is proven a second time, after the EU B2B portal.

## Before you start

| Need | Check |
|---|---|
| Node.js 20.11 or newer | `node -v` |
| pnpm 9 | `pnpm -v` (install: `npm i -g pnpm@9`) |
| PostgreSQL 16 (14+ works) | a native install or a hosted database; its user needs CREATEDB. Put the URLs in `.env` (`DATABASE_URL`, `DATABASE_URL_TEST`). No Docker needed |
| A capable coding agent | Claude Code or Codex with a top model, in **auto/approve-all mode for this folder** |
| An OpenRouter key | **Not needed to build.** The app and all tests run with the mock AI. A key is needed only for real use and the golden test |

Open a terminal **in this folder** and start your agent there.

## What the agent reads

`AGENTS.md` (rules) → `docs/00-index.md` (every decision) → `docs/27`–`30` (the engine) → the current task in `docs/build/tasks/`. Nothing outside this folder is needed.

## The prompts

Paste them one at a time. Wait for each to finish with all checks green before sending the next one.

### Prompt 1 — Foundation
```text
Read START-HERE.md and AGENTS.md, then docs/00-index.md. Implement docs/build/tasks/task-001, task-002 and task-003 in order, reading the docs each task lists. After each task, run its verification commands and fix until they pass, set its Status to Done in docs/build/TASKS_INDEX.md, and give the task report described in AGENTS.md. Never start a task while the previous one has failing checks. Do not ask me questions unless a stop condition in AGENTS.md applies.
```

### Prompt 2 — Engine
```text
Continue with task-004, task-005 and task-006, under the same rules. Implement docs/27, 28 and 29 exactly as written; they are the core of the product.
```

### Prompt 3 — Brain
```text
Continue with task-007 and task-008, under the same rules. Prove the full mock generation loop in the worker integration tests before finishing.
```

### Prompt 4 — Trust
```text
Continue with task-009 and task-010, under the same rules. The contradiction test from docs/16 must pass.
```

### Prompt 5 — Face
```text
Continue with task-011 and task-012, under the same rules. Follow docs/11 for every screen and state. Make sure pnpm build passes.
```

### Prompt 6 — Connect
```text
Continue with task-013, under the same rules. Implement docs/31 exactly, including the tool descriptions word for word.
```

### Prompt 7 — Proof
```text
Continue with task-014 and task-015, under the same rules. Finish with the final report from task-015: AC table, NFR numbers, all assumptions, known limitations.
```

### If the agent stops early or a session ends
```text
Continue from the first task in docs/build/TASKS_INDEX.md whose Status is not Done. Same rules as before: verify, fix until green, mark Done, report.
```

### Final audit (optional, recommended)
```text
Audit this repository against docs/21-acceptance-criteria.md and docs/03-cleaned-srs.md. For every AC and FR, name the test that proves it and run it. Fix anything missing or failing, then rerun pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e and report the results.
```

## Test 1 — Did the pack build the product?

Record these as you go:

| Measure | Target | Your result |
|---|---|---|
| Prompts sent (excluding "continue") | 7 | |
| Times the agent asked you a question | 0 | |
| Wall-clock time, first prompt to final report | a few hours | |
| `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e` | all green | |
| Manual run: `pnpm dev`, sign up, paste an idea, Analyze, Accept all, Generate, Download | works with the mock AI | |
| Manual MCP run: Settings → new token → connect Claude Code with the shown command → "list my Blueprint projects" | works | |

## Test 2 — Does the product's output build other products?

This is the real test of the idea.

1. Put a real key in `.env`: `AI_PROVIDER=openrouter` and `OPENROUTER_API_KEY=…`. Restart `pnpm dev`.
2. In Blueprint, create a project. Paste a real brainstorm (for example, a ChatGPT conversation about a new app) and/or upload a PDF, and add a Figma link if you have one.
3. Analyze → answer or accept the questions → Generate → check that the gates are green → Download.
4. Unzip into an **empty** folder. Open a **fresh** agent session there and paste the prompts from the unzipped `START-HERE.md`.
5. Record the same table as Test 1.

**The same test, driven entirely from Claude (MCP):**
1. In Blueprint Settings, create a token and connect Claude (Claude Code command or Claude Desktop/Cursor JSON from the Settings page). Also connect Claude's own Figma connector if you have designs.
2. Brainstorm the idea with Claude as usual. Then say: *"Create a Blueprint project called X, send it our whole conversation, and read my Figma file <link> and send its screens, texts and design tokens too. Then analyze it."*
3. Say: *"Show me Blueprint's open questions"*. Answer them in chat, or say *"accept the recommended answers"*. Then say *"generate the pack and tell me when it's ready"*.
4. In an **empty** folder, open Claude Code with the same MCP connection and say: *"Read every file of my Blueprint project X's pack, write them here, then follow START-HERE.md."*

Quality check with a known answer: `pnpm golden` runs the EU B2B portal's original requirements through the real pipeline. It compares the decisions with the ones that actually built that portal (`assets/golden/`). It passes at ≥ 80% match, 0 blockers and ≤ 3 USD.

## Folder map

| Path | What it is |
|---|---|
| `START-HERE.md` | This file |
| `AGENTS.md`, `CLAUDE.md` | Rules for the coding agent |
| `docs/00`–`26` | The standard 27-document pack |
| `docs/27`–`30` | Blueprint's engine: pipeline, ledger catalog, output pack, gates |
| `docs/31` | MCP server: connect Claude, Cursor and Figma-through-Claude |
| `docs/build/` | Build handoff: project context, implementation rules, task index, 15 task files. These are the work orders the coding agent follows; `docs/00`–`31` are the reference they point to |
| `assets/forward-build/` | The method Blueprint follows (copied into the app in task-004) |
| `assets/templates/` | Example pack used as the depth reference (copied in task-004) |
| `assets/golden/` | EU B2B portal requirements plus its real decisions, for the golden test |
