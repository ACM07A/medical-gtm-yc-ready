# Agent Integration Guide

Agents can use `/agent` or push leads into:

```http
POST /api/lead/ingest
X-Ingest-Token: demo-ingest-trudoc
content-type: application/json
```

```json
{
  "source": "trudoc-demo",
  "leads": [
    {
      "country": "NG",
      "treatment": "cardiac bypass",
      "phone": "+2345550123",
      "consent": true,
      "budget_band": "USD 8,000-15,000"
    }
  ]
}
```

The API maps country and treatment, minimizes contact handles, detects duplicates, records consent status and rejects malformed rows.
