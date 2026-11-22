# Non-Functional Requirements

## Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-001 | Non-AI API response time | p95 < 300 ms with 50 projects per user, local Postgres |
| NFR-002 | Analysis time with a real model | ≤ 3 min for 50,000 source characters |
| NFR-003 | Full generation time | ≤ 25 min with real models; ≤ 60 s end to end with the mock AI |
| NFR-004 | Cost per pack with default models | ≤ 3 USD for a 50,000-character input (measured in the golden test) |
| NFR-005 | Unit test coverage of `packages/core` | ≥ 80% lines |
| NFR-006 | Full automated test run (unit + API + E2E) | ≤ 5 min on a developer laptop |
| NFR-007 | Zip export time | ≤ 5 s for a 40-file pack |
| NFR-008 | Worker crash recovery | Jobs resume within 60 s after the worker restarts (pg-boss expiry and retry) |
| NFR-009 | Text contrast | ≥ 4.5:1 for all body text |
| NFR-010 | Availability | 99.5% monthly for web |
| NFR-011 | Secrets in logs | 0 occurrences of password, token, cookie or API key values (checked by a logger unit test) |
| NFR-012 | Upload limits | 10 MB per file, 20 files, 400,000 characters per project |
| NFR-013 | Page weight | Workspace page JS ≤ 300 KB gzipped |
