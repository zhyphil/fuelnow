# P5-QA-02: unified field conversion

Existing contract tests cover canonical Fuel, EV, Air, Wash, source, geographic,
opening and lifecycle schemas, including semantic validation beyond JSON shape.
`unified-fuel-model.test.ts` checks both implemented source adapters through the
same normalization entry point. Source timestamp tests distinguish observation,
publication and fetch time.

New boundary tests add country-prefixed identity collision safety, EUR and litre/
kilogram units, absent price/source time, positive-evidence-only Air/Wash and
false-vs-unknown stock state. They found and fixed a lossy French conversion:
missing or unrecognized unattended-payment flags previously became `false`.
Only explicit `Oui`/`Non` now become true/false; everything else stays null.
Unattended payment never establishes station or equipment opening.

Source-normalized exploratory records and canonical database/API records are
different models. These tests do not prove that a production source-to-database
projection or EV ingestion pipeline exists; that release gap remains open.
