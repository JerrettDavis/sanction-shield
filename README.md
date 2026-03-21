# SanctionShield

**Sanctions screening for SMBs.** Screen customers, vendors, and partners against OFAC SDN, EU Consolidated, and UN Security Council sanctions lists. Avoid $330K+ penalties with automated compliance.

## Features

- **Single-name screening** — sub-500ms fuzzy matching with confidence bands (HIGH/REVIEW/LOW)
- **Batch CSV screening** — upload thousands of names, get downloadable results
- **Audit trail** — append-only, immutable logs for every screening event
- **REST API** — JSON API with API key authentication for programmatic integration
- **Dashboard** — web UI for manual screening, results review, and settings
- **Auto-updating lists** — daily cron downloads latest sanctions data from authoritative sources
- **Zero-config local dev** — SQLite backend, no cloud secrets required

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│  Dashboard   │────▶│  Next.js API  │────▶│  Matching Engine │
│  (Next.js)   │     │  Routes       │     │  (fuzzy.ts)      │
└─────────────┘     └──────┬───────┘     └───────┬────────┘
                           │                      │
                    ┌──────▼───────┐     ┌───────▼────────┐
                    │  Auth Layer   │     │  Sanctions DB    │
                    │  (API Keys)   │     │  (pg_trgm/SQLite)│
                    └──────────────┘     └────────────────┘
```

**Two-phase matching:**
1. **Phase 1 (DB):** PostgreSQL `pg_trgm` trigram similarity (production) or SQLite LIKE search (local dev) — fast candidate retrieval
2. **Phase 2 (App):** Weighted confidence scoring — trigram (40%) + Levenshtein (30%) + phonetic (15%) + token overlap (15%)

**Dual backend:**
- **Local dev:** SQLite via `better-sqlite3` — zero config, `npm run dev` just works
- **Production:** Supabase PostgreSQL with Row-Level Security

## Quick Start

### Prerequisites

- Node.js 22+
- npm 10+

### Local Development

```bash
# Clone the repo
git clone https://github.com/JerrettDavis/sanction-shield.git
cd sanction-shield

# Install dependencies
npm install

# Seed OFAC SDN list (downloads ~18K entries from Treasury.gov)
npx tsx scripts/seed-ofac.ts

# Start dev server
npm run dev
```

The app runs at `http://localhost:3000` with a pre-configured dev API key: `sk_test_localdevelopment`

### Test the API

```bash
# Screen a name
curl -X POST http://localhost:3000/api/v1/screen \
  -H "Authorization: Bearer sk_test_localdevelopment" \
  -H "Content-Type: application/json" \
  -d '{"name": "BANCO NACIONAL DE CUBA"}'

# Expected: 100% HIGH confidence match
```

### Run Tests

```bash
npm test          # Run all tests
npm run test:ci   # Run tests in CI mode (no watch)
```

## API Reference

### Authentication

All API requests require a Bearer token:

```
Authorization: Bearer sk_live_your_api_key_here
```

### POST /api/v1/screen

Screen a single name against sanctions lists.

**Request:**
```json
{
  "name": "BANCO NACIONAL DE CUBA",
  "entity_type": "organization",
  "threshold": 80,
  "lists": ["ofac_sdn"]
}
```

**Response:**
```json
{
  "api_version": "2026-03-21",
  "decision": "potential_match",
  "decision_confidence": 100,
  "reason_codes": [],
  "screened_at": "2026-03-21T20:30:00.000Z",
  "matches": [{
    "confidence": 100,
    "band": "HIGH",
    "requires_review": false,
    "component_scores": { "trigram": 40, "levenshtein": 30, "phonetic": 15, "token_overlap": 15 },
    "list": "ofac_sdn",
    "entry": { "sdn_id": "306", "primary_name": "BANCO NACIONAL DE CUBA", "programs": ["CUBA"] }
  }],
  "request_id": "scr_abc123"
}
```

### POST /api/v1/batch

Upload a CSV for batch screening. Returns immediately with a batch ID.

### GET /api/v1/batch/:id

Check batch job status and progress.

### GET /api/v1/batch/:id/download

Download batch results as CSV or JSON (`?format=csv` or `?format=json`).

## Confidence Bands

| Band | Score | Decision | Action |
|------|-------|----------|--------|
| HIGH | >= 85 | `potential_match` | Block transaction, escalate to compliance |
| REVIEW | 60-84 | `review` | Manual review required |
| LOW | < 60 | `clear` | Auto-clear (below threshold) |

## Sanctions Lists

| List | Source | Entries | Update Frequency |
|------|--------|---------|-----------------|
| OFAC SDN | US Treasury (treasury.gov) | ~18,700 | Daily |
| EU Consolidated | European Union | ~2,000 | Planned |
| UN Security Council | United Nations | ~800 | Planned |

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.x
- **Database:** SQLite (dev) / Supabase PostgreSQL (prod)
- **Auth:** API key with SHA-256 hashing
- **Testing:** Vitest
- **Deployment:** Vercel
- **Styling:** Tailwind CSS 4

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth pages
│   ├── (dashboard)/        # Dashboard pages (screen, batch, settings)
│   └── api/v1/             # REST API routes
├── lib/
│   ├── matching/           # Fuzzy matching engine
│   │   ├── fuzzy.ts        # Two-phase screening orchestrator
│   │   ├── normalize.ts    # Name normalization + phonetic encoding
│   │   └── scorer.ts       # Confidence scoring algorithm
│   ├── sanctions/          # List parsers + updater
│   │   ├── ofac.ts         # OFAC SDN CSV parser
│   │   ├── updater.ts      # List download orchestrator
│   │   └── types.ts        # Shared types
│   ├── db/                 # Database adapters
│   │   ├── adapter.ts      # Common interface
│   │   ├── sqlite.ts       # Local dev adapter
│   │   ├── supabase-adapter.ts  # Production adapter
│   │   └── index.ts        # Auto-detecting factory
│   ├── auth/               # API key validation
│   └── services/           # Business logic (batch processing)
├── components/             # React components
tests/
├── unit/matching/          # Matching algorithm tests
└── contract/api/           # API contract tests
scripts/
├── seed-ofac.ts            # OFAC SDN data seeder
└── e2e-acceptance.ts       # E2E acceptance gate
```

## Environment Variables

### Required (Production)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `CRON_SECRET` | Secret for cron endpoint authentication |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `RESEND_API_KEY` | Resend API key for email alerts | — |

**Local dev requires no environment variables.** SQLite is used automatically when Supabase vars are absent.

## Security

- API keys are SHA-256 hashed at rest — never stored in plaintext
- Test API key (`sk_test_localdevelopment`) is blocked in production (`NODE_ENV=production`)
- Row-Level Security enforces tenant isolation in production
- Audit log is append-only with database trigger protection
- All data encrypted in transit (TLS) and at rest (Supabase encryption)

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## License

MIT — see [LICENSE](LICENSE) for details.
