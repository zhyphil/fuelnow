# Spain Fuel Wash field validation

- Task: `P1-WASH-02`
- Date: 2026-09-04
- Sources: MITECO REST and Geoportal XLS snapshots
- Scope: Backend source capability

## Outcome

The validated Spain Fuel distributions do not expose Lavado, car-wash type, cleaning, vacuum, Wash price, or equipment-state fields. Spain Fuel records therefore cannot provide positive Wash-search eligibility.

## REST evidence

The official REST station schema contains 41 string fields covering identity, geography, address, fuel prices, brand/sign, sale type, margin, remittance, and scheduled hours. No field name represents Wash or related equipment.

Across 684 unique committed real records from Pinto, Madrid, Barcelona, El Prat, La Jonquera, and the border area:

- all 41 expected REST fields were observed
- no Wash-related field name was found
- every accepted normalized record retained `wash = null`
- no record gained `wash` in `serviceTypes`

Null means this source provides no knowledge. It does not mean a station definitely lacks a vehicle-wash facility.

## XLS evidence

The reviewed official `Page 1` sheet has 40 non-empty logical columns. They cover location, `Toma de datos`, fuel prices, `Rótulo`, `Tipo venta`, `Rem.`, `Horario`, and `Tipo servicio`. A header review found no Lavado, wash type, cleaning, vacuum, Wash price, or equipment-status column.

`Tipo servicio` means the customer-attention regime at the fuel pump:

- `P`: personnel provides the service
- `A`: customer self-service with personnel present
- `D`: customer self-service without personnel present

It is not a list of station facilities. A regression case passes an `A` supplement into the adapter and confirms that it remains source metadata without creating Wash.

## Product rule

- `wash = null`
- do not include Spain Fuel rows in Wash search solely from this source
- do not infer Wash from brand, station size, opening hours, attended service, or common expectations
- use another source or verified contribution only with separate provenance

All 90 package tests pass.

## Conclusion

MITECO remains appropriate for Spain Fuel but cannot answer Wash presence, type, price, or working status. A separate source is required before Spain Wash results can be offered.
