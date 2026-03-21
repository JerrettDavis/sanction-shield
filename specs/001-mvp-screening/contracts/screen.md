# API Contract: POST /api/v1/screen

## Single Name Screening

### Request

```
POST /api/v1/screen
Authorization: Bearer sk_live_xxxxxxxxxxxx
Content-Type: application/json
```

```json
{
  "name": "BANCO NACIONAL DE CUBA",
  "entity_type": "organization",
  "threshold": 80,
  "lists": ["ofac_sdn", "eu_consolidated", "un_security_council"]
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | Yes | — | Name to screen (1-500 chars) |
| entity_type | enum | No | "any" | "individual", "organization", "vessel", "aircraft", "any" |
| threshold | integer | No | 80 | Minimum confidence score (0-100) to include in results |
| lists | string[] | No | all | Which sanctions lists to screen against |

### Response (200 OK)

```json
{
  "screened_at": "2026-03-21T20:30:00.000Z",
  "input": {
    "name": "BANCO NACIONAL DE CUBA",
    "entity_type": "organization",
    "threshold": 80
  },
  "matches": [
    {
      "confidence": 98,
      "list": "ofac_sdn",
      "entry": {
        "sdn_id": "4315",
        "entry_type": "organization",
        "primary_name": "BANCO NACIONAL DE CUBA",
        "aliases": ["BNC", "NATIONAL BANK OF CUBA"],
        "programs": ["CUBA"],
        "addresses": [
          { "city": "Havana", "country": "Cuba" }
        ],
        "ids": [
          { "type": "SWIFT/BIC", "value": "BNCCUHHX" }
        ],
        "remarks": "Linked to the Government of Cuba"
      }
    }
  ],
  "list_versions": {
    "ofac_sdn": "2026-03-20",
    "eu_consolidated": "2026-03-19",
    "un_security_council": "2026-03-15"
  },
  "request_id": "scr_abc123def456"
}
```

### Response (200 OK — No Matches)

```json
{
  "screened_at": "2026-03-21T20:30:00.000Z",
  "input": {
    "name": "Acme Corporation",
    "entity_type": "any",
    "threshold": 80
  },
  "matches": [],
  "list_versions": {
    "ofac_sdn": "2026-03-20",
    "eu_consolidated": "2026-03-19",
    "un_security_council": "2026-03-15"
  },
  "request_id": "scr_xyz789ghi012"
}
```

### Error Responses

**401 Unauthorized** — Invalid or missing API key
```json
{ "error": "invalid_api_key", "message": "API key is invalid or revoked" }
```

**400 Bad Request** — Invalid input
```json
{ "error": "validation_error", "message": "Name must be between 1 and 500 characters" }
```

**429 Too Many Requests** — Rate limit exceeded
```json
{ "error": "rate_limit", "message": "Rate limit exceeded. Retry after 60 seconds", "retry_after": 60 }
```

### Rate Limits

| Tier | Requests/min | Requests/day |
|------|-------------|-------------|
| Starter ($79/mo) | 30 | 1,000 |
| Growth ($149/mo) | 100 | 5,000 |
| Pro ($299/mo) | 300 | 25,000 |
