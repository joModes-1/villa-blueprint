# Product Requirements Document

## Vision

Anyone with an idea gets a pack that a coding agent can build from, without asking a single question and without bugs caused by guessing.

## Personas

| Persona | Context | Success for them |
|---|---|---|
| Founder Faith | Has a 40-message ChatGPT brainstorm and a rough Figma; no coding | Downloads a pack, pastes 6 prompts into an agent, has a working MVP the same day |
| Developer Dan | Builds client apps; spends 2–3 days per project on specs | Gets an expert-mode pack in under an hour, edits the ledger, ships faster |

## User Stories

| ID | Story | Priority |
|---|---|---|
| US-01 | As a visitor I can sign up and log in so my projects are private | P0 |
| US-02 | As a user I can create a project and choose founder or expert mode | P0 |
| US-03 | As a user I can paste text, upload `.md .txt .json .pdf .docx` files, or add a Figma file | P0 |
| US-04 | As a user I can see the facts extracted from my sources, each with its quote | P0 |
| US-05 | As a user I am asked only the questions my sources do not answer, with a recommended answer | P0 |
| US-06 | As a user I can accept all recommended answers in one click | P0 |
| US-07 | As a user I can review and edit every decision in the ledger | P0 |
| US-08 | As a user I can generate the full pack and watch progress | P0 |
| US-09 | As a user I can read every generated document in the app | P0 |
| US-10 | As a user I see gate findings and can fix (via the ledger) or accept them | P0 |
| US-11 | As a user I can download the pack as a zip | P0 |
| US-12 | As a user, after changing a decision I can regenerate only the affected documents | P1 |
| US-13 | As a user I see how many tokens and dollars my project used | P1 |
| US-14 | As a user I can retry a failed step | P1 |
| US-15 | As a user I can create and revoke access tokens and see how to connect Claude or Cursor | P0 |
| US-16 | As a user, from my AI assistant, I can send a conversation or a Figma design to a project, run the whole flow, and let a coding agent read the pack | P0 |

## Workflows

1. **Create:** sign up → New project (name, mode) → Sources step.
2. **Feed:** paste the brainstorm, upload the PDF, add the Figma URL and token → **Analyze** → progress banner → Facts.
3. **Decide:** Interview → answer or **Accept all recommended** → Ledger review and edits.
4. **Generate:** Generate step → see the estimate → **Generate** → progress, with docs appearing.
5. **Check:** Gates → fix by editing the ledger and regenerating stale docs, or accept with a reason.
6. **Ship:** **Download pack** → unzip → open `START-HERE.md` → paste the prompts into a coding agent.

## Business Rules

| ID | Rule |
|---|---|
| BR-01 | A user sees only their own projects |
| BR-02 | Generation cannot start while any P0 decision is empty |
| BR-03 | Export is impossible while any blocker finding is open |
| BR-04 | A fact without a verbatim supporting quote is discarded |
| BR-05 | A decision answered by the user is never overwritten by re-analysis |
| BR-06 | Every assumed decision appears in the pack's 23-open-questions |
| BR-07 | A project never exceeds its token budget |
| BR-08 | Figma tokens are never stored |

## MVP Scope

US-01 to US-16.

## Deferred

Villa Code integration (account, wallet, drift checks); payments and credits; GitHub push; team sharing; image and OCR ingest; running the build in a cloud sandbox; admin console; password reset and email verification; i18n; streaming generation.
