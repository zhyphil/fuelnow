# Fuel Now API

Fuel Now exposes one versioned JSON API for nearby Fuel, Charge, Air and Wash
discovery. V1 is public and does not require authentication. Every response is
private and non-cacheable at the HTTP boundary.

The generated OpenAPI 3.0 contract is available from a running API at
`GET /v1/openapi.json`. It is built from the same TypeBox schemas used for runtime
validation, so route parameters and response shapes cannot drift into a separate
hand-maintained specification.

## Nearby search

```http
GET /v1/nearby?latitude=43.6047&longitude=1.4442&country=FR&service=fuel&fuelType=diesel&radius=10000&sort=cheapest
```

`latitude`, `longitude` and `service` are required. `country` is optional and may
be `FR` or `ES`; omitting it permits a cross-border search. `radius` is an integer
from 1 through 50,000 metres. When omitted, the API starts at 10 km and expands
to at most 50 km if fewer than ten candidates are found.

| Parameter        | Values                                    | Compatibility                                               |
| ---------------- | ----------------------------------------- | ----------------------------------------------------------- |
| `service`        | `fuel`, `charging`, `air`, `wash`         | Required                                                    |
| `sort`           | `nearest`, `cheapest`, `open_now`, `best` | Optional; defaults to `nearest`                             |
| `fuelType`       | Canonical Fuel enum in OpenAPI            | Fuel only                                                   |
| `connectorType`  | Selectable connector enum in OpenAPI      | Charge only                                                 |
| `minimumPowerKw` | 1–1,000                                   | Charge only; the same connector must satisfy type and power |

Useful requests:

```bash
curl --get 'http://localhost:3000/v1/nearby' \
  --data-urlencode 'latitude=43.6047' \
  --data-urlencode 'longitude=1.4442' \
  --data-urlencode 'service=fuel' \
  --data-urlencode 'fuelType=diesel' \
  --data-urlencode 'sort=cheapest'

curl --get 'http://localhost:3000/v1/nearby' \
  --data-urlencode 'latitude=41.3874' \
  --data-urlencode 'longitude=2.1686' \
  --data-urlencode 'service=charging' \
  --data-urlencode 'connectorType=ccs_combo_2' \
  --data-urlencode 'minimumPowerKw=150' \
  --data-urlencode 'sort=best'

curl --get 'http://localhost:3000/v1/nearby' \
  --data-urlencode 'latitude=48.8566' \
  --data-urlencode 'longitude=2.3522' \
  --data-urlencode 'service=air' \
  --data-urlencode 'sort=open_now'

curl --get 'http://localhost:3000/v1/nearby' \
  --data-urlencode 'latitude=40.4168' \
  --data-urlencode 'longitude=-3.7038' \
  --data-urlencode 'service=wash'
```

The response's `ranking` object says whether the requested decision mode was
available, which sort was actually applied and why it degraded. `outcome`
separates empty searches from partial data and supplies stable warning, empty
reason and fallback codes for client localization. Unknown evidence remains
Unknown; it is never converted into a positive price, opening or equipment claim.

See the contract-checked [Fuel Cheapest response](./examples/nearby-fuel-cheapest.json)
and [empty response](./examples/nearby-empty.json).

## Service-point detail

```bash
curl 'http://localhost:3000/v1/service-points/00000000-0000-4000-8000-000000000201'
```

`GET /v1/service-points/:id` requires a canonical UUID. It returns stable point
identity, address, timezone, opening and lifecycle fields plus a service-specific
evidence block for every declared service. See the contract-checked
[detail response](./examples/service-point-detail.json).

## Errors and operational limits

All errors use the same shape:

```json
{
  "requestId": "example-request-id",
  "code": "rate_limit_exceeded",
  "message": "Rate limit exceeded",
  "retryable": true
}
```

| Status | Meaning                                                        |
| ------ | -------------------------------------------------------------- |
| `400`  | Invalid input or incompatible filters                          |
| `404`  | Unknown route or canonical service point                       |
| `413`  | Request body exceeds the configured limit                      |
| `429`  | Per-client request limit exceeded; consult `retry-after`       |
| `500`  | Unexpected server failure; implementation details are withheld |

Browser requests must come from the configured CORS allowlist. Production also
requires HTTPS. Forwarded client/protocol headers are trusted only from configured
proxy IPs or CIDRs. The precise search origin is sent to the spatial query but is
not returned, stored or written to URL-bearing request logs.

The complete error example is available in
[error-response.json](./examples/error-response.json). Run `pnpm api:start` from
the repository root after configuring `.env` to inspect the live contract.
