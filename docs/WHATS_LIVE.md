# What's Live — SanctionShield Production Status

**Last Updated:** 2026-03-22
**Version:** v0.2.0-production-ready
**URL:** https://sanction-shield.vercel.app

## Live Features

### Screening
- Single-name screening via dashboard and REST API
- Three-strategy fuzzy matching (trigram + word similarity + alias matching)
- Confidence bands: HIGH (>= 85%), REVIEW (60-84%), LOW (< 60%)
- Component score breakdown per match
- Decision object: `clear` / `review` / `potential_match`

### Batch Processing
- CSV upload with up to 5,000 names
- Async background processing with progress tracking
- Downloadable CSV/JSON results

### Data
- OFAC SDN: 18,714 entries (updated daily via Vercel Cron at 06:00 UTC)
- EU Consolidated: not yet ingested
- UN Security Council: not yet ingested

### Auth & Multi-tenancy
- Email/password registration with email confirmation
- Login with cookie-based sessions
- Password reset flow
- Org auto-creation on signup
- Row-Level Security for tenant isolation
- API key management (SHA-256 hashed)

### Dashboard Pages
- `/screen` — single name screening
- `/batch` — CSV batch upload
- `/watchlist` — name monitoring (UI ready, backend wiring pending)
- `/reports` — compliance report generation (UI ready, backend wiring pending)
- `/settings` — org config, threshold, API key CRUD

### Marketing
- Signed-out landing page with pricing, features, how-it-works
- Social proof strip targeting verticals
- Lighthouse: Performance 100, Accessibility 93+, SEO 91+

### Infrastructure
- Vercel deployment with auto-deploy from GitHub main
- Supabase PostgreSQL with auto-migration runner
- SQLite for zero-config local development
- Health (`/api/health`) and readiness (`/api/ready`) endpoints
- Daily OFAC cron with Vercel Cron Jobs

### CI/CD
- GitHub Actions: lint + test + build (Node 20 + 22)
- Playwright E2E: 18 BDD scenarios with screenshot artifacts
- CodeQL security scanning (weekly + PR)
- Dependabot for dependency updates

### Documentation
- 4 user guides (register, screening, batch, ops)
- 4 operational runbooks (deploy, migration, auth, list sync)
- Release checklist
- Matcher quality report
- API reference in README

## Next Planned Upgrades

### High Priority
- [ ] EU Consolidated + UN Security Council list parsers and ingestion
- [ ] Watchlist backend: persistent storage + automated re-screening on list updates
- [ ] Reports backend: date-range audit report generation (CSV/PDF export)
- [ ] Stripe integration for subscription billing

### Medium Priority
- [ ] Email alerts for watchlist matches (Resend integration)
- [ ] API rate limiting per tier
- [ ] Dashboard analytics events (CTA click tracking)
- [ ] Multi-user support per organization

### Lower Priority
- [ ] Custom domain setup
- [ ] API webhook callbacks for batch completion
- [ ] Sandbox/demo mode for marketing
- [ ] i18n support
