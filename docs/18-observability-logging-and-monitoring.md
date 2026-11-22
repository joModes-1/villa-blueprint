# Observability, Logging and Monitoring

## Logging

- `pino` JSON to stdout, with `pino-pretty` only when `NODE_ENV=development`. Level from `LOG_LEVEL`.
- Redaction paths: `password`, `token`, `*.token`, `cookie`, `headers.cookie`, `headers.authorization`, `apiKey`, `OPENROUTER_API_KEY`.
- Web: one line per request, `{ requestId, method, path, status, ms, userId? }`. Errors add `{ code }`, plus `err.stack` for 500s.
- Worker: one line per job start and end, `{ queue, jobId, projectId, runId, ms, outcome }`. One line per AI call, `{ tag, model, tokensIn, tokensOut, costUsd, ms, attempt }`, and never the content.
- MCP: one line per tool call, `{ tool, ms, ok }`. Never arguments, results or tokens.

## Metrics

There is no metrics server in the MVP. Operational numbers come from the database:

| Number | Query source |
|---|---|
| AI spend per day | `usage_events` grouped by `date(createdAt)` |
| Failed runs | `pipeline_runs` where `status = failed` |
| Average generation time | `pipeline_runs` `finishedAt - createdAt` where `stage = generate` |
| Gate blocker rate | `gate_findings` where `severity = blocker`, per project |

## Alerts

| Signal | Threshold | Action |
|---|---|---|
| Web health failing | 2 consecutive checks | Host restarts the process; check DB connectivity |
| Worker health failing | 2 consecutive checks | Host restarts the process; pg-boss resumes expired jobs |
| Failed runs | > 5 in 1 hour | Inspect worker logs for the run IDs; usually provider errors |
| Daily AI spend | > configured budget | Lower `MAX_TOKENS_PER_PROJECT` or switch models |
