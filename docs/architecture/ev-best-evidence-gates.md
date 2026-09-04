# EV Best evidence gates

- Task: `P3-BEST-08`
- Date: 2026-09-04
- Scope: Backend Charge evidence integration
- Formula version: `ev-best-v1`

## Outcome

EV Best now prepares decision-ready inputs from station and EVSE evidence before
applying `ev-best-v1`. It uses real driving ETA when routing produced one, exact
connector compatibility, compatible rated power and strictly gated French live
availability. Missing evidence remains unknown and receives no invented score.

## Compatibility and rated power

A candidate must expose at least one exact requested canonical connector type.
`unknown` never proves compatibility, and an explicitly non-operational
connector is excluded. The power component uses only rated power from compatible
connectors, bounded to 1–1,000 kW, and scores each eligible candidate relative to
the highest eligible compatible rated power in the same result set.

Implausible or missing power is quarantined as unknown without erasing otherwise
proven connector compatibility. Output labels the value as rated power; it is
not claimed to be delivered charging power.

## Route evidence

Real Matrix ETA feeds `TravelTimeScore`. A missing ETA remains null and receives
zero for that component; straight-line distance remains the honest fallback.
Only candidates that pass connector and closure eligibility establish the
distance, ETA and power comparison baselines.

## Availability gate

Positive availability is enabled only when all of these conditions hold:

- the station is in France;
- the evidence comes from the approved `fr-qualicharge-irve` source;
- EVSE identity is resolved;
- neither conflict nor quarantine is present;
- the source's last successful sync is at most 10 minutes old;
- the EVSE observation is at most 5 minutes old;
- a compatible connector is explicitly operational; and
- the EVSE is explicitly `available`.

Future, invalid or missing timestamps fail the gate. Failure reasons use a fixed
priority, so multiple EVSE records produce the same explanation regardless of
input order. Spain remains `country_not_supported` because V1 has no approved
decision-grade dynamic availability source there.

## Deliberately absent inputs

Charge price is not part of `ev-best-v1`. Queue wait and actual charging duration
remain null, so Time-to-Solution is explicitly incomplete. They may be enabled
only after future source, vehicle, battery and charge-curve evidence passes a
separate decision-grade gate.

## Verification

Tests cover connector compatibility, compatible-only power, ETA presence and
absence, French freshness/source/identity/conflict gates, connector live state,
stable failure explanations, Spain degradation, closure exclusion, implausible
power and invalid requests. The complete repository quality gate has 421 passing
tests.
