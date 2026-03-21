# Runbook: Migration Failure

## Symptoms
- `/api/ready` returns `migrations: fail`
- App starts but API calls return errors about missing tables
- Logs show `[SanctionShield] Migration runner failed`

## Diagnosis Steps

1. **Check `/api/ready` response**
   ```bash
   curl https://your-app.vercel.app/api/ready | jq
   ```

2. **Check Vercel function logs**
   - Vercel → Project → Logs → Filter by "migration"

3. **Common causes**
   - `POSTGRES_URL_NON_POOLING` not set → auto-migration can't run
   - Migration SQL syntax error → check SQL files in `supabase/migrations/`
   - Concurrent migration race → advisory lock should prevent, but check logs
   - Supabase project paused (free tier inactivity)

## Resolution

### Manual migration (if auto-migration unavailable)
1. Go to Supabase Dashboard → SQL Editor
2. Run migrations in order:
   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_search_function.sql
   supabase/migrations/003_auth_trigger.sql
   ```

### Supabase project paused
1. Go to Supabase Dashboard → your project
2. Click "Restore" if paused
3. Wait 2-3 minutes for database to come online
4. Redeploy or wait for next request to trigger migration check

### Migration SQL error
1. Check the specific migration file that failed
2. Run the SQL manually in Supabase SQL Editor to see the exact error
3. Fix the SQL, commit, push
4. The migration runner will skip already-applied migrations and apply the fixed one
