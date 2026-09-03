# Spain Fuel official source investigation

- Status: Source and endpoints identified; licence review is tracked separately in `P1-ES-02`
- Date checked: 2026-09-03
- Task: `P1-ES-01`
- Scope: Backend

## Selected official source

Use the Spanish Ministry for Ecological Transition and Demographic Challenge (MITECO) fuel-installation dataset and its current land-station REST service:

```text
Instalaciones de suministro de combustibles a vehículos y embarcaciones con venta pública
```

- Publisher: `Ministerio para la Transición Ecológica y el Reto Demográfico`
- Current REST service host: `energia.serviciosmin.gob.es`
- Official catalogue dataset UUID: `902a266d-5ba2-4735-a378-45818ba5a4f4`
- National current-station response observed: 11,475 records on 2026-09-03
- Response note: current prices are refreshed every 30 minutes

This is the primary Spain Fuel candidate because it returns a national current snapshot with station identity, address, locality, municipality/province identifiers, coordinates, opening hours, brand/sign (`Rótulo`), sale/service type, discount metadata, and current prices for a broad fuel/product vocabulary.

## Canonical pages

- MITECO open-data catalogue dataset:  
  `https://catalogo.datosabiertos.miteco.gob.es/catalogo/es/dataset/902a266d-5ba2-4735-a378-45818ba5a4f4`
- National datos.gob.es catalogue mirror:  
  `https://datos.gob.es/es/catalogo/e05068001-instalaciones-de-suministro-de-combustibles-a-vehiculos-con-venta-publica`
- Current REST help/index:  
  `https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/help`
- Geoportal download surface:  
  `https://geoportalgasolineras.es/geoportal-instalaciones/DescargarFicheros`

## Primary current-price endpoint

```http
GET https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/EstacionesTerrestres/
```

Observed on 2026-09-03:

| Property | Result |
|---|---|
| HTTP status | 200 |
| Content type | `application/json; charset=utf-8` |
| CORS | `Access-Control-Allow-Origin: *` |
| Authentication | No credential required for tested GET |
| Response size | approximately 12.2 MB |
| `ResultadoConsulta` | `OK` |
| `Fecha` | `03/09/2026 22:44:35` |
| Station count | 11,475 |
| Documented-in-response cadence | every 30 minutes |

The top-level response contains:

```text
Fecha
ListaEESSPrecio
Nota
ResultadoConsulta
```

Despite older catalogue labels and user reports describing an unusual format, the tested endpoint returned valid JSON and parsed successfully.

## Observed station fields

The first checked record included:

### Identity and geography

- `IDEESS`
- `IDMunicipio`
- `IDProvincia`
- `IDCCAA`
- `C.P.`
- `Dirección`
- `Localidad`
- `Municipio`
- `Provincia`
- `Latitud`
- `Longitud (WGS84)`
- `Margen`

### Station and service information

- `Rótulo`
- `Horario`
- `Tipo Venta`
- `Remisión`

### Price/product columns

The response includes current-price columns for conventional and alternative products, including:

- Gasolina 95 E5/E10/E25/E85 and premium variants
- Gasolina 98 E5/E10
- Gasóleo A, Premium, B, and C
- Bioetanol and Biodiésel
- GLP, GNC, and GNL
- Hidrógeno and AdBlue
- renewable diesel/gasoline
- methanol, ammonia, compressed/liquefied biogas

Numbers are localized strings. The checked record used decimal commas, for example `1,689`, and empty strings for missing prices. Coordinates also use decimal commas. Adapters must parse locale-aware strings without converting empty values to zero.

## Filter and reference endpoints

The current official help page documents GET endpoints for:

- national current land stations;
- current stations filtered by autonomous community, province, municipality, product, or combined geography/product;
- dated historical land-station snapshots and the same filters;
- autonomous community, province, municipality, and petroleum-product reference lists;
- maritime fuel points and filters.

Useful current endpoints include:

