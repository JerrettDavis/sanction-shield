# Feature Specification: SanctionShield MVP — OFAC/Sanctions Screening API & Dashboard

**Feature Branch**: `001-mvp-screening`
**Created**: 2026-03-21
**Status**: Draft
**Input**: Zero-capital recurring revenue SaaS for SMB sanctions compliance

## Product Overview

SanctionShield is a lightweight sanctions screening micro-SaaS that enables SMBs to screen customer, vendor, and partner names against authoritative government sanctions lists (OFAC SDN, EU Consolidated, UN Security Council). It provides an API + web dashboard with fuzzy matching, automated re-screening on list updates, and audit-ready compliance logs.

**Target Market**: Import/export SMBs, customs brokers, freight forwarders, law firms, fintech startups, any company doing international business that can't afford enterprise screening tools ($25K+/yr from Dow Jones, LexisNexis, Refinitiv).

**Pricing**: $79-299/mo usage-based tiers.

**Revenue Hook**: "The penalty for not screening is $330K per OFAC violation. Our tool is $99/mo."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single Name Screen (Priority: P1)

A compliance officer at a small import/export company needs to quickly check whether a new vendor or customer appears on any sanctions list before doing business with them.

**Why this priority**: This is the core value proposition. Without single-name screening, there is no product. Every other feature builds on this.

**Independent Test**: Can be fully tested by submitting a name via the API or dashboard search bar and receiving a match/no-match result with confidence score. Delivers immediate compliance value.

**Acceptance Scenarios**:

1. **Given** a user submits the name "BANCO NACIONAL DE CUBA", **When** the screening runs, **Then** the system returns a HIGH confidence match against the OFAC SDN list with the specific SDN entry details (ID, program, type, addresses, aliases).
2. **Given** a user submits "John Smith" (common name), **When** the screening runs, **Then** the system returns potential matches ranked by fuzzy match confidence with clear distinction between high/medium/low confidence.
3. **Given** a user submits "Acme Corp" (not sanctioned), **When** the screening runs, **Then** the system returns "No matches found" with a clean audit timestamp.
4. **Given** the OFAC SDN list has been updated within the last 24 hours, **When** a user runs a screen, **Then** results reflect the latest list version.

---

### User Story 2 - Batch Screening (Priority: P2)

A customs broker needs to screen their entire client list (100-5000 names) against sanctions lists on a regular basis.

**Why this priority**: Batch screening is the natural extension of single-name screening and is required for any company with an existing customer/vendor database. It significantly increases the value per customer.

**Independent Test**: Upload a CSV of names, receive a downloadable report with match results for each name.

**Acceptance Scenarios**:

1. **Given** a user uploads a CSV with 500 names, **When** batch screening completes, **Then** a downloadable report is generated with match/no-match status, confidence scores, and matched SDN entries for each name.
2. **Given** a batch job is running, **When** the user checks status, **Then** they see a progress indicator with estimated completion time.
3. **Given** a batch job completes, **When** the user views results, **Then** names are sortable by match confidence (highest risk first).

---

### User Story 3 - Automated Re-screening & Alerts (Priority: P3)

A compliance manager wants their existing customer list automatically re-screened whenever sanctions lists are updated, with email alerts for new matches.

**Why this priority**: This is the recurring-value driver. One-time screening is useful; continuous monitoring is what justifies a monthly subscription. This is what makes the product "sticky."

**Independent Test**: Configure a watchlist of names; when the SDN list updates, the system automatically re-screens and sends email alerts for any new matches.

**Acceptance Scenarios**:

1. **Given** a user has configured a watchlist of 200 names, **When** OFAC publishes a new SDN list update, **Then** all names are automatically re-screened within 4 hours.
2. **Given** automatic re-screening produces a new match, **When** the alert fires, **Then** the compliance officer receives an email with the matched name, SDN entry details, and a link to review in the dashboard.
3. **Given** automatic re-screening produces no new matches, **When** the scan completes, **Then** a "clean scan" log entry is created (no email — avoid alert fatigue).

---

### User Story 4 - Audit Trail & Compliance Reports (Priority: P4)

A company undergoing a compliance audit needs to produce evidence that they have been screening against sanctions lists and can demonstrate due diligence.

