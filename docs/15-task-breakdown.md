# Task Breakdown

| # | Task | Depends on | Requirements |
|---|---|---|---|
| 001 | project-setup | — | NFR-005, NFR-006 |
| 002 | database-schema-and-seed | 001 | FR-004 (data) |
| 003 | authentication | 002 | FR-001, FR-002, FR-003 |
| 004 | core-ai-ledger-and-pack-spec | 003 | FR-031, FR-032, FR-033 |
| 005 | projects-and-sources-api | 004 | FR-004–FR-009 |
| 006 | worker-and-source-processing | 005 | FR-010, FR-011, FR-012, FR-025, FR-026 |
| 007 | analysis-interview-and-ledger | 006 | FR-013–FR-017 |
| 008 | document-generation | 007 | FR-018–FR-024 |
| 009 | quality-gates | 008 | FR-027, FR-028, FR-029 |
| 010 | export-and-usage | 009 | FR-030, FR-031 |
| 011 | frontend-foundation | 010 | FR-001–FR-004 (UI) |
| 012 | workspace-ui | 011 | FR-005–FR-034 (UI), FR-034 |
| 013 | mcp-server-and-access-tokens | 012 | FR-035–FR-038 |
| 014 | testing-devops-and-observability | 013 | AC-01–AC-18, NFR-001–NFR-013 |
| 015 | documentation-and-final-polish | 014 | all |

The detailed files are in `docs/build/tasks/`.
