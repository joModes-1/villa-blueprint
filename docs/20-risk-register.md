# Risk Register

## Risks

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | Generated docs are shallow or generic | Medium | High | Templates as depth examples, required headings, format rules, reasoning model for core docs, golden test against the eu-portal pack | Product |
| R2 | Docs contradict each other | Medium | High | The ledger is the single truth; code-rendered index, tasks and agent files; G11 contradiction gate | Engineering |
| R3 | A model returns invalid JSON or empty output | High | Medium | Zod validation, one corrective retry, empty-output detection, job retries | Engineering |
| R4 | AI cost overruns | Medium | High | Per-project budget, estimate, usage per call | Product |
| R5 | Prompt injection through sources | High | Medium | Sources treated as data, quote verification, fact-ID checks, no tool use by the model | Engineering |
| R6 | Long jobs time out or duplicate | Medium | Medium | 240 s call timeout, 900 s job expiry, advisory lock in the scheduler, atomic run counters | Engineering |
| R7 | Users skip the interview and get a pack full of assumptions | High | Medium | Assumptions are labeled in the index and listed in 23; P0 keys without defaults are mandatory | Product |
| R8 | Parser failures on odd PDFs or exports | Medium | Low | Per-source failure that doesn't stop the run; clear error; plain-text fallback | Engineering |
| R9 | The packaged agent still has to guess | Low | High | Stop conditions in AGENTS.md; every P0 key closed; G01–G11 | Product |
