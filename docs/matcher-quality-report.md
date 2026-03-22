# Matcher Quality Report

**Date:** 2026-03-22
**OFAC SDN Version:** 2026-03-21
**Entries:** 18,714
**Default Threshold:** 80%

## Scoring Algorithm

Four-component weighted score with word containment boost:

| Component | Weight | Description |
|-----------|--------|-------------|
| Trigram (Jaccard) | 40% | Character-level n-gram overlap |
| Levenshtein | 30% | Edit distance normalized by max length |
| Phonetic | 15% | Consonant skeleton similarity |
| Token Overlap | 15% | Word-level matching with exact-token bonus |

**Word containment boost:** When all query tokens appear in the candidate name (or vice versa), the scorer applies an 85%+ base score regardless of trigram/Levenshtein ratios. This handles short-query-in-long-name cases like "SBERBANK" matching "PUBLIC JOINT STOCK COMPANY SBERBANK OF RUSSIA".

## DB Search Strategy

Three-strategy UNION in PostgreSQL:

1. **Trigram similarity** (`similarity()` >= 0.2) — standard fuzzy
2. **Word similarity** (`word_similarity()` with `%` operator) — whole-word containment
3. **Alias word similarity** — same as #2 against alternate names

## Verified Test Cases

### Expected HIGH Matches (>= 85%)

| Query | Matched Entry | Confidence | Band | Status |
|-------|--------------|------------|------|--------|
| BANCO NACIONAL DE CUBA | BANCO NACIONAL DE CUBA (SDN 306) | 100% | HIGH | PASS |
| SBERBANK | PUBLIC JOINT STOCK COMPANY SBERBANK OF RUSSIA | 88% | HIGH | PASS |
| VLADIMIR PUTIN | PUTIN, Vladimir Vladimirovich (SDN 35096) | 95% | HIGH | PASS |
| SBERBANK EUROPE AG | SBERBANK EUROPE AG | 93% | HIGH | PASS |

### Expected CLEAR (No Match)

| Query | Result | Confidence | Status |
|-------|--------|------------|--------|
| Acme Corporation | CLEAR | — | PASS |
| Microsoft Corporation | CLEAR | — | PASS |
| Toyota Motor Company | CLEAR | — | PASS |
| John Williams | CLEAR | — | PASS |

### Expected CLEAR (Not on OFAC SDN)

| Query | Result | Note | Status |
|-------|--------|------|--------|
| AEROFLOT | CLEAR | EU/UK sanctioned, not OFAC SDN | PASS (correct) |

### False Positive Controls

| Query | Candidate | Confidence | Band | Status |
|-------|-----------|------------|------|--------|
| ACME CORPORATION | KANGEN MARITIME CORPORATION | 42% | LOW | PASS (filtered) |
| MICROSOFT | BRAVERY MARITIME CORPORATION | 5% | LOW | PASS (filtered) |
| TOYOTA | TOYOTETSU CANADA INC. | 19% | LOW | PASS (filtered) |

## Confidence Band Thresholds

| Band | Score Range | Decision | Recommended Action |
|------|-----------|----------|-------------------|
| HIGH | >= 85% | `potential_match` | Block, escalate to compliance |
| REVIEW | 60-84% | `review` | Manual review required |
| LOW | < 60% | `clear` | Auto-cleared |

## Known Limitations

1. **Single-list coverage:** Currently only OFAC SDN. EU Consolidated and UN Security Council not yet ingested.
2. **Name format sensitivity:** "LASTNAME, FIRSTNAME" format (common in OFAC) may score differently than "FIRSTNAME LASTNAME" input. Word containment boost mitigates this.
3. **Non-Latin characters:** Limited support. Arabic, Cyrillic, and CJK names rely on any Latin transliterations present in the SDN data.
4. **Very short queries:** Single-word queries under 3 characters are filtered from token matching to reduce noise.