**Why this priority**: Audit readiness is a major selling point but requires Stories 1-3 to have data first. The audit log is automatically generated as a side effect of screening; this story adds the report generation and export.

**Independent Test**: Generate a PDF/CSV compliance report for a date range showing all screening activity, results, and resolution actions.

**Acceptance Scenarios**:

1. **Given** a company has been screening for 3 months, **When** they generate an audit report for Q1, **Then** the report includes every screening event, results, timestamps, user who initiated, and list version used.
2. **Given** a match was found and marked as "false positive — verified non-match", **When** the audit report is generated, **Then** the resolution action and the user who resolved it are included.

---

### Edge Cases

- What happens when a name contains non-Latin characters (Arabic, Cyrillic, Chinese)?
  - System must transliterate and match against known aliases
- How does the system handle the SDN list being temporarily unavailable from Treasury.gov?
  - Graceful fallback to last-known-good list with a warning banner
- What happens if a user screens a name that matches multiple SDN entries?
  - All matches returned, ranked by confidence score
- What if the fuzzy matching produces too many false positives for common names?
  - Configurable confidence threshold per organization (default: 80%)
- How are entity types handled (individuals vs. organizations vs. vessels)?
  - Entity type filtering available in both API and dashboard

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST download and parse the OFAC SDN list (XML and CSV formats) from Treasury.gov
- **FR-002**: System MUST download and parse the EU Consolidated sanctions list
- **FR-003**: System MUST download and parse the UN Security Council sanctions list
- **FR-004**: System MUST perform fuzzy name matching using at least Levenshtein distance and phonetic matching (Soundex/Metaphone)
- **FR-005**: System MUST return a confidence score (0-100) for each potential match
- **FR-006**: System MUST log every screening request with timestamp, input, results, list version, and requesting user
- **FR-007**: System MUST expose a REST API with JSON responses for programmatic integration
- **FR-008**: System MUST provide a web dashboard for manual screening and result review
- **FR-009**: System MUST support API key authentication for API access
- **FR-010**: System MUST auto-update sanctions lists daily (or within 4 hours of a published update)
- **FR-011**: System MUST support batch CSV upload and processing
- **FR-012**: System MUST generate downloadable audit reports (CSV and PDF)
- **FR-013**: System MUST send email alerts for new matches during re-screening
- **FR-014**: System MUST allow users to mark matches as "false positive" with documentation
- **FR-015**: System MUST enforce tenant isolation — each organization's data is completely isolated

### Non-Functional Requirements

- **NFR-001**: Single-name screening MUST complete in under 500ms (p95)
- **NFR-002**: Batch screening of 1000 names MUST complete in under 60 seconds
- **NFR-003**: System MUST be available 99.5% uptime (planned maintenance excluded)
- **NFR-004**: All data at rest MUST be encrypted (AES-256)
- **NFR-005**: All data in transit MUST use TLS 1.3
- **NFR-006**: System MUST run entirely on free-tier cloud infrastructure for MVP (Vercel/Cloudflare + Supabase/Neon)

### Key Entities

- **Organization**: Tenant — company using the service. Has API keys, users, subscription tier, screening settings.
- **ScreeningRequest**: A single name submission (or batch). Links to results, timestamp, initiating user.
- **ScreeningResult**: Match/no-match for a name against a specific sanctions entry. Includes confidence score, matched list, matched entry details.
- **SanctionsList**: Metadata about a downloaded list — source, version, download timestamp, entry count.
- **SanctionsEntry**: Parsed entry from a sanctions list — name, aliases, entity type, programs, addresses, IDs.
- **Watchlist**: Set of names configured for automatic re-screening.
- **AuditLog**: Immutable record of all screening activity per organization.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Single-name screening returns results in under 500ms (p95)
- **SC-002**: System correctly identifies known SDN entries with >95% recall (no sanctioned entity goes undetected)
- **SC-003**: False positive rate for common names is below 5% at default threshold
- **SC-004**: First paying customer within 21 days of MVP launch
- **SC-005**: System handles 10,000 screening requests/day on free-tier infrastructure
- **SC-006**: Sanctions list updates are ingested within 4 hours of publication
- **SC-007**: Audit report generation completes in under 10 seconds for 12 months of data
