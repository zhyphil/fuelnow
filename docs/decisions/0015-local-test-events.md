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

A remote collector, consent text and retention/processor review must be approved
before production collection. Phase 5 retains those release gates; user permission
to implement a client does not authorize silently transmitting analytics.
