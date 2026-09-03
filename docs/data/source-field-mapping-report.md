# Phase 1 source field mapping report

- Task: `P1-RPT-01`
- Date: 2026-09-04
- Scope: France and Spain Fuel, Charge, Air and Wash
- Machine-readable mapping: [`fixtures/reports/source-field-mapping.json`](../../fixtures/reports/source-field-mapping.json)

## Mapping conventions

| Status | Meaning |
| --- | --- |
| Direct | Source field has the same product meaning after parsing/normalization |
| Derived | Product value combines source fields or applies a documented rule |
| Supplemental | Value comes from a second source and keeps separate provenance |
| Descriptive only | May be displayed with attribution but cannot drive a comparable ranking |
| Unavailable | Source cannot provide the product field; normalize to `null`/`Unknown` |

All identifiers are namespaced by source. All nullable values remain nullable; missing data must not be converted to zero, false, closed, free or unavailable. `source_observed_at`, `source_published_at` and Fuel Now `fetched_at` remain separate.

## Shared service-point fields

| Canonical field | France Fuel | Spain Fuel | France PAN Charge | Spain RIPREE Charge | OSM Air/Wash |
| --- | --- | --- | --- | --- | --- |
| `id` | `fr-fuel-realtime-v2:{id}` | `es-miteco-fuel-prices:{IDEESS}` | `fr-irve-static-pan:{id_station_itinerance}` | `es-miteco-ripree:{COD.INSTALACION}` | `openstreetmap:{type}/{id}` |
| `name` | unavailable | `Rótulo` | `nom_station` | `NOMBRE ESTACION` | `name` |
| `brand` | unavailable | exact reviewed `Rótulo`, otherwise null | `nom_enseigne` is network/sign, not automatically brand | unavailable separately | `brand`/`brand:wikidata`, source-specific |
| `operator` | unavailable | unavailable separately | `nom_operateur` | `NOMBRE OPERADOR` + `COD.OPERADOR` | `operator`/`operator:wikidata` when present |
| `latitude`/`longitude` | `geom.lat`/`geom.lon` | localized `Latitud`/`Longitud (WGS84)` | `consolidated_latitude`/`consolidated_longitude` | localized `LATITUD`/`LONGITUD` | node coordinates or way/relation `center` |
| `address.street` | `adresse` | `Dirección` | `adresse_station` | source address | `addr:street` + `addr:housenumber` |
| `address.postal_code` | `cp` | `C.P.` | address/source commune fields | source postal-code field | `addr:postcode` |
| `address.locality` | `ville` | `Localidad`/`Municipio` | `code_insee_commune` plus source address | `MUNICIPIO` | `addr:city`/`addr:place` |
| `administrative_area` | `region` | `Provincia` | derived from commune only when authoritative lookup exists | `PROVINCIA`/`CCAA` | boundary-derived supplement only |
| `opening_hours` | parsed `horaires` | parsed `Horario`; XLS supplement retained | static `horaires` | `HORARIO` plus optional text | scoped `opening_hours`; do not copy parent hours to a separate amenity |
| `source_updated_at` | latest eligible fuel `*_maj` | XLS `Toma de datos`, else REST `Fecha` publication | `date_maj` for static record only | `FECHA DE ULTIMA MODIFICACION` for static record only | OSM element edit timestamp, not equipment verification |

## Fuel mappings

### France `fr-fuel-realtime-v2`

| Canonical field | Source field(s) | Rule/status |
| --- | --- | --- |
| station identity | `id` | Direct; preserve as string |
| WGS84 location | `geom.lon`, `geom.lat` | Direct after finite/range checks |
| fuel offering | `carburants_disponibles`, `carburants_indisponibles`, per-fuel price/shortage | Derived; absence is not non-offering without evidence |
| fuel price | `{fuel}_prix` or matching objects inside `prix` | Direct EUR/litre after positive-number validation |
| price observed time | `{fuel}_maj` or price object's `@maj` | Parse as `Europe/Paris` source wall time, then UTC |
| shortage | `{fuel}_rupture_debut`, `{fuel}_rupture_type` or `rupture` objects | `temporaire` → temporary shortage; `definitive` without price → not offered |
| opening schedule | `horaires` | Parse seven-day JSON structure; preserve partial/raw value |
| unattended payment | `horaires_automate_24_24` | `Oui` means fuel-payment automation, not whole-site 24/7 |
| Air presence | `services[].service` or `services_service` = `Station de gonflage` | Direct presence only; price and working status unavailable |
| Wash presence | exact `Lavage automatique` and/or `Lavage manuel` | Direct source labels; detailed type, price and working status unavailable |
| temporary site closure | unavailable | `Unknown`; fuel shortage must not close the whole station |

Fuel product columns normalize as follows:

