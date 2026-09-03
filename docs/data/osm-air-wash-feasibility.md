# OpenStreetMap Air and Wash feasibility

- Task: `P1-AW-01`
- Date: 2026-09-04
- Scope: France and Spain supplemental POI/source decision
- Decision: use for development as a provenance-preserving supplement; do not use public Overpass as the production request backend

## Official tag evidence

The OSM documentation identifies two representations for each capability:

| Capability | Dedicated POI | Property on another place |
| --- | --- | --- |
| Air | [`amenity=compressed_air`](https://wiki.openstreetmap.org/wiki/Tag%3Aamenity%3Dcompressed_air) | `compressed_air=yes/no` |
| Wash | [`amenity=car_wash`](https://wiki.openstreetmap.org/wiki/Tag%3Aamenity%3Dcar_wash) | [`car_wash=yes/no`](https://wiki.openstreetmap.org/wiki/Key%3Acar_wash) |

The [`amenity=fuel` documentation](https://wiki.openstreetmap.org/wiki/Tag%3Aamenity%3Dfuel) explicitly describes both the property form on a station and a separately mapped amenity. Queries and reconciliation must support both forms.

Useful Air tags include `fee`, `access`, `opening_hours`, `pressure`, and `valves`; when Air is a property of another POI, prefixed variants such as `compressed_air:fee` scope the value correctly. Wash documentation recommends `opening_hours` and `self_service`, while `automated` appears in mapping practice. These tags are optional and do not constitute a complete or live equipment record.

## Target-city pilot

One bounded Overpass query was executed on 2026-09-04 with `out center meta` against four 10 km circles. The response reported OSM base timestamp `2026-09-03T22:01:36Z`. Positive counts use only the accepted tags above; `compressed_air=no` and `car_wash=no` are excluded.

| 10 km anchor | Air-positive OSM elements | Wash-positive OSM elements | Wash with hours | Wash with `self_service` | Wash with `automated` | Wash with `fee` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Paris | 224 | 81 | 16 | 45 | 49 | 0 |
| Toulouse | 66 | 81 | 31 | 54 | 44 | 0 |
| Barcelona | 72 | 69 | 7 | 24 | 22 | 0 |
| Madrid | 67 | 95 | 6 | 37 | 37 | 0 |

Air fee evidence existed on 50 Paris, 9 Toulouse, 6 Barcelona, and 14 Madrid positive elements when accepting a dedicated element's `fee` or a parent POI's `compressed_air:fee`.

These are candidate-element counts, not deduplicated physical facilities or coverage percentages. A dedicated amenity and a parent fuel-station property can refer to the same real equipment. The sample establishes that useful data exists in every target city, while also showing that optional field coverage is too sparse for broad price, hours, or detailed-type promises.

The pilot query pattern was:

```overpass
[out:json][timeout:60];
(
  nwr(around:10000,LAT,LON)["amenity"="compressed_air"];
  nwr(around:10000,LAT,LON)["compressed_air"];
  nwr(around:10000,LAT,LON)["amenity"="car_wash"];
  nwr(around:10000,LAT,LON)["car_wash"];
);
out center meta;
```

`out meta` exposes element version and last-edit timestamp according to the [Overpass QL documentation](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL). This timestamp indicates when the OSM record changed. It does not prove when a person last tested the Air/Wash equipment, so normalized `workingStatus` and `lastVerifiedAt` remain Unknown.

## Data-quality rules

### Positive and negative evidence

- Accept only the reviewed positive tags for search eligibility.
- Treat an explicit `no` as a negative statement about that exact OSM element.
- Treat missing capability tags as Unknown.
- Ignore non-standard values until individually reviewed; the pilot encountered `compressed_air=pump` and did not count it as positive.

### Detailed attributes

- Map a generic `fee` only when the element itself is the dedicated Air or Wash amenity.
- On a parent Fuel object, require capability-prefixed fields where the parent value could describe another service.
- Do not reuse Fuel-station hours for a separately operated facility without explicit linked/scoped evidence.
- Preserve `self_service` and `automated` as source attributes, but do not infer rollers, touchless, high-pressure, or hand-wash categories.
- Never infer working status from presence, recent edit time, brand, imagery, or popularity.

### Identity and conflation

- Namespace OSM element type and ID; store version and source URL.
- Keep dedicated amenities as service points unless an explicit reconciliation process links them to a parent station.
- Use proximity, shared brand/operator, containment, and compatible tags as evidence, but quarantine ambiguous matches.
- Preserve all contributing sources and conflicts in API provenance.

## Operational boundary

The [OSM public Overpass documentation](https://wiki.openstreetmap.org/wiki/Overpass_API) describes free instances as shared infrastructure for smaller workloads, recommends caching/rate limiting or extracts for larger use, and warns against relying on them for commercial app traffic. The [Overpass commons documentation](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html) likewise identifies high-volume repeated requests and using a public instance as an app backend as problematic.

Therefore:

- Phase 1 may issue small, bounded, identified validation queries.
- Phase 2 must ingest and cache regional data through extracts, self-hosting, or a managed service.
- the API searches the project's own PostGIS snapshot;
- clients never contact public Overpass directly;
- source lag, import success, candidate counts, duplicate rate, and parse rejects are monitored.

## Licence boundary

OSM data is available under ODbL 1.0. The [OSMF attribution guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines) require visible attribution and licence notice appropriate to databases and interactive products. The [OSMF licence FAQ](https://osmfoundation.org/wiki/Licence_and_Legal_FAQ) explains that OSM and Derivative Databases distributed onward remain under ODbL.

The [OSMF Collective Database guideline](https://osmfoundation.org/wiki/Licence/Community_Guidelines/Collective_Database_Guideline_Guideline) warns that complementing a proprietary dataset with matching OSM features and removing duplicates is not within its safe-harbour example. Fuel Now's same-feature Air/Wash reconciliation may therefore have share-alike consequences.

Development can continue with source separation and attribution, but public Beta remains gated on a focused review of:

- whether the release database is collective or derivative;
- what OSM-derived database or transformation must be offered;
- how result-level and global attribution is displayed;
- whether any non-OSM source terms are compatible with the final data combination.

## Conclusion

OSM is technically useful and materially improves Spanish Air/Wash discovery, so it is accepted as a supplemental development source. It is not accepted as evidence of live equipment operation, comprehensive price/type coverage, or a production public-Overpass dependency. Release approval remains conditional on a production ingestion choice, measured corridor quality, and licence review.
