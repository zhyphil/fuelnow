# EV charging service contract

- Task: `P2-MOD-03`
- Date: 2026-09-04
- Runtime schema: [`packages/contracts/src/ev.ts`](../../packages/contracts/src/ev.ts)

## Hierarchy

The charging model uses three levels:

```text
ServicePoint
  charging
    EVSE (one vehicle at a time)
      connector (plug capability of that EVSE)
        tariff components
```

This prevents a two-connector EVSE from being presented as two simultaneously available charging places. `totalEvses` must equal the number of EVSE records, never the number of connectors.

Every EVSE has at least one connector. Known EVSE IDs are unique within a point and known connector IDs are unique within an EVSE. IDs may remain null when the source does not expose a stable value.

## Static and dynamic truth

- `status=unknown` with `sourceObservedAt=null` is a valid static-only record.
- Any available, occupied, reserved or out-of-service status requires a UTC source observation time.
- `operational` describes equipment operation and does not imply present availability.
- Available/known/unknown summary counts are either all null or all known, and known counts must match the EVSE states.
- Tariffs and comparable price remain null when unknown. A numeric zero is an explicit price rather than a missing value.

The contract does not claim national live coverage. ADR 0012 still controls exposure: France may display live per-EVSE status only from an eligible fresh QualiCharge join; Spain stays unknown until the provider approval and identity bridge are complete.

## Runtime validation

TypeBox validates object shapes, supported statuses/connectors, positive power, non-negative prices and non-empty equipment lists. `isChargingServicePoint` enforces cross-field charging capability, EVSE capacity, dynamic timestamp, identifier uniqueness and summary-count rules.

`P2-MOD-06` will consolidate duplicated price quality fields. `P2-MOD-08` will consolidate the connector enumeration with all other canonical enums, and `P2-MOD-09` will add final availability/unknown state semantics.
