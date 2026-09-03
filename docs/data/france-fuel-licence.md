# France Fuel licence and reuse review

- Status: Approved for technical development; final release attribution/legal review remains in Phase 5
- Date checked: 2026-09-03
- Task: `P1-FR-02`
- Scope: Backend and product attribution

## Reviewed material

- Official dataset: `Prix des carburants en France - Flux instantané - v2`
- Publisher shown by the portal: `DGCCRF`
- Dataset page:  
  `https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/`
- Dataset metadata/API:  
  `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2`
- Licence: `Licence Ouverte v2.0 (Etalab)`
- French licence text:  
  `https://www.etalab.gouv.fr/wp-content/uploads/2017/04/ETALAB-Licence-Ouverte-v2.0.pdf`
- Portal terms of use:  
  `https://data.economie.gouv.fr/terms/terms-and-conditions/`
- Explore API reference:  
  `https://help.opendatasoft.com/apis/ods-explore-v2/explore_v2.0.html`

The licence identity in this review is taken from the selected dataset's official portal metadata rather than inferred from a related or older fuel-price feed.

## Reuse decision

The dataset is suitable for the Fuel Now feasibility spike and planned commercial product use under Licence Ouverte 2.0, subject to the attribution and integrity rules below.

The licence grants free, non-exclusive reuse worldwide, for an unlimited duration, for commercial or non-commercial purposes. It expressly permits:

- reproduction and copying;
- extraction, adaptation, modification, and transformation;
- creation of derived information, products, and services;
- communication, publication, transmission, distribution, and redistribution;
- combination with other information and inclusion in a commercial application.

These rights cover the technical activities Fuel Now needs: downloading an official snapshot, keeping cached copies, normalizing fields, enriching records, computing derived ranking values, serving a transformed API, and displaying the data in the client.

## Mandatory attribution

Every reuse must provide effective attribution containing:

1. the source, including at least the name of the grantor; and
2. the date of the most recent update of the reused information.

Fuel Now must not present its transformed results as official, and must not imply recognition, endorsement, or certification by DGCCRF, the ministry, or another public body.

### Product attribution template

Use the following minimum attribution for France Fuel data:

```text
Source: DGCCRF — Prix des carburants en France, Flux instantané v2
Data updated: {source_data_updated_at}
Retrieved: {source_fetched_at}
Licence: Licence Ouverte 2.0 (Etalab)
```

The Data Sources & Licences page should also include the official dataset URL and list the supplementary attributions currently exposed by the portal metadata, including INSEE, IGN, Natural Earth, and DGCL/BANATIC where the reused fields depend on them.

On station cards, a compact `Source: DGCCRF` label plus the field-level price update time is sufficient only when it links or navigates to a detail surface containing the complete attribution above.

## Freshness and integrity rules

- Preserve the original station identifier, price value, fuel type, and source observation timestamp in normalized records.
- Show the source observation time separately from Fuel Now's retrieval time.
- Never replace an old source timestamp with the cache retrieval time.
- Do not state or imply that an old, missing, or inferred price is current official information.
- Mark transformations and derived fields as Fuel Now calculations where a user could otherwise mistake them for source-provided values.
- Link corrections to the official dataset or fuel-price service rather than presenting Fuel Now as the authoritative publisher.

These rules implement the licence requirement not to mislead third parties about the source, content, or last update of the information.

## Caching and redistribution

No dataset-specific prohibition on caching, redistribution, or commercial reuse was identified. Licence Ouverte 2.0 expressly grants the necessary copy, transformation, redistribution, and commercial exploitation rights.

Fuel Now may therefore retain normalized records and source snapshots. The implementation should still:

- keep a bounded raw snapshot/history policy rather than storing every fetch forever;
- keep source and retrieval timestamps with every accepted snapshot;
- retain a checksum and processing report for reproducibility;
- remove superseded operational caches according to the retention policy;
- continue to attribute the source when serving cached or transformed results.

The chosen dataset does not appear to expose personal data needed by Fuel Now. If later samples reveal personal data, reuse must additionally comply with applicable privacy law; the open licence does not replace those obligations.

## API access and polling constraints

The public portal and tested dataset endpoints were accessible without an account or API key. The portal terms describe site use as free, but do not publish a numeric anonymous-call allowance for this dataset. The Explore API can return HTTP `429 Too Many Requests`, and authenticated quotas may be configured by a portal administrator.

Consequently:

- do not encode an assumed numeric quota;
- prefer one full snapshot export per synchronization cycle over thousands of record calls;
- do not poll faster than the useful source cadence;
- begin with a 15-minute synchronization interval because the dataset page reports 10-minute source updates and 15-minute portal harvesting;
- implement timeout, bounded retry with jitter, `429` handling, and last-known-good fallback;
- record response validators and rate-limit headers when the portal supplies them;
- reduce or pause polling if the portal communicates a stricter limit.

The 15-minute interval is an engineering starting point, not a contractual service-level guarantee.

## Portal terms caveat

The portal terms require users to respect each dataset's own licence and mention data sources. They also contain separate conditions concerning reproduction of portal pages, ministry logos, and links used for commercial or advertising purposes. Fuel Now will reuse the licensed dataset, not reproduce portal pages or ministry logos.

Because the portal link wording and final in-app presentation may require interpretation, the Phase 5 release checklist must include a focused legal/attribution review. This does not block the technical feasibility spike, but production release must not claim legal completion before that review.

## Decision

Approve `fr-fuel-realtime-v2` for adapter development and controlled test ingestion under the rules in this document. Before public release, verify that the final Data Sources & Licences screen, station-detail attribution, caching retention, and official links match the implemented product and the then-current source terms.
