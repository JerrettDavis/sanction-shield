# Runbook: Deployment Failure

## Symptoms
- Vercel deployment fails
- CI checks fail on main branch
- `/api/health` returns error after deploy

## Diagnosis Steps

1. **Check Vercel build logs**
   ```bash
   npx vercel inspect <deployment-id> --logs
   ```

2. **Check CI status**
   ```bash
   gh run list --repo JerrettDavis/sanction-shield --limit 5
   gh run view <run-id> --log-failed
   ```

3. **Common causes**
   - Missing environment variables → Check Vercel project settings
   - Dependency install failure → Check `npm ci` output, try `npm cache clean --force`
   - TypeScript build error → Run `npm run build` locally
   - Lint failure → Run `npm run lint` locally
   - Next.js version vulnerability → Update to patched version

## Resolution

### Missing env vars
1. Go to Vercel → Project → Settings → Environment Variables
2. Verify all required vars are set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`
3. Redeploy

### Build failure
1. Pull latest main: `git pull origin main`
2. Clean install: `rm -rf node_modules && npm ci`
3. Run full pipeline: `npm run lint && npm run test:ci && npm run build`
4. Fix any errors, commit, push

### Rollback
1. In Vercel dashboard, go to Deployments
2. Find the last working deployment
3. Click "..." → Promote to Production
