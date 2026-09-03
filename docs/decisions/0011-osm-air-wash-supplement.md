# ADR 0011 — OpenStreetMap as an Air and Wash supplement

- Status: Accepted for development
- Date: 2026-09-04
- Task: `P1-AW-01`
- Scope: Full stack

## Context

The selected France Fuel source can confirm generic Air or Wash presence for some stations but cannot provide live equipment status or price. The selected Spain Fuel source exposes neither capability. A supplementary source is required to avoid a systematically France-biased Air/Wash result set.

OpenStreetMap (OSM) contains dedicated Air and Wash points as well as service properties attached to fuel stations. Its community-maintained schema, coverage, freshness, and legal/operational constraints differ from the government Fuel feeds.

## Decision

Adopt OSM as a supplemental Air and Wash POI/presence source for development and release-test preparation, subject to the following boundaries:

1. OSM is additive source evidence, not a replacement for the national Fuel sources.
2. Positive Air eligibility requires `amenity=compressed_air` or `compressed_air=yes`.
3. Positive Wash eligibility requires `amenity=car_wash` or `car_wash=yes`.
4. A missing tag is Unknown, not absence. Explicit `no` applies only to the tagged OSM element.
5. OSM cannot supply live working status. The element edit timestamp is source-record metadata, not equipment verification.
6. Price, opening hours, access, and type are mapped only from explicit, capability-scoped tags whose semantics have been reviewed.
7. Production must not call a free public Overpass instance for each end-user search.
8. OSM-derived records retain independent source identity and provenance throughout ingestion, reconciliation, API output, and the client.

The detailed evidence and pilot measurements are recorded in [OSM Air/Wash feasibility](../data/osm-air-wash-feasibility.md).

## Mapping boundary

### Air

- A dedicated `amenity=compressed_air` element is an Air service point.
- `compressed_air=yes` enriches the same tagged place, commonly a fuel station.
- `fee=yes/no` is usable only on a dedicated Air element.
- For an Air property on another amenity, use capability-prefixed fields such as `compressed_air:fee`; do not borrow the parent Fuel amenity's generic `fee` or `opening_hours`.
- Preserve `access`, `pressure`, and `valves` when explicitly present, but do not invent vehicle compatibility.

### Wash

- A dedicated `amenity=car_wash` element is a Wash service point.
- `car_wash=yes` enriches the same tagged place.
- `self_service` and `automated` may be retained as source attributes, but neither safely selects rollers, touchless, high-pressure, or hand wash by itself.
- Rare or proposed detailed tags require their own validation before mapping to the product's detailed Wash types.
- Parent Fuel hours do not become Wash hours when Wash is only a property.

### Shared

- Use source IDs in the form `openstreetmap:{element_type}:{element_id}` and store the OSM version.
- Keep the OSM element timestamp as source update evidence, never `lastVerifiedAt` for equipment.
- Deduplicate only through an explicit reconciliation record; never silently overwrite a government-source row with OSM fields.
- Preserve conflicts rather than selecting whichever source was fetched last.

## Acquisition architecture

Public Overpass is suitable for low-volume feasibility checks and debugging. It is not the production backend because public instances are best-effort, rate-limited shared infrastructure and explicitly discourage apps from depending on them at scale.

Phase 2 must choose one of:

- scheduled regional OSM extracts plus replication updates;
- a self-hosted Overpass-compatible service;
- a managed commercial OSM data service with reviewed terms and SLA.

In every case, ingestion is scheduled and cached server-side. Mobile clients never query public Overpass directly. Imports use bounded queries/extracts, identifiable request headers where applicable, retry/backoff, last-known-good snapshots, source-lag monitoring, and atomic publication.

## Licence and attribution

OSM data is licensed under ODbL 1.0 and requires visible OpenStreetMap attribution. OSM source and licence notices must appear in API provenance, result/details when OSM evidence is displayed, and the global Data Sources & Licences page.

Combining and deduplicating OSM and government data for the same Air/Wash feature type may create a Derivative Database or otherwise trigger ODbL share-alike obligations. Logical source separation and provenance are required engineering controls, but are not declared sufficient legal resolution. The final database design, redistribution method, and attribution wording require a focused licence review before public Beta.

## Consequences

### Benefits

- Spain gains real Air/Wash candidates without fabricating them from Fuel data.
- Dedicated equipment coordinates can be more precise than a parent station point.
- Explicit access, fee, hours, and coarse type tags can improve some records.
- OSM supplies the same cross-border schema in both countries.

### Costs and risks

- Community coverage and tag completeness vary by area.
- Separate OSM elements and parent-station properties can describe the same physical facility and require conflation.
- An OSM edit timestamp does not prove recent on-site verification.
- Public query services have no product SLA.
- ODbL share-alike implications constrain how derived and combined databases may be published.

## Alternatives considered

### Do not use OSM

Rejected for the development path because Spain would have no Air/Wash candidates from the selected national Fuel source, despite the pilot confirming useful OSM coverage in all four tested cities.

### Use public Overpass at request time

Rejected because it transfers reliability and aggregate app traffic to shared public infrastructure that is not designed as a commercial application backend.

### Copy OSM fields into national Fuel records

Rejected because it loses provenance, complicates conflict handling, and increases licence ambiguity.

## Acceptance criteria

- Only explicit reviewed positive tags create Air/Wash candidates.
- Missing tags remain Unknown and OSM edit time never becomes equipment live status.
- OSM source ID, URL, version, update timestamp, attribution, and licence are preserved.
- Production ingestion does not depend on per-user public Overpass calls.
- Reconciliation is explicit, reversible, and provenance-preserving.
- A public-Beta licence review resolves database/share-alike and final attribution obligations.

## Reconsider when

- an authoritative national Air/Wash source provides materially better coverage;
- OSM pilot coverage or data-quality checks fail in the supported corridor;
- the selected acquisition provider's cost or terms become unacceptable;
- licence review finds the planned combined database incompatible with product distribution.