| Source label / ID | Price and update fields | Canonical fuel | Unit |
| --- | --- | --- | --- |
| `Gazole` / `1` | `gazole_prix`, `gazole_maj` | `diesel` | EUR/litre |
| `SP95` / `2` | `sp95_prix`, `sp95_maj` | `sp95` | EUR/litre |
| `E85` / `3` | `e85_prix`, `e85_maj` | `e85` | EUR/litre |
| `GPLc` / `4` | `gplc_prix`, `gplc_maj` | `lpg` | EUR/litre |
| `E10` / `5` | `e10_prix`, `e10_maj` | `sp95_e10` | EUR/litre |
| `SP98` / `6` | `sp98_prix`, `sp98_maj` | `sp98` | EUR/litre |

### Spain `es-miteco-fuel-prices`

| Canonical field | Source field(s) | Rule/status |
| --- | --- | --- |
| station identity | `IDEESS` | Direct; canonical source ID is `es-miteco-fuel-prices` |
| station name/sign | `Rótulo` | Direct name; brand only for exact reviewed brand values |
| WGS84 location | `Latitud`, `Longitud (WGS84)` | Parse decimal comma and enforce Spain service bounds |
| public sale | `Tipo Venta` | `P` expected; unknown values are warnings |
| fuel price | reviewed `Precio *` columns | Parse positive three-decimal comma value |
| source publication | REST `Fecha` | Snapshot publication, not an individual station observation |
| station observation | XLS `Toma de datos` | Supplemental; join only by safe composite/discriminator match |
| opening schedule | REST `Horario` | Parse Spanish weekday ranges and intervals |
| service mode | XLS `Tipo servicio` | Supplemental descriptive source value; not Air/Wash evidence |
| Air/Wash/closure | unavailable | `Unknown`; no matching REST/XLS fields |

| Source product / ID | Source price column | Canonical fuel | Unit |
| --- | --- | --- | --- |
| Gasóleo A habitual / `4` | `Precio Gasoleo A` | `diesel` | EUR/litre |
| Gasóleo Premium / `5` | `Precio Gasoleo Premium` | `premium_diesel` | EUR/litre |
| Gasolina 95 E5 / `1` | `Precio Gasolina 95 E5` | `sp95` | EUR/litre |
| Gasolina 95 E10 / `23` | `Precio Gasolina 95 E10` | `sp95_e10` | EUR/litre |
| Gasolina 98 E5 / `3` | `Precio Gasolina 98 E5` | `sp98` | EUR/litre |
| Gasolina 95 E85 / `25` | `Precio Gasolina 95 E85` | `e85` | EUR/litre |
| Gases licuados del petróleo / `17` | `Precio Gases licuados del petróleo` | `lpg` | EUR/litre |
| Gas natural comprimido / `18` | `Precio Gas Natural Comprimido` | `cng` | EUR/kilogram |
| Gas natural licuado / `19` | `Precio Gas Natural Licuado` | `lng` | EUR/kilogram |

## Charge static mappings

| Canonical field | France PAN static | Spain RIPREE static | Rule |
| --- | --- | --- | --- |
| service-point ID | `id_station_itinerance` | `COD.INSTALACION` | Namespace by source/country |
| EVSE ID | `id_pdc_itinerance` | `ID. PUNTO DE RECARGA` | Dynamic join candidate |
| connector ID | unavailable; capability flags only | `(ID. PUNTO DE RECARGA, ID. CONECTOR)` | France connector IDs nullable; Spain ID is composite |
| government EVSE code | unavailable separately | `COD. PUNTO DE RECARGA` | Preserve in raw/provenance |
| operator | `nom_operateur` | `NOMBRE OPERADOR` | Do not merge with network/owner |
| operator code | unavailable | `COD.OPERADOR` | Source-namespaced identity |
| network/sign | `nom_enseigne` | unavailable separately | Nullable |
| owner/developer | `nom_amenageur` + `siren_amenageur` | unavailable separately | Distinct from operator |
| connector type | `prise_type_*` boolean flags | `TIPO CONECTOR` + `FORMATO` | Apply reviewed connector enum; preserve unknown raw values |
| rated power | EVSE `puissance_nominale` | connector `POTENCIA MAXIMA` | Parse kW; quarantine ≤0, <1 or >1,000 kW pending review |
| electrical detail | unavailable consistently | `TIPO CARGA`, `TENSION`, `INTENSIDAD` | Optional; never infer delivered speed |
| free/paid | `gratuit` | unavailable | Nullable boolean; not comparable price |
| tariff | `tarification` | unavailable | France descriptive only; not Charge Cheapest |
| payment | `paiement_acte`, `paiement_cb`, `paiement_autre` | `METODO PAGO` | Normalize only reviewed values; does not prove tariff |
| reservation | `reservation` | payment/service text only when explicit | Nullable; preserve raw evidence |
| access/accessibility | `condition_acces`, `accessibilite_pmr`, `restriction_gabarit` | `ACCESIBILIDAD`, location/access fields | Nullable, source-specific |
| static updated time | `date_maj` | `FECHA DE ULTIMA MODIFICACION` | Static-record evidence only |
| availability | unavailable | unavailable | Must be joined from an approved dynamic source |

