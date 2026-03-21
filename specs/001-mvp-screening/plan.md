# Implementation Plan: SanctionShield MVP Screening

**Branch**: `001-mvp-screening` | **Date**: 2026-03-21 | **Spec**: `specs/001-mvp-screening/spec.md`

## Summary

Build a sanctions screening micro-SaaS with a REST API and Next.js dashboard. Core capability: fuzzy name matching against OFAC SDN, EU Consolidated, and UN sanctions lists. Deployed on free-tier infrastructure (Vercel + Supabase). First paying customer target: 21 days from start.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22+
**Primary Dependencies**: Next.js 15 (App Router), Supabase (Postgres + Auth + Edge Functions), Vercel (hosting + serverless)
**Storage**: PostgreSQL via Supabase (free tier: 500MB, sufficient for all sanctions lists + audit logs at MVP scale)
**Testing**: Vitest (unit + integration), Playwright (E2E dashboard flows)
**Target Platform**: Web (API + Dashboard), deployed on Vercel
**Project Type**: Web service (API + SPA dashboard)
**Performance Goals**: <500ms p95 single-name screening, 1000 names/60s batch, 10K requests/day
**Constraints**: Zero capital — free-tier only. Must handle OFAC SDN (~12K entries), EU (~2K entries), UN (~800 entries)
**Scale/Scope**: 10-50 organizations at MVP, 100-500 daily screening requests per org

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| Zero-Capital First | PASS | All services on free tier |
| Security by Default | PASS | Supabase RLS + encrypted at rest + TLS |
| Accuracy Over Speed | PASS | High-recall fuzzy matching, configurable threshold |
| Simplicity & YAGNI | PASS | Single deployable, REST API, cron for updates |
| Auditability is the Product | PASS | Every screening logged, audit reports built-in |

## Project Structure

### Documentation (this feature)

```text
specs/001-mvp-screening/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Sanctions list formats, matching algorithms
├── data-model.md        # Entity definitions and relationships
├── contracts/           # API endpoint contracts
│   ├── screen.md        # POST /api/v1/screen
│   ├── batch.md         # POST /api/v1/batch
│   ├── watchlist.md     # CRUD /api/v1/watchlist
│   └── reports.md       # GET /api/v1/reports
└── tasks.md             # Implementation task list
```

### Source Code (repository root)

```text
src/
├── app/                     # Next.js App Router
│   ├── (auth)/              # Auth pages (login, register, forgot-pw)
│   ├── (dashboard)/         # Authenticated dashboard pages
│   │   ├── screen/          # Single name screening page
│   │   ├── batch/           # Batch upload page
│   │   ├── watchlist/       # Watchlist management
│   │   ├── reports/         # Audit report generation
│   │   └── settings/        # Org settings, API keys, thresholds
│   ├── api/
│   │   └── v1/
│   │       ├── screen/      # POST - single name screening
│   │       ├── batch/       # POST - batch screening
│   │       ├── watchlist/   # CRUD - watchlist management
│   │       └── reports/     # GET - report generation
│   ├── layout.tsx
│   └── page.tsx             # Landing page
├── lib/
│   ├── matching/
│   │   ├── fuzzy.ts         # Levenshtein + phonetic matching engine
│   │   ├── normalize.ts     # Name normalization (transliteration, case, whitespace)
│   │   └── scorer.ts        # Confidence score calculation
│   ├── sanctions/
│   │   ├── ofac.ts          # OFAC SDN list parser (XML/CSV)
│   │   ├── eu.ts            # EU Consolidated list parser
│   │   ├── un.ts            # UN Security Council list parser
│   │   ├── updater.ts       # List download + update orchestrator
│   │   └── types.ts         # Shared sanctions entry types
│   ├── db/
│   │   ├── client.ts        # Supabase client initialization
│   │   ├── schema.sql       # Database schema (Supabase migrations)
│   │   └── queries.ts       # Typed query helpers
│   ├── auth/
│   │   ├── middleware.ts     # API key validation middleware
│   │   └── session.ts       # Dashboard session management
│   └── email/
│       └── alerts.ts        # Alert email composition + sending
├── components/
│   ├── ui/                  # Shared UI components (shadcn/ui)
│   ├── screening/           # Screening-specific components
│   └── layout/              # Dashboard layout components
└── supabase/
    ├── migrations/          # SQL migrations
    └── seed.sql             # Test data seeding

tests/
├── unit/
│   ├── matching/            # Fuzzy matching algorithm tests
│   └── sanctions/           # List parser tests
├── integration/
│   ├── api/                 # API endpoint tests
│   └── screening/           # End-to-end screening flow tests
└── contract/
    └── api/                 # API contract tests (request/response shapes)
```

**Structure Decision**: Single Next.js project (monolith). API routes colocated with the dashboard. This keeps deployment simple (single Vercel project), avoids CORS, and shares types between frontend and backend. Upgrade to separate API service only if free-tier limits are hit.

## Key Architecture Decisions

### 1. Sanctions List Storage Strategy

Store parsed sanctions entries in PostgreSQL, not in-memory. Reasons:
- Free-tier Vercel serverless functions have 1024MB memory limit — the full OFAC SDN list with aliases exceeds this when loaded as objects
- PostgreSQL full-text search + trigram indexes enable fast fuzzy matching at the DB level
- List updates are atomic — swap in new entries without downtime
- Query patterns align with SQL (filter by entity type, program, confidence threshold)

### 2. Fuzzy Matching Approach

Two-phase matching:
1. **Phase 1 (DB)**: PostgreSQL `pg_trgm` trigram similarity search — fast, catches most matches, runs on the DB server
2. **Phase 2 (App)**: Phonetic matching (Double Metaphone) + Levenshtein refinement on Phase 1 candidates — improves accuracy for transliterated names

This avoids loading all entries into app memory while maintaining high recall.

### 3. Multi-Tenancy

Supabase Row-Level Security (RLS) policies. Every table has an `org_id` column. RLS policies ensure queries only return rows matching the authenticated user's organization. No shared queries ever cross org boundaries.

### 4. List Update Strategy

Vercel Cron (free tier: 2 cron jobs) triggers daily at 06:00 UTC:
1. Download latest SDN XML from Treasury.gov
2. Parse and diff against current entries
3. Upsert new/changed entries, soft-delete removed entries
4. If watchlist re-screening is enabled, queue re-screening jobs
5. Log the update event with entry counts and diff summary

## Complexity Tracking

No constitution violations. All decisions align with Zero-Capital and Simplicity principles.

## 30-Day Milestone Plan

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| 1 | Core engine | OFAC parser + fuzzy matcher + single-name API endpoint |
| 2 | Dashboard + Auth | Login, single-name screening UI, API key management |
| 3 | Batch + Watchlist | CSV upload, watchlist CRUD, automated re-screening |
| 4 | Audit + Launch | Report generation, landing page, first customer outreach |