```text
EstacionesTerrestres/FiltroCCAA/{IDCCAA}
EstacionesTerrestres/FiltroCCAAProducto/{IDCCAA}/{IDProducto}
EstacionesTerrestres/FiltroMunicipio/{IDMunicipio}
EstacionesTerrestres/FiltroMunicipioProducto/{IDMunicipio}/{IDProducto}
EstacionesTerrestres/FiltroProducto/{IDProducto}
EstacionesTerrestres/FiltroProvincia/{IDProvincia}
EstacionesTerrestres/FiltroProvinciaProducto/{IDProvincia}/{IDProducto}
Listados/ComunidadesAutonomas/
Listados/Municipios/
Listados/MunicipiosPorProvincia/{IDProvincia}
Listados/ProductosPetroliferos/
Listados/Provincias/
Listados/ProvinciasPorComunidad/{IDCCAA}
```

The tested province filters returned:

| Province ID | Province | Records |
|---|---|---:|
| `28` | Madrid | 894 |
| `08` | Barcelona | 800 |

Both responses reported `ResultadoConsulta = OK` and contained only the expected province value.

The official product list returned 30 product identifiers. Important V1 mapping candidates include:

| Product ID | Official name | Abbreviation |
|---:|---|---|
| 1 | Gasolina 95 E5 | `G95E5` |
| 23 | Gasolina 95 E10 | `G95E10` |
| 3 | Gasolina 98 E5 | `G98E5` |
| 4 | Gasóleo A habitual | `GOA` |
| 5 | Gasóleo Premium | `GOA+` |
| 17 | Gases licuados del petróleo | `GLP` |
| 18 | Gas natural comprimido | `GNC` |
| 19 | Gas natural licuado | `GNL` |

Exact V1 mappings will be validated against samples rather than inferred solely from product names.

## Official file fallback

The Geoportal exposes a current national XLS snapshot:

```text
https://geoportalgasolineras.es/resources/files/preciosEESS_es.xls
```

Observed on 2026-09-03:

- HTTP 200;
- content type `application/vnd.ms-excel`;
- size approximately 7.8 MB;
- `Last-Modified` was present and about 45 minutes before the check.

The catalogue also lists KML and WMS outputs. They may help independent geographic comparison, but the current REST JSON and XLS are better initial adapter candidates.

## Legacy host compatibility

The datos.gob.es catalogue still links to:

```text
https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/
```

That legacy-host URL also returned HTTP 200 and a valid current JSON response during the check. The canonical implementation should use the `energia.serviciosmin.gob.es` host shown by the current MITECO help page and treat the legacy hostname only as a monitored compatibility alias, not an automatic failover until equivalence is continuously tested.

## Recommended ingestion use

### Phase 1 spike

- Capture a bounded raw sample from the current REST response in `P1-ES-03`.
- Record the response envelope separately from station rows.
- Validate localized decimals, `Fecha` timezone, station `Horario`, `Rótulo`, `Tipo Venta`, and product columns.
- Compare a bounded sample against the XLS before selecting a production fallback.

### Formal synchronization

- Prefer one national current REST snapshot per useful cycle.
- Parse and validate the complete response before replacing the last-known-good snapshot.
- Record response `Fecha`, fetch time, record count, checksum, parsing failures, response size, and HTTP status.
- Start at the stated 30-minute cadence; do not poll more frequently without evidence of value.
- Use province filters for targeted diagnostics, not as a default way to multiply national API requests.
- Perform GPS radius filtering after national ingestion with PostGIS; the documented REST API has geography-ID/product filters, not an arbitrary GPS-radius endpoint.
- Keep XLS as a format-diverse fallback after schema-equivalence tests exist.

## Risks and follow-up

- `P1-ES-02`: verify the exact licence, commercial reuse, caching, redistribution, and attribution requirements. The catalogue currently reports CC BY 4.0 for the modern dataset; this must be formally reviewed before approval.
- `P1-ES-03`: save a bounded raw fixture and complete field dictionary.
- The approximately 12.2 MB response should be streamed/size-limited and guarded by timeout and last-known-good behavior.
- The response uses Spanish-local date/time and decimal formatting that require explicit parsing tests.
- `Horario` is free-form text and needs empirical grammar coverage.
- The REST response does not by itself prove Air/Water, Wash, temporary station closure, or live equipment status coverage.
- Monitor both the official catalogue UUID/resources and REST help page for endpoint/schema changes.

## Conclusion

The MITECO `EstacionesTerrestres/` REST JSON service on `energia.serviciosmin.gob.es` is the selected primary source for the Spain Fuel feasibility spike. It is public, current, nationwide, parseable, and provides the identity, coordinates, hours, brand/sign, and broad current-price fields needed to proceed.
