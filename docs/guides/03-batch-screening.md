# Guide: Batch Screening

> Based on BDD scenarios: `dashboard.spec.ts` — nav-02-batch

## Overview

Batch screening lets you upload a CSV of names and screen them all against sanctions lists in one operation. Results are downloadable as CSV.

## Uploading a Batch

1. Navigate to the **Batch** page from the sidebar

   ![Batch page — empty state](../../e2e/screenshots/nav-02-batch.png)

2. Click the upload area or drag-and-drop a CSV file

3. Your CSV must have a `name` column. Optionally include an `entity_type` column.

   Example CSV:
   ```csv
   name,entity_type
   "BANCO NACIONAL DE CUBA",organization
   "John Smith",individual
   "Acme Trading Co",organization
   ```

4. Set the confidence **threshold** (default: 80%)

5. Click **Upload & Screen**

## Monitoring Progress

After upload, the batch job runs in the background:

- **Status** shows: PROCESSING → COMPLETE (or FAILED)
- A **progress bar** shows completion percentage
- Results update every 2 seconds

## Downloading Results

When the batch completes, you'll see a summary:
- **Total** names screened
- **Clear** — names with no matches above threshold
- **Matches** — names that matched sanctions entries

Click **Download CSV** to get the full results with columns:
- `input_name` — the name you submitted
- `decision` — clear / review / potential_match
- `confidence` — match confidence (0-100)
- `band` — HIGH / REVIEW / LOW
- `matched_name` — the sanctions list entry that matched
- `matched_list` — which list (OFAC SDN, EU, UN)
- `programs` — sanctions programs (e.g., CUBA, IRAN)

## Limits

| Tier | Max rows per batch | Batches per day |
|------|-------------------|----------------|
| Starter | 1,000 | 10 |
| Growth | 3,000 | 50 |
| Pro | 5,000 | Unlimited |

## Using the API

```bash
# Upload CSV
curl -X POST https://your-app.vercel.app/api/v1/batch \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@customers.csv" \
  -F "threshold=80"

# Check status
curl https://your-app.vercel.app/api/v1/batch/BATCH_ID \
  -H "Authorization: Bearer YOUR_API_KEY"

# Download results
curl https://your-app.vercel.app/api/v1/batch/BATCH_ID/download?format=csv \
  -H "Authorization: Bearer YOUR_API_KEY" -o results.csv
```

## Tips

- Screen your entire customer/vendor list quarterly at minimum
- Set up watchlist monitoring for ongoing compliance (see Watchlist guide)
- Keep batch result CSVs for your compliance records — they're timestamped and include list versions
