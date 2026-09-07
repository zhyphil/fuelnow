# P5-QA-08: network and dependency failure recovery

- Mobile offline/network, HTTP 429/5xx/404, malformed bodies, retry classification,
  stale requests, background origin clearing and cancellation already have tests.
- New weak-network tests stall both headers and body with an intentionally
  uncooperative transport. The client now races both stages against its explicit
  abort/deadline promise, not just a transport signal. Timeout returns a safe error,
  clears its timer and never renders a late payload, even if the native transport
  ignores abort. Underlying cancellation is still requested.
- A source outage after a committed page is resumed from that checkpoint; the
  completed record is not replayed. Existing SQL-store tests cover transactional
  page/checkpoint rollback and retry/alert state.
- The actual nearby API route retains candidates and null ETA/road distance on
  route timeout, rate limit, provider outage or malformed response. Reason codes
  remain distinct. Budget/unreachable/partial matrices have dedicated routing tests.

All failures are injected locally; no real provider was intentionally disrupted,
no paid routing was enabled and no production reliability SLA is asserted.
Native weak-network testing and release-host/provider outages remain environment
acceptance checks after deployment is configured.
