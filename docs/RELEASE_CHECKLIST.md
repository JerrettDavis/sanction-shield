# Release Checklist

## Pre-flight (before deploying to production)

### Code Quality
- [ ] `npm run lint` — zero errors
- [ ] `npm run test:ci` — all unit tests pass (22/22)
- [ ] `npm run build` — production build succeeds
- [ ] No TypeScript errors (`next build` includes type checking)
- [ ] No `console.log` in production code (use `logger` instead)

### Security
- [ ] No secrets in codebase (API keys, passwords, tokens)
- [ ] `sk_test_localdevelopment` blocked in production (`NODE_ENV=production` → 403)
- [ ] API key hashing verified (SHA-256, never stored plaintext)
- [ ] RLS policies active on all tenant-scoped tables
- [ ] Audit log is append-only (trigger prevents UPDATE/DELETE)
- [ ] CRON_SECRET is set and non-trivial
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` exposed to client (no `NEXT_PUBLIC_` prefix)

### Infrastructure
- [ ] All required env vars set in Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`
- [ ] Database migrations applied (check `/api/ready`)
- [ ] OFAC SDN data seeded (check `/api/ready` → `sanctions_data: pass`)
- [ ] Vercel cron configured for daily list updates
- [ ] Supabase project is on appropriate plan (free tier limits: 500MB DB, 50K MAU)

### E2E Validation
- [ ] `/api/health` returns `status: ok`
- [ ] `/api/ready` returns `ready: true` with all checks passing
- [ ] Single screening works: `BANCO NACIONAL DE CUBA` → HIGH match
- [ ] Single screening works: `Acme Corp` → CLEAR
- [ ] Login page renders at `/login`
- [ ] Registration page renders at `/register`
- [ ] Dashboard accessible after auth
- [ ] All sidebar nav links resolve (no 404s)
- [ ] Batch upload page renders at `/batch`
- [ ] Settings page renders at `/settings`

### CI/CD
- [ ] CI workflow passes on main (Node 20 + 22)
- [ ] CodeQL analysis completes without critical findings
- [ ] Dependabot PRs reviewed (no known vulnerable dependencies)
- [ ] E2E workflow passes with screenshot artifacts uploaded

## Go / No-Go Decision

| Category | Status | Notes |
|----------|--------|-------|
| Code quality | | |
| Security | | |
| Infrastructure | | |
| E2E validation | | |
| CI/CD | | |

**Decision:** [ ] GO / [ ] NO-GO

**Approved by:** _______________
**Date:** _______________

## Post-deployment

- [ ] Verify production URL loads landing page
- [ ] Run health + ready checks against production
- [ ] Test login flow in production
- [ ] Monitor Vercel logs for 15 minutes post-deploy
- [ ] Confirm first cron execution runs successfully
