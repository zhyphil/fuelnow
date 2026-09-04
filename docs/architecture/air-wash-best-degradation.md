# Air and Wash Best degradation

- Task: `P3-BEST-09`
- Date: 2026-09-04
- Scope: Backend Air/Wash decision ranking
- Formula version: `limited-service-best-v1`

## Outcome

Air and Wash retain an honest, useful Best mode without pretending V1 has
comparable prices or real-time equipment availability. The formula uses only
distance plus decision factors that are explicitly supported in the current
result set. It returns the factors and weights actually used, together with
machine-readable degradation reasons.

## Base weights

| Component           | Air | Wash |
| ------------------- | --: | ---: |
| DistanceScore       | 65% |  70% |
| service OpenScore   | 15% |  15% |
| public AccessScore  | 10% |   0% |
| ReliabilityScore    | 10% |  15% |

The initial weights are versioned rules, not a learned model. Phase 6 may
recalibrate them only with a new formula version and regression review.

## Result-set-level degradation

Distance is always active. An optional component becomes active only when at
least one eligible candidate has decision-grade evidence for it. Inactive base
weight is redistributed proportionally across the active components once for
the whole result set, never separately per candidate.

This distinction prevents a candidate with missing data from gaining an
advantage through per-candidate renormalization. Once a component is active,
another candidate's Unknown value contributes zero. When distance is the only
active component, its applied weight is 100%, the mode is
`nearest_equivalent`, and ordering exactly matches the straight-line Nearest
fallback.

The three reported modes are:

- `nearest_equivalent`: distance only;
- `distance_and_quality`: distance plus source confidence; and
- `limited_best`: service-scoped hours and/or Air access also participate.

## Evidence boundaries

Only an opening status explicitly scoped to the requested Air or Wash service
can contribute. Fuel-station/site hours are ignored for this formula. Explicit
service closure excludes the candidate; Unknown service hours keep it eligible
without a positive score.

For Air, explicit public access scores positively. `customers_only` is retained
as a known restriction but receives no public-access advantage; Unknown does not
activate the factor. Wash has no corresponding V1 access component.

Positive official or accepted OSM service presence is mandatory. Permanent or
temporary location closure, service closure, and explicitly broken/closed or
temporarily unavailable equipment are excluded. Unknown equipment state remains
eligible because absence of evidence is not evidence of failure, but it never
receives an availability score.

## Deliberately unavailable factors

Air reports `price_not_comparable` and
`equipment_available_now_unsupported`. Wash additionally reports
`wash_type_not_ranked`. These factors cannot silently enter Best until later
data acquisition establishes comparable, current and licensed evidence.

## Verification

Tests cover Air and Wash base/applied weights, distance-only Nearest equivalence,
result-set-level reweighting, per-candidate Unknown behavior, service-versus-site
hours, public/customer-only access, confidence, all hard exclusions, mixed
service and duplicate identity rejection, partial confidence rejection and
input immutability. The complete repository quality gate has 430 passing tests.
