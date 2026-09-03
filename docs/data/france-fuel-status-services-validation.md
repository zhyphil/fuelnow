# France Fuel closure, 24/7, and services validation

- Status: Complete for the Phase 1 source spike
- Date checked: 2026-09-03
- Task: `P1-FR-06`
- Scope: Backend
- Source snapshot: official JSON export from `fr-fuel-realtime-v2`
- Snapshot size: 9,804 station records

## Result

The source can express fuel-level temporary shortage, seven-day schedules, 24/24 card-payment automation, and a useful service-facility list. It does not provide a trustworthy live station-level temporary-closure field, nor live working status or price for Air and Wash equipment.

The adapter and UI must keep these concepts separate:

- station schedule;
- unattended fuel payment/access;
- temporary or definitive unavailability of one fuel;
- current station-level closure;
- presence of an Air or Wash facility;
- real-time working status of that facility.

## Station-level temporary closure

No explicit station-level field such as `temporarily_closed`, `closure_start`, `closure_end`, or live `site_status` exists in the observed 47-field schema. The dataset description says records correspond to referenced open points of sale, but presence in the feed is not a real-time open/closed signal.

The snapshot contained 117 records with no current price. Among them:

| Evidence in no-price records | Records |
|---|---:|
| Any fuel marked `temporaire` | 108 |
| Any fuel marked `definitive` | 104 |
| All per-fuel shortage types null | 1 |
| 24/24 automation flag `Oui` | 55 |
| At least one service-facility label | 105 |

Several no-price records combine temporary shortages for fuels the station appears to offer with definitive non-offering for other fuels. That supports a `no currently priced fuel` conclusion, not an `entire station temporarily closed` conclusion. Air, Wash, shop, or other services may still be present.

Normalization policy:

- `temporary_closure = null` for this source;
- do not infer closure from missing prices, all-fuel shortages, missing hours, or disappearance between two snapshots;
- determine each fuel's availability from its price and per-fuel shortage fields;
- calculate schedule-based `opening_status` only when hours parse successfully;
- treat absent schedule/status as `unknown`, never `open`;
- allow a future approved live/operator source to override with separate provenance.

## 24/7 semantics

The source exposes three related signals:

1. raw schedule attribute `@automate-24-24`;
2. flattened `horaires_automate_24_24` (`Oui`/`Non`);
3. service label `Automate CB 24/24`.

Observed counts and consistency:

| Signal | Records |
|---|---:|
| Raw `@automate-24-24 = "1"` | 5,590 |
| Flattened automation flag `Oui` | 5,590 |
| Raw/flattened mismatches | 0 |
| Service label `Automate CB 24/24` | 5,629 |
| Service label yes but automation flag no | 39 |
| Automation flag yes but service label missing | 0 |
| Any explicit `00.00`–`00.00` day interval | 241 |
| Seven non-closed days all with `00.00`–`00.00` | 176 |

Product model:

- `unattended_fuel_payment_24_7 = true` only from the raw/flattened automation flag;
- `site_schedule_24_7 = true` only when all seven explicit, non-closed day schedules contain a `00.00`–`00.00` interval;
- the generic service label alone does not set either normalized flag because 39 records disagree with the schedule flag;
- 24/24 payment does not mean an attended shop, Air machine, Wash equipment, toilet, or repair service is available 24/7;
- station cards should use wording such as `24/7 card fuel access`, not an unqualified `Open 24/7`, unless the site schedule also supports it.

For parsing, an explicit `00.00`–`00.00` interval on a non-closed day is treated as an all-day interval. This convention must be regression-tested. A missing interval is not treated as all-day.

## Service-field structure

The raw `services` field was present for 9,122 records and absent for 682. Every present value decoded successfully as an object with a `service` member. The member itself varies:

| Decoded `service` shape | Records |
|---|---:|
| Array | 8,416 |
| Single string | 706 |

After normalizing a single string to a one-item array, every raw service list matched `services_service` in the checked snapshot.

Adapter requirements:

- accept the single-string/array union;
- preserve unknown service labels instead of discarding the whole record;
- map only reviewed values to product capabilities;
- retain the original French label and source provenance;
- never infer facility price, working status, access hours, or vehicle compatibility from presence alone.

## Air, Wash, and related coverage

| Source service label | Normalized capability | Records | Coverage |
|---|---|---:|---:|
| `Station de gonflage` | Air present | 5,450 | 55.59% |
| `Lavage automatique` | Automatic car wash present | 3,389 | 34.57% |
| `Lavage manuel` | Manual car wash present | 2,535 | 25.86% |
| Either reviewed Wash label | Wash present | 4,052 | 41.33% |
| Both reviewed Wash labels | Both wash types present | 1,872 | 19.09% |
| `Bornes électriques` | Charger-location hint only | 1,025 | 10.45% |

`Laverie` is a laundry facility and must not be mapped to car wash. `Bornes électriques` is not sufficient for the EV product model because it does not provide connector, power, operator, availability, or price; it may only be retained as a hint for later source reconciliation.

For Air and Wash records derived from this feed:

- presence confidence may be based on the official source;
- `price = null`;
- `working_status = unknown`;
- equipment-specific opening hours are unknown;
- last verification time is unknown because service labels have no field-level observation timestamp;
- source fetch time must not be presented as equipment verification time.

## Other observed service labels

The checked source vocabulary contained 27 unique labels. In addition to Air, Wash, payment automation, and charger hints, it includes shops, toilets, restaurants, heavy-vehicle lanes, parcel relay, repair/maintenance, cash machine, showers, Wi-Fi, and other amenities. These remain raw attributes until the product field contract explicitly maps them.

## Availability rules for V1

- Fuel: a current price is positive availability evidence; explicit `temporaire` is temporary unavailability; explicit `definitive` is non-offering; otherwise unknown.
- Station opening: derive from a successfully parsed schedule for the request time, but keep station-level live closure unknown.
- Air/Wash: source label proves only declared facility presence, not current operation.
- 24/7: show separately for unattended fuel payment and explicit all-week schedule.
- Ranking must not reward unknown live status as though it were confirmed available.

## Next implementation

`P1-FR-07` will implement these source-shape and normalization decisions in `FranceFuelAdapter`, including singleton/array handling, France-local timestamp conversion, per-fuel shortage precedence, nullable closure, and reviewed Air/Wash service mappings.
