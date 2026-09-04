# Configuration and secrets

- Task: `P2-ENG-03`
- Date: 2026-09-04
- Template: [`.env.example`](../../.env.example)

## Local setup

Copy `.env.example` to an untracked `.env`, then change only values required by the current task. The template contains safe local placeholders and deliberately empty credential fields. Do not put real tokens into the template, shell history, committed fixtures, test snapshots, logs or issue text.

Environment files matching `.env` and `.env.*` are ignored. `.env.example` is the only exception intended for version control.

## Variable classification

| Group | Variables | Visibility | Rule |
| --- | --- | --- | --- |
| Runtime | `APP_ENV`, `NODE_ENV`, `API_HOST`, `API_PORT`, `LOG_LEVEL` | Server process | Validate at startup; production does not accept unknown environment names |
| Database | `DATABASE_URL`, `DATABASE_SSL_MODE`, `DATABASE_POOL_MAX` | Server secret/config | `DATABASE_URL` is secret outside local development; never expose or log it |
| Source switches | `SOURCE_SYNC_ENABLED`, `SOURCE_*_ENABLED` | Worker config | False by default; API process does not execute source imports |
| Source network | `SOURCE_HTTP_TIMEOUT_MS`, `SOURCE_HTTP_MAX_RETRIES` | Worker config | Bounded timeouts/retries; provider-specific limits still apply |
| Snapshot policy | `RAW_SNAPSHOT_RETENTION_DAYS` | Worker config | Applies to raw audit objects; canonical provenance follows its own retention |
| Provider credentials | `REVE_API_KEY`, `MAPBOX_ACCESS_TOKEN` | Server secret | Empty in repository; inject from local secret store/CI/deployment runtime |
| Routing budget | `MAPBOX_MONTHLY_ELEMENT_BUDGET`, `MAPBOX_ELEMENTS_PER_SEARCH_MAX`, `MAPBOX_TIMEOUT_MS`, `ROUTE_CACHE_TTL_SECONDS` | Server config | Budget `0` disables paid misses; traffic max 9 elements; timeout max 10 s; cache max 15 min |
| OSM import | `OSM_PBF_PATH` | Worker path/config | Points to approved regional input; never configures public Overpass as app backend |
| API boundary | `CORS_ALLOWED_ORIGINS`, `RATE_LIMIT_MAX_PER_MINUTE` | Server config | Production origins are explicit; wildcard CORS is not a production default |
| Observability | `OTEL_EXPORTER_OTLP_ENDPOINT` | Server config/possibly secret | Treat authenticated endpoint URLs as secrets; redact headers/query credentials |
| Mobile-public | `EXPO_PUBLIC_APP_ENV`, `EXPO_PUBLIC_API_BASE_URL` | Public client bundle | Never store secrets, database URLs or provider tokens in `EXPO_PUBLIC_*` |

## Required-by-role policy

The template is comprehensive, but an executable validates only the variables relevant to its role.

### API

Required once the API is runnable:

- runtime host/port/environment;
- database connection and pool settings;
- explicit production CORS and rate limits.

Mapbox is optional. With a missing token or zero budget, the API returns `eta=null` and uses the documented straight-line fallback.

### Worker

Required once synchronization is runnable:

- runtime environment and database connection;
- global source synchronization switch;
- per-source enablement, timeout, retry and snapshot retention;
- credentials only for the specific enabled provider.

`SOURCE_ES_REVE_ENABLED=true` must fail startup unless `REVE_API_KEY` exists and the separate commercial/API approval flag introduced by the integration task is satisfied. `SOURCE_FR_PAN_DYNAMIC_SHADOW_ENABLED` must never make the source user-visible.

### Mobile

Only `EXPO_PUBLIC_*` variables may be embedded. `EXPO_PUBLIC_API_BASE_URL` points to Fuel Now's own API. The mobile client never receives Mapbox Matrix, Reve, database or source-import credentials.

## Production secret rules

- Inject secrets through the deployment platform or CI secret store; do not bake them into an OCI image.
- Use separate development, release-test and production credentials/resources.
- Grant least privilege and restrict provider tokens by API, origin/IP and spend limit where supported.
- Rotate any credential that appears in source control, logs, screenshots or chat; deletion from the latest commit is not enough because Git history retains it.
- Redact authorization headers, URL query tokens, database credentials and exact user coordinates from logs/errors.
- Fail startup when an enabled integration lacks its required secret; do not run partially configured with a surprising provider fallback.

## Safe defaults

- All source synchronization flags are `false`.
- Reve and OSM supplement are disabled.
- Mapbox monthly element budget is `0`, selecting the free straight-line fallback.
- API listens on loopback for local development.
- Local database credentials are clearly placeholders and must not be reused outside local Docker.

## Verification

- `.env.example` is tracked and contains empty provider credential values.
- `.env`, `.env.local`, `.env.development`, `.env.test` and `.env.production` are ignored.
- No `EXPO_PUBLIC_*` variable contains a secret/token/database value.
- Typecheck and unit tests continue to pass without any real credential.
