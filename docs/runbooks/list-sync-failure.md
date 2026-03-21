# Runbook: Sanctions List Sync Failure

## Symptoms
- `/api/ready` shows `sanctions_data: warn` (OFAC not loaded)
- Screening results are empty for known sanctioned entities
- Cron job logs show download failures

## Diagnosis Steps

1. **Check data freshness via ready endpoint**
   ```bash
   curl https://your-app.vercel.app/api/ready | jq '.checks[] | select(.name == "sanctions_data")'
   ```

2. **Check cron execution**
   - Vercel → Project → Logs → Filter by "cron" or "update-lists"
   - Vercel → Project → Settings → Crons → verify schedule

3. **Manual trigger (with auth)**
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://your-app.vercel.app/api/cron/update-lists
   ```

## Common Causes

### Treasury.gov is down or rate-limiting
- OFAC downloads from `treasury.gov/ofac/downloads/` — occasionally slow
- Retry: wait 30 minutes and trigger again
- The app keeps the last known-good data if an update fails

### CRON_SECRET not set
- The cron endpoint requires `Authorization: Bearer <CRON_SECRET>`
- Vercel crons set this automatically IF the env var exists
- Verify in Vercel → Settings → Environment Variables

### Database full (Supabase free tier: 500MB)
- OFAC SDN is ~18K entries, roughly 10-20MB with indexes
- If approaching limit, consider upgrading Supabase or pruning old list versions
- Check: Supabase Dashboard → Database → Database Size

## Resolution

### Fresh seed from scratch
1. In Supabase SQL Editor, run:
   ```sql
   DELETE FROM sanctions_entries;
   DELETE FROM sanctions_lists;
   ```
2. Trigger the cron endpoint manually (see above)
3. Wait 30-60 seconds for download + parse + insert

### For local development
```bash
npx tsx scripts/seed-ofac.ts
```
