# API input validation, rate limiting and security boundary

- Task: `P3-API-08`
- Date: 2026-09-04
- Scope: Backend Fastify API

## Outcome

The two public read endpoints now share a defensive HTTP boundary. Existing
TypeBox schemas reject missing, unknown, cross-service and out-of-range query or
path values before data access. The application also enforces bounded request
bodies, client throttling, browser-origin policy, secure transport, response
headers and coordinate-safe request logging.

## Runtime limits

| Control | Default | Accepted configuration |
| --- | --- | --- |
| Requests per client | 60/minute | `RATE_LIMIT_MAX_PER_MINUTE`, integer 1–10,000 |
| Request body | 16,384 bytes | `API_BODY_LIMIT_BYTES`, integer 1,024–1,048,576 |
| Browser origins | `http://localhost:8081` outside production | comma-separated exact HTTP(S) origins; production requires explicit HTTPS |
| Trusted proxies | none | at most 20 unique explicit IP or CIDR entries in `API_TRUSTED_PROXIES` |
| Request receipt timeout | 15 seconds | fixed for this API version |
| Route parameter length | 100 characters | fixed before UUID validation |

The limiter key is Fastify's resolved client IP. Forwarded headers do not affect
that IP unless the direct peer matches the explicit trusted-proxy list. This
prevents callers from bypassing the limiter by rotating a forged
`X-Forwarded-For` value. Unknown routes use the limiter too, reducing endpoint
probing.

The current limiter store is an in-memory LRU capped at 10,000 client keys. It is
appropriate for the single-process release-test deployment. A horizontally
scaled public deployment must use a shared limiter store and verify failure
behavior before traffic is split across instances.

## Browser and transport policy

CORS grants browser access only to configured origins and allows GET, HEAD and
OPTIONS with no credentials. This is a browser policy, not authentication;
native clients can still call the public read API and remain subject to input
validation and rate limiting.

Production/release-test behavior rejects plain HTTP. When TLS terminates at a
reverse proxy, the proxy address must be explicitly trusted before
`X-Forwarded-Proto: https` is honored. HSTS is emitted only in secure-production
mode, avoiding accidental local HTTP pinning.

## Headers, caching and logs

`@fastify/helmet` adds CSP, frame, MIME-sniffing, referrer and related defensive
headers. Every response also uses `Cache-Control: private, no-store` because a
nearby query contains precise location even though its response omits the
origin.

Fastify's built-in request log is disabled because it records the full URL. A
replacement completion event contains only method, matched route template,
status and duration. Tests assert that precise latitude/longitude values never
appear in these logs. Error responses remain the unified
`requestId/code/message/retryable` format; 413 and 429 never expose request
content.

## Dependencies and verification

The pinned plugins match Fastify 5 according to their official compatibility
tables:

- [`@fastify/cors` 11.3.0](https://github.com/fastify/fastify-cors)
- [`@fastify/helmet` 13.1.1](https://github.com/fastify/fastify-helmet)
- [`@fastify/rate-limit` 10.3.0](https://github.com/fastify/fastify-rate-limit)

Eight focused integration tests cover headers/no-store, allowed and denied
origins, normal and unknown-route throttling, forwarded-IP spoof resistance,
trusted-proxy separation, HTTPS enforcement, request-body limits and
coordinate-safe logging. Runtime configuration tests reject wildcard/malformed
origins, insecure production origins, invalid limits and malformed proxy
entries.
