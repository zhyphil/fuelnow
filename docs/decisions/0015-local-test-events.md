# ADR 0015 — Consent-gated local test events

Status: accepted for Phase 4 implementation; remote analytics remains disabled.

P4-NAV-02 records search exposure, result selection, navigation click and OS handoff
outcome through one allowlisted recorder. Handoff success means the OS accepted a
link, not that driving started. No coordinate, address, provider URL, request body,
device identity or advertising identifier is recorded. Event collection never
controls core functionality.

Per ADRs 0006/0007, the default is off. The home screen offers an explicit local
testing opt-in with a clear disclosure and disable/delete control. At most 100
events are held in memory for 15 minutes, then deleted; process exit also loses
them. Duplicate response exposures are suppressed. No network sink, SDK, disk
storage or persistent identifier is installed. This is a working local testing
recorder, not a claim that production funnel analytics has been deployed.

Phase 6 extension (2026-09-07): the same opt-in also controls up to 100 local
search attempts for funnel metrics. Expiry/disable clears both stores, and a
discarded-attempt counter warns about incomplete windows. Response identity is
weakly referenced; one selected public point ID is held only for detail
attribution. No query/location or persistent session identifier is retained.
See [metric definitions](../testing/phase6-metrics.md).

A remote collector, consent text and retention/processor review must be approved
before production collection. Phase 5 retains those release gates; user permission
to implement a client does not authorize silently transmitting analytics.
