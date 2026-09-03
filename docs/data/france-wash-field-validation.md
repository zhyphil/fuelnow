# France Fuel Wash field validation

- Task: `P1-WASH-01`
- Date: 2026-09-03
- Source: DGCCRF France Fuel instant v2
- Scope: Backend source capability

## Source evidence

The reviewed national snapshot contained 9,804 station records. The `services` member was already validated in both its official single-string and array representations, with the flattened `services_service` field producing the same values.

The two reviewed vehicle-wash labels are:

```text
Lavage automatique
Lavage manuel
```

Their national occurrence counts were:

| Source label | Records | Share of all records |
| --- | ---: | ---: |
| `Lavage automatique` | 3,389 | 34.57% |
| `Lavage manuel` | 2,535 | 25.86% |
| Either reviewed label | 4,052 | 41.33% |
| Both reviewed labels | 1,872 | 19.09% |

The source also contains the label `Laverie`, which describes a laundry rather than a vehicle-wash service. It must not create a Wash capability.

## Normalization rule

An exact `Lavage automatique` or `Lavage manuel` value creates the Wash capability and preserves every matched source label verbatim. The normalized record uses:

- `present = true`
- `washTypes = [unknown]`
- `price = null`
- `workingStatus = unknown`
- `lastVerifiedAt = null`

The source labels prove a generic automatic or manual wash declaration, but do not safely distinguish the product contract's detailed types such as rollers, touchless automatic, high-pressure self-service, hand wash, interior cleaning, or vacuum. Detailed `washTypes` therefore remain Unknown until a more specific source is reviewed.

Missing reviewed labels remain `wash = null`, not `present = false`. This avoids claiming that the station has no wash when the source may be incomplete.

## Deterministic verification

Across 244 unique committed real records from Paris, Toulouse, A9, and the France–Spain border fixtures:

- 135 contain the automatic label
- 71 contain the manual label
- 150 contain either label and map to Wash
- 56 contain both labels and retain both
- 94 contain neither and do not map to Wash
- a dedicated regression case proves that `Laverie` alone is retained as a source service but does not map to Wash

All 88 package tests pass.

## Conclusion

The France Fuel source can support generic Wash presence for 41.33% of its national records and retains an automatic/manual source distinction. It cannot support detailed wash type, price, live equipment status, or verification time; those fields must remain visibly Unknown.
