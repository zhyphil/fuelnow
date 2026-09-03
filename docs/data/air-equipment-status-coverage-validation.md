# Air equipment availability and fault coverage

- Task: `P1-AIR-05`
- Date: 2026-09-03
- Scope: Full-stack source and availability capability

## Coverage result

| Country/source | Air-eligible records | Explicit working | Explicit broken/out of service | Equipment verification timestamp | Working status unknown |
|---|---:|---:|---:|---:|---:|
| France DGCCRF | 5,450 | 0 | 0 | 0 | 5,450 (100%) |
| Spain MITECO | 0 from this source | N/A | N/A | N/A | N/A |

France's `Station de gonflage` label is a facility-presence declaration. The source provides no dynamic Air equipment object, fault flag, maintenance status, last check, or equipment-specific schedule.

Spain's selected source cannot identify Air facilities, so equipment-status coverage is not measurable rather than zero.

## Non-equivalent signals

The following station fields must not be reused as Air equipment availability:

- station scheduled opening hours
- French `Automate CB 24/24` / unattended Fuel access
- Spanish attended/self-service mode
- presence of staff
- current Fuel prices
- station inclusion in the latest source snapshot

A station can be open while its inflation machine is broken, inaccessible, chargeable, or available only during different hours.

## Normalized rule

Every France Air capability derived from DGCCRF remains:

```text
workingStatus = unknown
lastVerifiedAt = null
```

Unknown equipment status remains eligible for a presence-based Nearest result, but it cannot receive a positive availability score or be described as “working now.” Results require a visible status-unknown warning before navigation when Air is the active need.

The fixed France Air test already verifies this rule on all 160 Air-positive records in the 244-record committed sample. The repository remains at 86 passing tests.

## Product consequence

- No selected national source supports live Air availability in either country.
- Air `Available now` and reliable Best ranking cannot be promised for V1 from these feeds.
- A later operator, verified-user, or merchant status source needs observation time, provenance, expiry, and conflict handling before it may override Unknown.
- If no such source passes validation, V1 Air must be presented as facility discovery with unknown price/status or removed from the initial public scope.
