# API

Core demo APIs:

- `GET /api/health`
- `GET /api/readiness`
- `GET /api/metrics`
- `GET /api/session`
- `GET /api/cases`
- `GET /api/cases/:id`
- `GET /api/cases/:id/documents`
- `GET /api/cases/:id/matches`
- `GET /api/cases/:id/reviews`
- `GET /api/cases/:id/estimates`
- `GET /api/cases/:id/messages`
- `GET /api/cases/:id/tasks`
- `GET /api/cases/:id/services`
- `GET /api/cases/:id/approvals`
- `GET /api/cases/:id/audit`
- `GET /api/approvals`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`
- `GET /api/tasks`
- `PATCH /api/tasks/:id`
- `GET /api/vendors`
- `GET /api/service-requests`
- `POST /api/service-requests`
- `GET /api/agent-runs`
- `GET /api/integrations`
- `GET /api/audit`
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
Case resources, agent runs, audit events and service requests are scoped to that user's organization and role.
Every server response includes `X-Request-Id`; callers may supply their own value in the same header for correlation.
