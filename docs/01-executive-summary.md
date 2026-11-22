# Executive Summary

## Summary

Villa Blueprint turns an idea into a build-ready documentation pack. A user brings what they already have: brainstorm chats from ChatGPT or Claude, notes, PDFs, Word docs and Figma files. Blueprint extracts the facts, asks only the questions that are still open, and keeps every answer in one decision ledger. From that ledger it writes the full pack (project docs, AI handoff, task files and prompts) and checks it for gaps and contradictions. The user downloads a zip and hands it to a capable coding agent, which builds the system in hours with a few prompts.

## Problem

AI coding agents now write good code quickly. Projects still take weeks because the thinking is incomplete. Decisions are scattered across chats, half of them are never made, and the agent fills the gaps with guesses that turn into bugs and rework. Writing a complete spec by hand takes days and needs architecture experience most founders don't have.

## Solution

A guided pipeline that makes every decision explicit before any code exists:
- **Facts with citations.** Nothing is invented; every fact quotes its source.
- **A gap interview.** Only unanswered decisions are asked, each with a recommended answer.
- **One decision ledger.** Every generated document must agree with it.
- **A proven pack format.** The format was used to build the EU B2B portal from docs alone in about 8 hours.
- **Quality gates.** Every requirement must be traced, every endpoint protected, and no contradictions allowed. The gates block export until fixed.

## Users

| Persona | Need |
|---|---|
| Non-technical founder | Turn a ChatGPT brainstorm into something a developer or agent can build without weeks of back-and-forth |
| Developer or small agency | Skip days of spec writing and get the "few prompts, few hours" build for client projects |

## MVP Scope

Accounts; projects; text, file, chat-export and Figma sources; fact extraction; gap interview; editable ledger; full pack generation; gates; zip export; usage and cost per project.

## Key Risks

1. Generated docs that sound right but are thin. Mitigated by templates for depth, required headings, and gates.
2. AI cost per pack. Mitigated by a budget, an estimate and per-call usage.
3. Prompt injection in sources. Mitigated by treating sources as data, validated JSON, and quote verification.
4. Users skipping the interview. Mitigated by founder defaults recorded as *assumed* and surfaced in the pack.
