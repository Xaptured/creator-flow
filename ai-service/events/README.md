# Lambda event fixtures

API Gateway **v2** (HTTP API) proxy events for local Runtime Interface Emulator
testing. See `docs/ai-service-lambda-packaging.md` §7–§8 for the full procedure.

`@codegenie/serverless-express` accepts both v1 and v2 payloads at runtime, so a
v1 fixture would pass a local test and prove nothing about production. These are
genuine v2: `version: "2.0"`, `requestContext.http.{method,path}`, `rawPath`,
no `httpMethod`, no `multiValueHeaders`.

| Fixture | Route | Guard |
|---|---|---|
| `apigw-health.json` | `GET /api/health` | none |
| `apigw-embeddings-backfill.json` | `POST /api/embeddings/backfill` | `x-internal-api-key` |
| `apigw-analytics-summary.json` | `GET /api/analytics/summary/{ownerId}` | `x-internal-api-key` |
| `apigw-insights.json` | `GET /api/ai/insights` | Keycloak JWT, role `CREATOR` |

## No real secrets here

Every credential is the literal string `REPLACE_AT_INVOKE_TIME`. Substitute at
invoke time so a leaked key can never arrive via a committed fixture:

```bash
jq --arg k "$INTERNAL_API_KEY" \
   '.headers["x-internal-api-key"] = $k' \
   ai-service/events/apigw-analytics-summary.json \
| curl -s -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d @-
```

Materialised copies carrying a real token must be named `*.local.json` — that
pattern is gitignored.

## `rawPath` carries no stage prefix

`createApp()` sets `app.setGlobalPrefix('api')`, so routes are `/api/...`. With a
*staged* HTTP API, `rawPath` would arrive as `/$default/api/ai/insights` and Nest
would return 404. These fixtures assume the `$default` stage with auto-deploy —
CF-117 must match, or strip the stage in the integration.
