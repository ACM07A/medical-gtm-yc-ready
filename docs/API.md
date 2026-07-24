# API

Core demo APIs:

- `GET /api/health`
- `GET /api/readiness`
- `GET /api/metrics`
- `GET /api/session`
- `GET /api/cases`
- `GET /api/cases/:id`
- `POST /api/lead/ingest`
- `GET /api/studio`
- `POST /api/studio/approve`
- `GET /api/benchmarks`

Errors use:

```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Case not found or not authorized",
    "details": {}
  },
  "request_id": "local"
}
```

Demo role selection for API testing can be simulated with `X-Demo-User`, for example `hospital@medyatra.demo`.
