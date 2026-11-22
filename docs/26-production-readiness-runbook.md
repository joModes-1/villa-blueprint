# Production Readiness Runbook

## Go-Live Checklist

| # | Check | How |
|---|---|---|
| 1 | All checks green on main | CI: lint, typecheck, test, build, e2e |
| 2 | Golden test passes with production models | `pnpm golden`: ≥ 80% decision match, 0 blockers, ≤ 3 USD |
| 3 | Env complete | Web and worker start without env errors; `NODE_ENV=production`; `APP_URL` is the HTTPS origin |
| 4 | Migrations applied | `pnpm db:deploy` exits 0 |
| 5 | Health | `GET /api/v1/health` returns `{ status: "ok", db: true }`; worker `GET /health` and mcp `GET :3102/health` return `ok`; an MCP client connected with a token can call `whoami` |
| 6 | Secure cookie | The `bp_session` cookie has `Secure` and `HttpOnly` set over HTTPS |
| 7 | Headers | The CSP and frame headers from `13` are present |
| 8 | Budget | `MAX_TOKENS_PER_PROJECT` is set deliberately |
| 9 | Backups | Provider daily backups enabled; restore tested once |
| 10 | Smoke test | Sign up, run one small project end to end with real AI, download the pack |

## Rollback

1. Redeploy the previous web and worker images.
2. Migrations are additive in the MVP, so the previous image runs against the new schema. If a migration must be reverted, restore the pre-release backup.
3. Runs that were in flight are retried by pg-boss after the worker restarts. Projects stuck in `failed` can be retried by users.
