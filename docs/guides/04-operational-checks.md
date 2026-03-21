# Guide: Operational Checks

> Based on BDD scenarios: `ops.spec.ts` — health, ready, auth rejection

## Health Check

The `/api/health` endpoint confirms the application is running:

```bash
curl https://your-app.vercel.app/api/health | jq
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-21T21:00:00.000Z",
  "version": "0.1.0",
  "environment": "production",
  "uptime_seconds": 3600
}
```

This is a **liveness probe** — it always returns 200 if the process is alive.

## Readiness Check

The `/api/ready` endpoint verifies the app is ready to serve traffic:

```bash
curl https://your-app.vercel.app/api/ready | jq
```

Response (healthy):
```json
{
  "ready": true,
  "timestamp": "2026-03-21T21:00:00.000Z",
  "checks": [
    { "name": "environment", "status": "pass", "message": "Production (Supabase)" },
    { "name": "database", "status": "pass", "message": "Connected and responsive", "latency_ms": 12 },
    { "name": "migrations", "status": "pass", "message": "Schema current" },
    { "name": "sanctions_data", "status": "pass", "message": "OFAC SDN: 2026-03-21" }
  ]
}
```

Returns **200** if ready, **503** if any check fails.

### Common Warning States

| Check | Status | Meaning | Action |
|-------|--------|---------|--------|
| sanctions_data | warn | OFAC SDN not loaded | Trigger cron: `GET /api/cron/update-lists` with Bearer token |
| database | fail | DB unreachable | Check Supabase status, verify env vars |
| migrations | fail | Tables missing | Run migrations manually (see runbook) |

## API Authentication

All API endpoints require a Bearer token:

```bash
# This works
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://your-app.vercel.app/api/v1/screen \
  -d '{"name": "test"}'

# This returns 401
curl https://your-app.vercel.app/api/v1/screen \
  -d '{"name": "test"}'
```

The cron endpoint uses `CRON_SECRET` instead of user API keys.

## Monitoring Checklist

Daily:
- [ ] `/api/health` returns `status: ok`
- [ ] `/api/ready` returns `ready: true`
- [ ] `sanctions_data` check shows today's date

Weekly:
- [ ] Review Vercel function logs for errors
- [ ] Check Supabase database size (free tier: 500MB)
- [ ] Verify cron job executed (check audit log)

## Runbooks

For troubleshooting specific failure modes:
- [Deployment Failure](../runbooks/deployment-failure.md)
- [Migration Failure](../runbooks/migration-failure.md)
- [Auth Failure](../runbooks/auth-failure.md)
- [List Sync Failure](../runbooks/list-sync-failure.md)
