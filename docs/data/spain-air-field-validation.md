# Spain Fuel Air field validation

- Task: `P1-AIR-02`
- Date: 2026-09-03
- Sources: MITECO REST and Geoportal XLS snapshots
- Scope: Backend source capability

## Outcome

The validated Spain Fuel distributions do not expose `Aire y agua`, tyre inflation, compressed-air, water, pressure, vacuum, Air price, or equipment-state fields. Spain Fuel records therefore cannot provide positive Air-search eligibility.

## REST evidence

The official REST station schema contains 41 string fields covering identity, geography, address, fuel prices, brand/sign, sale type, margin, remittance, and scheduled hours. No field name represents Air or related equipment.

Across 684 unique committed real records from Pinto, Madrid, Barcelona, El Prat, La Jonquera, and the border area:

- all 41 expected REST fields were observed
- no equipment-related field name was found
- every accepted normalized record retained `air = null`
- no record gained `air` in `serviceTypes`

Null means this source provides no knowledge. It does not mean a station definitely lacks an inflation facility.

## XLS evidence

The official `Page 1` sheet has 40 non-empty logical columns. They cover location, `Toma de datos`, fuel prices, `Rótulo`, `Tipo venta`, `Rem.`, `Horario`, and `Tipo servicio`. A header review found no Air, water, inflation, pressure, vacuum, wash, or equipment-status column.

`Tipo servicio` means the customer-attention regime:

- `P`: personnel provides the service
- `A`: customer self-service with personnel present
- `D`: customer self-service without personnel present

It is not a list of facilities. A regression case passes an `A` supplement into the adapter and confirms that it remains source metadata without creating Air.

## Product rule

- `air = null`
- do not include Spain Fuel rows in Air search solely from this source
- do not infer Air from brand, station size, opening hours, attended service, or common expectations
- use another source or verified contribution only with separate provenance

All 86 package tests pass.
