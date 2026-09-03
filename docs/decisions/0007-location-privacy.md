# ADR 0007 — Location, privacy, retention, and GDPR boundaries

- Status: Accepted as an engineering baseline; legal review remains required before public Beta
- Date: 2026-09-03
- Task: `P0-07`
- Scope: Full stack

## Context

Fuel Now needs a user origin to find nearby services and calculate road ETA. Precise location can be personal data and can reveal sensitive habits when retained or combined over time. The core product does not need background tracking, location history, advertising profiles, or user accounts.

This ADR defines the V1 engineering boundary. It is not a substitute for final legal review, privacy notices, processor agreements, or app-store disclosures.

## Decision summary

- Request location only after the user invokes a nearby-search flow or explicitly taps “use my location”.
- Request foreground/while-in-use access only.
- Do not request background or always-on location access in V1.
- Provide manual place/address entry as a fully usable alternative.
- Use the minimum precision that still produces a useful nearby decision.
- Do not persist the precise search origin in the Fuel Now database by default.
- Do not build location history, trip history, advertising audiences, or cross-app tracking.
- Do not allow analytics or crash tooling to capture precise coordinates.
- Disclose the backend and routing-provider processing at the moment and place required by applicable law.

## Mobile permission flow

1. Show the home screen without requesting location.
2. When the user selects a service, explain why location improves the result.
3. Offer both “use current location” and manual location entry.
4. Request only one-time or while-in-use permission through the OS.
5. Accept approximate location when it provides sufficient results; explain when more precision would materially improve nearby ranking.
6. If permission is denied, continue with manual entry and provide a clear way to retry.
7. Do not repeatedly pressure the user to change a denied permission.

The OS permission is a technical authorization and must not be treated as blanket consent for analytics, advertising, resale, or unrelated processing.

## Core search data flow

```text
Device location/manual origin
  → Fuel Now API request
  → transient nearby database query
  → bounded candidate list
  → routing provider for candidate ETA
  → ranked response
  → device
```

The API may process precise origin coordinates in memory for the active request. It must not write them to the canonical service database, application logs, error messages, traces, or analytics events.

Use POST request bodies for search inputs where practical and configure HTTP logging to redact or omit the body. HTTPS is mandatory outside local development.

## Storage and retention baseline

| Data | V1 storage rule | Maximum baseline retention | Notes |
|---|---|---:|---|
| Precise search origin | No application-database persistence | Request lifetime | Process only to answer the active search |
| Manual search text | No raw analytics storage | Request lifetime | Geocoding provider processing must be disclosed if used |
| Route origin sent to provider | Provider request only | According to reviewed provider terms/DPA | Do not add Fuel Now-side history |
| Routing cache key | Rounded/coarse origin cell, no user ID | 15 minutes for traffic-aware ETA | Revisit after provider-terms review |
| Non-traffic road-distance cache | Rounded/coarse origin cell, no user ID | 24 hours | Must not become a user movement record |
| Application/API operational logs | Redacted; no coordinates or request bodies | 30 days | Shorten if operations allow |
| Security access logs including IP | Restricted access | 30 days | Document purpose and legal basis before Beta |
| Product analytics | Coarse area and event metadata only | 90 days | Non-essential analytics subject to applicable consent rules |
| Crash reports | Redacted breadcrumbs and context | 30 days | Verify SDK defaults before release |
| Device preferences | On device | Until user clears/uninstalls | No cloud sync in V1 |

Retention periods are maximum engineering defaults, not an instruction to collect every listed category. If data is not needed, do not collect it. Final legal and operational review may shorten these periods.

## Analytics policy

Allowed product events include:

- service type selected
- selected sorting mode
- coarse test/market area
- candidate count
- response and Time-to-Decision timing
- selected service-point canonical ID
- navigation handoff success/failure
- source freshness category

Disallowed analytics fields include:

- raw latitude/longitude
- full manual address
- complete route or movement trail
- advertising ID
- contact information
- IP copied into product analytics properties
- unredacted request/response bodies

Core search must work when the user declines non-essential analytics.

## Third-party processing

Before enabling a provider in Beta:

- document what data is sent and for which purpose
- review current terms, privacy documentation, retention, sub-processors, and international transfers
- execute an appropriate data-processing agreement where required
- restrict API keys and data access to the minimum necessary
- disable optional provider telemetry that is not required for the service where possible
- list the provider/category of recipient in user-facing privacy information

This applies at minimum to routing, geocoding, analytics, crash reporting, hosting, and photo/OCR providers.

## Security controls

- Encrypt traffic in transit.
- Keep provider and database credentials server-side and out of mobile bundles unless the provider requires a separately restricted public mobile key.
- Redact coordinates, addresses, tokens, IPs, and authorization headers from structured logs where applicable.
- Apply least-privilege database and provider access.
- Limit production-data access and record administrative access.
- Define deletion jobs for every retained personal-data category.
- Test configuration because third-party SDK defaults may collect more data than the application code explicitly sends.

## Crowdsourcing and photos

Crowdsourced photos are not enabled by this decision. Before Phase 4 photo upload:

- present a specific upload purpose and retention notice
- strip EXIF metadata, including embedded GPS, on the device or immediately on ingestion
- scan for malware and enforce size/type limits
- detect or moderate faces, licence plates, receipts, and other personal data
- define original-image deletion and derived OCR retention
- provide reporting and deletion paths

Anonymous text confirmations must not be linkable to precise movement history.

## GDPR/product work still required before Beta

- Identify the legal entity acting as controller and provide contact details.
- Document the lawful basis for each processing purpose; do not assume the OS permission supplies it.
- Produce the privacy notice in FR, ES, and EN.
- Maintain a record of processing activities as applicable.
- Review processor agreements and international transfer mechanisms.
- Implement data-subject request handling for retained personal data.
- Determine whether a DPIA is required; reassess if background tracking, location history, systematic profiling, or large-scale precise-location processing is introduced.
- Complete Apple privacy nutrition labels and Google Play data-safety declarations accurately.

## Change triggers

This ADR must be superseded before introducing:

- background or continuous location
- saved trip/location history
- personalized location notifications
- advertising or data resale
- account-linked movement or searches
- fleet tracking
- sharing location with garages or roadside providers

## Acceptance criteria

- Location permission is contextual and foreground-only.
- Manual location entry provides the same core search capabilities.
- Precise origins are absent from database persistence, logs, traces, and analytics.
- Route-cache keys are coarse, short-lived, and not linked to a user.
- Core features work without analytics consent.
- Third-party data flows are documented before their production keys are enabled.
- Privacy notices and final legal review remain explicit Phase 5 release gates.

## References

- [EU GDPR, Article 5 principles](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679)
- [CNIL mobile application recommendations](https://www.cnil.fr/fr/recommandations-applications-mobiles)
- [CNIL location and mobile application rules](https://cnil.fr/fr/geolocalisation-applications-mobiles-quelles-regles)
- [CNIL mobile permission guidance](https://cnil.fr/fr/permissions-applications-mobiles-recommandations-de-la-cnil-pour-respecter-la-vie-privee)
- [AEPD location overview](https://www.aepd.es/areas-de-actuacion/recomendaciones/saber-mas)
- [EDPB connected vehicle guidelines](https://www.edpb.europa.eu/system/files/2021-03/edpb_guidelines_202001_connected_vehicles_v2.0_adopted_en.pdf)

