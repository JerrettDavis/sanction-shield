# Guide: Run a Single Sanctions Screen

> Based on BDD scenarios: `screening.spec.ts` — screen-01 through screen-04

## Overview

Single-name screening checks a name against OFAC SDN, EU Consolidated, and UN Security Council sanctions lists. Results include a confidence score, match band (HIGH/REVIEW/LOW), and a decision (clear/review/potential_match).

## Screening a Name

1. Navigate to the **Screen** page from the sidebar

   ![Screening page — empty state](../../e2e/screenshots/screen-01-empty-state.png)

2. Enter the name to screen in the search box

   ![Name entered](../../e2e/screenshots/screen-02-input-filled.png)

3. Optionally adjust:
   - **Entity type** — filter to Individual, Organization, Vessel, or Aircraft
   - **Threshold** — minimum confidence score (default: 80%)

4. Click **Screen**

## Understanding Results

### Match Found (Potential Match)

When a name matches a sanctions list entry:

![Match result](../../e2e/screenshots/screen-03-match-result.png)

The result card shows:
- **Confidence score** — 0-100% with color-coded band
- **Band** — HIGH (>=85%, red), REVIEW (60-84%, amber), LOW (<60%, blue)
- **Matched entity** — name, aliases, programs, SDN ID
- **Requires Review** flag — set for ambiguous matches

### No Match (Clear)

When a name doesn't match any sanctions entry:

![Clear result](../../e2e/screenshots/screen-04-clear-result.png)

A green checkmark confirms the name is clear, with the sanctions list versions used.

## Confidence Bands Explained

| Band | Score | Decision | Recommended Action |
|------|-------|----------|-------------------|
| HIGH | >= 85% | `potential_match` | Block transaction, escalate to compliance officer |
| REVIEW | 60-84% | `review` | Manual review required before proceeding |
| LOW | < 60% | `clear` | Auto-cleared (below threshold) |

## Component Scores

Each match includes a breakdown of how the confidence was calculated:

| Component | Weight | What It Measures |
|-----------|--------|-----------------|
| Trigram | 40% | Character-level similarity (catches typos, transliterations) |
| Levenshtein | 30% | Edit distance (how many character changes to transform one name into the other) |
| Phonetic | 15% | Sound-alike matching (catches different spellings of the same name) |
| Token overlap | 15% | Word-level matching (catches partial name matches, reordering) |

## Using the API

For programmatic screening, use the REST API:

```bash
curl -X POST https://your-app.vercel.app/api/v1/screen \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "BANCO NACIONAL DE CUBA", "entity_type": "organization"}'
```

See the [API Reference](../../README.md#api-reference) for full documentation.

## Tips

- Screen both the **full legal name** and any **trade names / DBAs** separately
- For individuals, try both "FIRSTNAME LASTNAME" and "LASTNAME, FIRSTNAME" formats
- Lower the threshold to 60% for an initial sweep, then tighten to 80% for ongoing screening
- Every screening is logged in the audit trail for compliance reporting
