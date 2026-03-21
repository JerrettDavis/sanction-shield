# Tasks: SanctionShield MVP Screening

**Input**: Design documents from `specs/001-mvp-screening/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Initialize Next.js 15 project with TypeScript, App Router, and Tailwind CSS
- [ ] T002 [P] Configure Supabase project (free tier) with PostgreSQL database
- [ ] T003 [P] Configure Vitest for unit/integration testing
- [ ] T004 [P] Set up ESLint + Prettier with strict TypeScript config
- [ ] T005 [P] Create `.env.local` template with required environment variables (Supabase URL, anon key, service role key)
- [ ] T006 Deploy initial skeleton to Vercel (free tier) and verify deployment pipeline
- [ ] T007 [P] Install core dependencies: `@supabase/supabase-js`, `@supabase/ssr`, shadcn/ui components

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, auth, and core infrastructure that ALL user stories depend on

- [ ] T008 Create database schema migration in `supabase/migrations/001_initial_schema.sql`:
  - `organizations` table (id, name, created_at, settings JSONB)
  - `users` table (extends Supabase auth.users — org_id FK, role)
  - `api_keys` table (id, org_id, key_hash, name, created_at, last_used_at, revoked_at)
  - `sanctions_lists` table (id, source enum, version, downloaded_at, entry_count, raw_hash)
  - `sanctions_entries` table (id, list_id, sdn_id, entry_type enum, primary_name, aliases TEXT[], programs TEXT[], addresses JSONB, ids JSONB, remarks, name_trigram — with pg_trgm GIN index)
  - `screening_requests` table (id, org_id, user_id, request_type enum, input_name, batch_id, created_at)
  - `screening_results` table (id, request_id, entry_id, confidence_score INT, match_details JSONB)
  - `audit_log` table (id, org_id, event_type, details JSONB, created_at — append-only, no UPDATE/DELETE)
  - `watchlist_entries` table (id, org_id, name, entity_type, added_by, created_at)
  - Row-Level Security policies on ALL tables filtering by org_id
- [ ] T009 [P] Enable `pg_trgm` extension in Supabase and create trigram GIN index on `sanctions_entries.primary_name`
- [ ] T010 [P] Create `src/lib/db/client.ts` — Supabase client initialization (browser + server)
- [ ] T011 [P] Create `src/lib/db/queries.ts` — typed query helpers for all tables
- [ ] T012 Implement Supabase Auth integration in `src/lib/auth/session.ts` — login, register, session management
- [ ] T013 [P] Create API key middleware in `src/lib/auth/middleware.ts` — validate hashed API keys, rate limiting
- [ ] T014 Create dashboard layout in `src/app/(dashboard)/layout.tsx` — sidebar nav, org context, user menu
- [ ] T015 [P] Create auth pages in `src/app/(auth)/` — login, register, forgot password (Supabase Auth UI)

**Checkpoint**: Foundation ready — database, auth, API key validation, dashboard shell all functional

---

## Phase 3: User Story 1 — Single Name Screen (Priority: P1)

**Goal**: A user can submit a single name and get sanctions match results via API or dashboard

**Independent Test**: Submit "BANCO NACIONAL DE CUBA" → get high-confidence OFAC match. Submit "Acme Corp" → get clean result.

### Tests for User Story 1

- [ ] T016 [P] [US1] Unit test for name normalization in `tests/unit/matching/normalize.test.ts`
- [ ] T017 [P] [US1] Unit test for fuzzy matching algorithm in `tests/unit/matching/fuzzy.test.ts` — test Levenshtein, trigram, phonetic matching against known SDN names
- [ ] T018 [P] [US1] Unit test for OFAC SDN XML parser in `tests/unit/sanctions/ofac.test.ts`
- [ ] T019 [P] [US1] Contract test for `POST /api/v1/screen` in `tests/contract/api/screen.test.ts`

### Implementation for User Story 1

- [ ] T020 [US1] Create OFAC SDN list parser in `src/lib/sanctions/ofac.ts` — download XML from Treasury.gov, parse entries with names, aliases, programs, addresses, IDs
- [ ] T021 [P] [US1] Create EU Consolidated list parser in `src/lib/sanctions/eu.ts`
- [ ] T022 [P] [US1] Create UN sanctions list parser in `src/lib/sanctions/un.ts`
- [ ] T023 [US1] Create sanctions types in `src/lib/sanctions/types.ts` — shared `SanctionsEntry` interface
- [ ] T024 [US1] Create list update orchestrator in `src/lib/sanctions/updater.ts` — download, parse, diff, upsert to DB
- [ ] T025 [US1] Create name normalizer in `src/lib/matching/normalize.ts` — lowercase, strip diacritics, transliterate, normalize whitespace, handle "the", "ltd", "inc" etc.
- [ ] T026 [US1] Create fuzzy matching engine in `src/lib/matching/fuzzy.ts` — two-phase: pg_trgm similarity query + app-level phonetic/Levenshtein refinement
- [ ] T027 [US1] Create confidence scorer in `src/lib/matching/scorer.ts` — weighted combination of trigram similarity, phonetic match, exact substring match
- [ ] T028 [US1] Implement `POST /api/v1/screen` endpoint in `src/app/api/v1/screen/route.ts` — accepts `{ name, entity_type?, threshold? }`, returns `{ matches[], screened_at, list_versions }`
- [ ] T029 [US1] Create screening dashboard page in `src/app/(dashboard)/screen/page.tsx` — search input, results table with confidence badges, match details expandable
- [ ] T030 [US1] Create Vercel Cron job for daily list updates in `vercel.json` + `src/app/api/cron/update-lists/route.ts`
- [ ] T031 [US1] Seed database with initial OFAC SDN list download on first deployment
- [ ] T032 [US1] Add audit logging — every screening request + result written to `audit_log` table

**Checkpoint**: Single-name screening works end-to-end via API and dashboard. OFAC SDN list loaded and searchable.

---

## Phase 4: User Story 2 — Batch Screening (Priority: P2)

**Goal**: Upload a CSV of names, get a downloadable report with match results

**Independent Test**: Upload CSV with 100 names including 2 known SDN matches → report correctly identifies both.

### Tests for User Story 2

- [ ] T033 [P] [US2] Unit test for CSV parser in `tests/unit/sanctions/csv-upload.test.ts`
- [ ] T034 [P] [US2] Contract test for `POST /api/v1/batch` in `tests/contract/api/batch.test.ts`

### Implementation for User Story 2

- [ ] T035 [US2] Implement `POST /api/v1/batch` endpoint in `src/app/api/v1/batch/route.ts` — accepts CSV upload, queues screening, returns batch_id
- [ ] T036 [US2] Implement `GET /api/v1/batch/[id]` endpoint — returns batch status + results when complete
- [ ] T037 [US2] Create batch processing service in `src/lib/services/batch.ts` — iterate CSV rows, screen each, aggregate results
- [ ] T038 [US2] Create batch upload page in `src/app/(dashboard)/batch/page.tsx` — drag-and-drop CSV, progress bar, downloadable results
- [ ] T039 [US2] Generate CSV/XLSX report from batch results

**Checkpoint**: Batch CSV upload and download works. 500 names processed in under 60 seconds.

---

## Phase 5: User Story 3 — Automated Re-screening & Alerts (Priority: P3)

**Goal**: Watchlist names are automatically re-screened on list updates with email alerts

**Independent Test**: Add names to watchlist, trigger list update, verify new matches generate email alerts.

### Tests for User Story 3

- [ ] T040 [P] [US3] Integration test for watchlist re-screening flow in `tests/integration/screening/rescreen.test.ts`
- [ ] T041 [P] [US3] Unit test for alert email composition in `tests/unit/email/alerts.test.ts`

### Implementation for User Story 3

- [ ] T042 [US3] Implement watchlist CRUD API in `src/app/api/v1/watchlist/route.ts`
- [ ] T043 [US3] Create watchlist management page in `src/app/(dashboard)/watchlist/page.tsx` — add/remove names, view last scan status
- [ ] T044 [US3] Extend list updater to trigger watchlist re-screening after successful list update
- [ ] T045 [US3] Create email alert service in `src/lib/email/alerts.ts` — compose alert email with match details, send via Resend
- [ ] T046 [US3] Create notification settings in org settings — alert email addresses, threshold overrides

**Checkpoint**: Watchlist re-screening runs automatically on list updates. New matches trigger email alerts.

---

## Phase 6: User Story 4 — Audit Trail & Reports (Priority: P4)

**Goal**: Generate compliance reports for audit purposes

**Independent Test**: Generate Q1 report → includes all screening events with timestamps and results.

### Implementation for User Story 4

- [ ] T047 [US4] Implement `GET /api/v1/reports` endpoint — accepts date range, returns audit data
- [ ] T048 [US4] Create report generation service — aggregate audit log entries, format as structured report
- [ ] T049 [US4] Create reports page in `src/app/(dashboard)/reports/page.tsx` — date range picker, generate + download buttons
- [ ] T050 [US4] Implement CSV export for audit reports
- [ ] T051 [US4] Implement PDF export for audit reports (using @react-pdf/renderer or similar)

**Checkpoint**: Audit reports generate correctly with all screening history. Both CSV and PDF formats work.

---

## Phase 7: Polish & Launch

**Purpose**: Landing page, API docs, settings, and launch readiness

- [ ] T052 [P] Create landing page at `src/app/page.tsx` — value prop, pricing, CTA
- [ ] T053 [P] Create API documentation page — endpoint reference, authentication guide, example requests
- [ ] T054 [P] Create settings page in `src/app/(dashboard)/settings/page.tsx` — API key management (create, revoke, copy), confidence threshold config, org details
- [ ] T055 Implement Stripe integration for subscription billing ($79/$149/$299 tiers)
- [ ] T056 [P] Create onboarding flow — first-time user guide, initial list download progress
- [ ] T057 Security audit — verify RLS policies, API key hashing, rate limiting, input sanitization
- [ ] T058 Performance testing — verify p95 <500ms screening, batch throughput
- [ ] T059 [P] SEO + meta tags for landing page
- [ ] T060 Deploy to production Vercel + Supabase

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 — core screening engine
- **User Story 2 (Phase 4)**: Depends on Phase 3 (reuses screening engine)
- **User Story 3 (Phase 5)**: Depends on Phase 3 (reuses screening engine)
- **User Story 4 (Phase 6)**: Depends on Phases 3-5 (needs audit data from screening)
- **Polish (Phase 7)**: Depends on Phase 3 minimum, ideally all phases

### Parallel Opportunities

- US2 and US3 can run in parallel after US1 is complete
- All [P] tasks within a phase can run in parallel
- Landing page (T052) can be built in parallel with any phase

## Implementation Strategy

### MVP First (User Story 1 Only — Week 1-2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation
3. Complete Phase 3: Single Name Screening
4. **STOP and VALIDATE**: Test screening against known SDN entries
5. Start selling with API-only access while dashboard polishes

### Incremental Delivery

1. Week 1-2: Phases 1-3 → Single name screening works
2. Week 2-3: Phase 4 → Batch screening adds value
3. Week 3: Phase 5 → Watchlist monitoring justifies monthly subscription
4. Week 4: Phases 6-7 → Audit reports + launch
