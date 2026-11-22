# Domain Model and Glossary

## Entities

| Entity | Description | Key fields |
|---|---|---|
| User | A person with an account | email, name, passwordHash |
| Session | A signed-in browser | tokenHash, expiresAt |
| Project | One product idea turned into a pack | name, mode, status |
| Source | One input: pasted text, file, chat export or Figma file | kind, title, text, status |
| Fact | One statement extracted from a source, with its supporting quote | category, statement, quote, confidence |
| Question | An interview question for one ledger key | key, prompt, options, recommended, status, answer |
| Decision | One row of the decision ledger | key, value, status, rationale, sourceRefs |
| Document | One generated file of the output pack | path, content, status, inputsHash |
| PipelineRun | One background stage execution | stage, status, done/total |
| GateFinding | One quality-gate result | rule, severity, message, status |
| UsageEvent | One AI call's token use and cost | tag, model, tokens, costUsd |

## State Machines

### Project status

```text
draft ──analyze──▶ processing ──(analysis done, questions open)──▶ interviewing
                     │                                                  │ (all answered/skipped)
                     └──(analysis done, no open questions)──────────────▼
                                                               ready_to_generate
                                                                        │ generate
                                                                        ▼
                                                                    generating ──(all docs done)──▶ gating
                                                                                                      │
                                                                            ┌─────(no open blocker)───┴──(open blocker)──┐
                                                                            ▼                                             ▼
                                                                          ready ◀──(all blockers accepted, re-check)── blocked
ready | blocked ──(ledger edit makes docs stale)──▶ stale ──generate──▶ generating
any running state ──(job fails after retries)──▶ failed ──retry──▶ the stage that failed
```

| From | Event | To | Guard |
|---|---|---|---|
| draft, interviewing, ready_to_generate, failed | `POST /analyze` | processing | at least 1 source |
| processing | analysis saved, questions open | interviewing | — |
| processing | analysis saved, no questions open | ready_to_generate | `finishInterview` ran |
| interviewing | last question answered or skipped | ready_to_generate | `finishInterview` ran |
| ready_to_generate, stale, ready, blocked | `POST /generate` | generating | no P0 key empty, budget OK |
| generating | all documents done | gating | — |
| gating | gates saved | ready / blocked | ready if no open blocker |
| blocked | last open blocker accepted | ready | — |
| ready, blocked | `PATCH /decisions/:key` makes a document stale | stale | — |
| processing, generating, gating | run failed | failed | — |
| failed | `POST /retry` | the failed run's stage | — |

Rules:
- Sources may be added or deleted only in `draft`, `interviewing`, `ready_to_generate` and `failed`. In any other state, return `409 INVALID_STATE`.
- Decisions may be edited in `interviewing`, `ready_to_generate`, `ready`, `blocked`, `stale` and `failed`.
- Re-running `analyze` processes only `pending` sources, keeps user-answered decisions, and re-runs the analysis call over all facts.
- `PATCH /projects/:id { mode }` is allowed only in `draft` and `interviewing`.

All transitions go through one function, `transition(project, event)`, in `packages/core/src/pipeline/state.ts`. It throws `InvalidTransitionError` for anything not in the table, and is unit-tested row by row.

### Document status

`pending → generating → done`, `generating → failed` after retries, and `done → stale` when the inputs hash changes. Only `pending` documents are scheduled. `POST /generate` turns `stale` and `failed` into `pending`.

### Question status

`open → answered` or `open → skipped`. Answers can be changed later through the ledger (`PATCH /decisions/:key`), not through the question.

## Glossary

| Term | Meaning |
|---|---|
| Pack | The exported zip: START-HERE, AGENTS, CLAUDE, docs, docs/build |
| Ledger | The project's decision rows, one per catalog key (`28`) |
| Catalog | The fixed list of ledger keys |
| Confirmed | A decision stated by a cited fact, or given by the user |
| Assumed | A decision filled from a default; listed in 23-open-questions |
| Deferred | A decision explicitly postponed; its value says what is deferred |
| Founder mode | Asks only P0 questions; fills P1 with defaults |
| Expert mode | Asks P0 and P1 questions |
| Gate | An automatic check on the generated pack (`30`) |
| Blocker | A gate finding that prevents export until fixed or accepted |
| Stale | A document whose ledger inputs changed after it was generated |
| Mock AI | The offline deterministic provider used by tests (`AI_PROVIDER=mock`) |
