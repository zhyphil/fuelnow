# ADR 0006 — V1 account and identity policy

- Status: Accepted
- Date: 2026-09-03
- Task: `P0-06`
- Scope: Full stack

## Context

Fuel Now is designed for an immediate driving need. Requiring account creation before showing nearby fuel, charging, air, or wash recommendations would slow the primary flow and conflict with the target of reaching a decision in roughly 10 seconds.

V1 does not include payments, bookings, insurance integration, a cloud vehicle garage, or other features that inherently require a persistent customer identity.

## Decision

All V1 core flows are available without registration or login:

- select Fuel, Charge, Air, or Wash
- grant location access or enter a location manually
- select service preferences such as fuel or connector type
- view Nearest, Cheapest, Open now, and Best results
- view service-point details
- open external navigation
- view data source, freshness, and confidence

V1 will not implement a customer account system, password authentication, social login, or mandatory email collection.

## Local preferences

Store non-sensitive convenience preferences on the device:

- language
- preferred fuel type
- preferred EV connector types when applicable
- optional vehicle consumption estimate
- preferred sort tab
- whether onboarding has been completed

The user must be able to clear local preferences from the application. Do not treat local preferences as a verified vehicle profile.

## Analytics identity

Core functionality must not depend on analytics consent or a persistent user identifier.

If product analytics are enabled:

- prefer short-lived session identifiers
- use a random installation identifier only when needed for deduplication or funnel analysis
- never derive identity from precise coordinates
- do not collect advertising identifiers in V1
- do not send email, phone number, contact data, or device address-book data
- honor the applicable consent policy before non-essential analytics
- document retention and deletion behavior before Beta

Search analytics should use service type, coarse area, result count, timing, and selected result identifiers where possible. Avoid storing raw user-origin coordinates in general analytics events.

## Crowdsourcing boundary

Phase 4 crowdsourcing begins with low-friction confirmations such as “price correct?” or “still working?”. These may be accepted without a customer account only after rate limits, abuse controls, expiry, and trust rules exist.

Anonymous reports must never immediately replace higher-confidence official or operator data. If abuse cannot be controlled adequately, verified contribution accounts can be introduced through a later ADR without making search and navigation require login.

Photo upload and OCR are outside the account-free core-flow decision. They require separate consent, retention, moderation, and abuse decisions before implementation.

## Rationale

- Removes a major barrier from an urgent, utility-focused flow.
- Supports tourists and rental-car drivers who may use the product only once.
- Reduces security, privacy, support, and account-recovery scope during MVP validation.
- Keeps product metrics focused on Search → Navigation rather than account conversion.
- Does not prevent optional accounts later when saved vehicles, cross-device sync, booking, or trusted contributions justify them.

## Alternatives considered

### Mandatory account before search

Rejected because it increases Time-to-Decision and provides little V1 user value.

### Optional account in V1

Deferred because no accepted V1 requirement needs cloud identity. Even optional authentication would add UI, backend, privacy, security, email delivery, and support work before data feasibility is proven.

### Device-only anonymous token required by the API

Not selected as an authorization requirement. The public read API should use application-level controls, throttling, and abuse protection. A rotating installation identifier may be used for analytics or rate-limit signals but is not a user account.

## Future triggers for reconsideration

Create a new identity ADR if Fuel Now adds one or more of:

- saved vehicles synchronized across devices
- verified contributor reputation
- bookings or payments
- garage or roadside transactions
- subscription entitlements
- personalized notifications across devices
- business or fleet accounts

## Acceptance criteria

- A new user can search and navigate without registration.
- Denying analytics consent does not block search.
- Vehicle/service preferences remain local in V1.
- No password, email, social-login token, or account recovery flow exists in V1 scope.
- Any anonymous contribution endpoint has explicit rate limits, trust handling, and expiry before Beta.