Connector normalization is shared by both sources:

| Canonical connector | France PAN evidence | Spain RIPREE evidence |
| --- | --- | --- |
| `ccs_combo_2` | `prise_type_combo_ccs=true` | `IEC_62196_T2_COMBO` |
| `type_2` | `prise_type_2=true` | `IEC_62196_T2` + socket |
| `type_2_attached` | `cable_t2_attache=true` | `IEC_62196_T2` + cable |
| `chademo` | `prise_type_chademo=true` | `CHADEMO` |
| `domestic_socket` | `prise_type_ef=true` | reviewed `DOMESTIC_A/E/F/L` values |
| `tesla_eu` | unavailable | `TeslaConnectorEurope` |
| `unknown` | `prise_type_autre=true` | unreviewed Type 1/3, IEC 60309 or unknown values |

## Charge dynamic mappings

| Canonical field | France QualiCharge/PAN dynamic | Spain Reve/SGV candidate | Rule |
| --- | --- | --- | --- |
| EVSE join ID | `id_pdc_itinerance` | `evse_id` | Must join unambiguously to static inventory |
| status observed/changed | `horodatage` | `status_updated_at`/API change time | Never replace with fetch time |
| EVSE operational | `etat_pdc` | bulk `operational_status` | Spain `true` means operational, not available |
| occupancy/status | `occupation_pdc` + `etat_pdc` | individual EVSE `status` | Map through reviewed priority rules |
| connector condition | `etat_prise_type_2`, `etat_prise_type_combo_ccs`, `etat_prise_type_chademo`, `etat_prise_type_ef` | connector/status objects when authorised | Higher-level out-of-service wins |
| tariffs | unavailable | connector tariff components | France Unknown; Spain production-disabled pending terms/API |
| availability count | derived per eligible Live EVSE | derived only after approval | Count EVSEs, never connector rows |

France state mapping uses `hors_service → out_of_service`, `en_service + libre → available`, `en_service + occupe → occupied`, `en_service + reserve → reserved`, and unsafe/old/conflicting values → `unknown`. Reve's exact statuses map `AVAILABLE`, `CHARGING`, `RESERVED`, `BLOCKED`/`INOPERATIVE`/`OUTOFORDER`/`PLANNED`, `REMOVED`, and `UNKNOWN` according to the unified EV mapping; the source remains disabled for V1 production.

## OSM Air/Wash supplemental mappings

| Canonical field | OSM evidence | Rule |
| --- | --- | --- |
| Air eligibility | `amenity=compressed_air` or `compressed_air=yes` | Positive evidence only; explicit `no` is negative for that element |
| Air fee | dedicated amenity `fee`, or parent `compressed_air:fee` | Descriptive nullable value; do not assume free from absence |
| Air access | dedicated amenity `access`, or parent `compressed_air:access` | Preserve reviewed values; missing is Unknown |
| Air detail | `pressure`, `valves` or scoped variants | Optional raw/source attributes |
| Wash eligibility | `amenity=car_wash` or `car_wash=yes` | Positive evidence only |
| Wash attributes | dedicated `self_service`, `automated`, `fee` | Do not infer rollers/touchless/hand wash beyond explicit evidence |
| hours | `opening_hours` | Use only when scoped to the actual service element |
| equipment status | unavailable | Presence/edit time is not proof that equipment works |
| verification time | unavailable | OSM edit timestamp is provenance, not `last_verified_at` |

OSM remains a separate provenance-bearing supplement. A proximity match may not silently overwrite or merge an official record; ambiguous conflation is quarantined.

## Known gaps carried into implementation

- France Fuel has no reliable station name/brand or whole-site temporary-closure field.
- Spain Fuel has no Air/Wash or whole-site closure field.
- Air and Wash sources do not provide dependable live working state or comparable price.
- French Charge sources have no comparable dynamic tariff.
- Spain RIPREE has no dynamic availability/tariff; Reve remains production-disabled.
- Opening hours, record updates and source fetch times do not imply current service availability.

## Acceptance result

`P1-RPT-01` passes because every selected source now has an explicit route into the canonical service-point, Fuel, Charge, Air, Wash, timestamp and provenance fields. Derived and unavailable values are marked, source identities are consistent with adapters, and the mapping preserves the Unknown semantics established in Phase 0.
