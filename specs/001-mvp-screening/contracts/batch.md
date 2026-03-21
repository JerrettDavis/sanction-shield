# API Contract: Batch Screening

## POST /api/v1/batch — Submit Batch

### Request

```
POST /api/v1/batch
Authorization: Bearer sk_live_xxxxxxxxxxxx
Content-Type: multipart/form-data
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | file (CSV) | Yes | CSV with at least a "name" column. Optional: "entity_type" column. Max 5000 rows. |
| threshold | integer | No | Default: 80. Minimum confidence score. |
| lists | string | No | Comma-separated list IDs. Default: all. |

### Response (202 Accepted)

```json
{
  "batch_id": "bat_abc123",
  "status": "processing",
  "total_names": 500,
  "created_at": "2026-03-21T20:30:00.000Z",
  "estimated_completion": "2026-03-21T20:31:00.000Z"
}
```

## GET /api/v1/batch/:id — Check Status / Get Results

### Response (200 OK — Processing)

```json
{
  "batch_id": "bat_abc123",
  "status": "processing",
  "total_names": 500,
  "processed": 247,
  "matches_found": 3,
  "progress_pct": 49
}
```

### Response (200 OK — Complete)

```json
{
  "batch_id": "bat_abc123",
  "status": "complete",
  "total_names": 500,
  "processed": 500,
  "matches_found": 3,
  "completed_at": "2026-03-21T20:31:02.000Z",
  "results_url": "/api/v1/batch/bat_abc123/download",
  "summary": {
    "high_confidence": 2,
    "medium_confidence": 1,
    "low_confidence": 0,
    "clean": 497
  }
}
```

## GET /api/v1/batch/:id/download — Download Results

Returns CSV with columns: `input_name, status, confidence, matched_name, matched_list, sdn_id, programs, screened_at`
