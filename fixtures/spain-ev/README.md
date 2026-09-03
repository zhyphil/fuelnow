# Spain EV source profile

The complete RIPREE national export is too large and too volatile to commit. This directory stores a reproducible profile and a small field-focused sample captured from the official MITECO export.

## Capture

- Captured: `2026-09-03T22:17:55Z` (`2026-09-04` Europe/Paris)
- Dataset: [Puntos de recarga de vehículos eléctricos](https://catalogo.datosabiertos.miteco.gob.es/catalogo/es/dataset/6ee8d46f-93bd-478f-8e29-3ba4f6d8405c)
- Export page: `https://energia.serviciosmin.gob.es/Ripree/ExportarInstalaciones/Export`
- Export request: `POST https://energia.serviciosmin.gob.es/Ripree/ExportarInstalaciones/GenerarExcel` with JSON body `{"soloConsolidado":true}`
- Full-file SHA-256 values and parsed counts: [`static-source-profile.json`](./static-source-profile.json)
- Selected Madrid, Barcelona, El Prat and La Jonquera evidence: [`target-geography-sample.json`](./target-geography-sample.json)
- Reve/SGV availability, tariff and public API profile: [`dynamic-source-profile.json`](./dynamic-source-profile.json)
- Selected status, tariff and static/dynamic identity cases: [`dynamic-source-sample.json`](./dynamic-source-sample.json)

The sample contains selected normalized strings from the official CSV, not its complete 27-field schema. Regenerate profiles from complete downloads; do not infer national counts from the small sample.

The Reve sample is diagnostic evidence from the anonymous public map. Production code must use the documented external API after access, quota and terms are approved; it must not depend on the map's internal UI endpoints.

