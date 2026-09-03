# France Fuel Air field validation

- Task: `P1-AIR-01`
- Date: 2026-09-03
- Source: DGCCRF France Fuel instant v2
- Scope: Backend source capability

## Source evidence

The reviewed source snapshot contained 9,804 station records. `services` was present on 9,122 records; every present value decoded successfully to an object with a `service` member. That member was an array for 8,416 records and a single string for 706. After normalizing this union, the raw service lists matched the flattened `services_service` field.

The exact reviewed label is:

```text
Station de gonflage
```

It appeared on 5,450 records, or 55.59% of the national snapshot.

## Normalization rule

Only an exact reviewed `Station de gonflage` value creates the Air capability:

- `present = true`
- `price = null`
- `workingStatus = unknown`
- `lastVerifiedAt = null`
- source label retained verbatim

Presence proves that the official station record declares an inflation facility. It does not prove that the equipment currently works, that it is free, that it is available during all station hours, or that it supports every vehicle.

Other service labels are preserved as source attributes but do not become Air. Missing service data remains `air = null`, not `present = false`.

## Deterministic verification

Across 244 unique committed real records from Paris, Toulouse, A9, and the France–Spain border fixtures:

- 160 records with the exact label map to Air
- 84 records without it do not map to Air
- every mapped object retains null price, Unknown working status, and null verification time
- the observed singleton service representation maps identically to the array representation

All 84 package tests pass.

## Conclusion

The France Fuel source is suitable as an Air presence source with material but incomplete coverage. It is not an Air price or live equipment-status source. Those limitations must remain visible in result cards and ranking.
