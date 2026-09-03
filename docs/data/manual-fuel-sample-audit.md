# Manual real-station Fuel audit

- Task: `P1-FUEL-10`
- Date: 2026-09-03
- Scope: Full-stack source-to-display contract
- Samples inspected: 10

## Method

Ten committed records were opened and inspected field by field. For France, the audit compared flattened price/update fields, available/unavailable arrays, rupture type, address, and 24/24 automation. For Spain, it compared the localized price strings, address/name, opening-hours string, and product unit. The resulting normalized objects were then checked for the same station identity, location, product, amount, unit, stock meaning, and 24/7 meaning.

The focused regression test locks these manually reviewed expectations so later adapter refactors cannot silently alter them.

## France samples

| Area / source ID | Source values inspected | Normalized check |
|---|---|---|
| Toulouse `31000001` | Gazole 2.250; SP95 1.990; SP98 temporary shortage; automate 24/24 | diesel 2.250 EUR/L; sp95 1.990 EUR/L; SP98 out of stock with null price; unattended Fuel true |
| Paris `75001003` | Gazole 2.490; SP95 2.330; SP98 2.480 | Three matching EUR/L prices and Paris address |
| A9 Villages Catalans `66300013` | Gazole 2.349; E10 2.214; SP98 2.344; GPLc 1.139; SP95 definitive rupture | Four matching prices; SP95 omitted as permanently not offered |
| Le Boulou `66160001` | Gazole 2.189; E10 2.041; SP98 2.145; SP95 definitive rupture; automate 24/24 | Three matching prices; SP95 omitted; unattended Fuel true |

## Spain samples

| Area / source ID | Source values inspected | Normalized check |
|---|---|---|
| Madrid `4508` | Gasóleo A 1,799; Premium 1,799; Gasolina 95 E5 1,769 | diesel 1.799, premium diesel 1.799, sp95 1.769 EUR/L |
| Barcelona `9020` | Gasóleo A 1,849; Gasolina 95 E5 1,819 | diesel 1.849 and sp95 1.819 EUR/L |
| El Prat airport `10912` | Five mapped prices; `L-D: 00:00-23:59` | Matching EUR/L prices; not falsely labelled true 24/7 because of the one-minute schedule gap |
| Pinto `13781` | LPG 0,839; GNC 1,799; GNL 1,699; `L-D: 24H` | LPG EUR/L; CNG/LNG EUR/kg; site schedule 24/7 |
| La Jonquera N-II `1850` | Diesel 1,769; Premium 1,859; SP95 1,859; SP98 1,969 | Four matching EUR/L prices and Girona-area identity |
| La Jonquera AP-7 `2332` | Diesel 1,809; SP95 1,899; SP98 2,009; LPG 1,169; `L-D: 24H` | Four matching EUR/L prices, AP-7 address, site schedule 24/7 |

## Important semantic check

The source's French `carburants_indisponibles` list is not sufficient by itself to label a product temporarily out of stock. A `rupture_type = definitive` means permanent non-offering and the product is omitted from the station's normalized offerings. A temporary rupture remains an offered product with `outOfStock = true`. The A9 and Le Boulou SP95 records validated the first case; Toulouse SP98 validated the second.

## Result

All ten station IDs, addresses/localities, selected price amounts, fuel mappings, units, and status semantics match their captured official records. No adapter defect remained after applying the documented permanent-non-offering distinction. The repository now has 82 passing tests.

This is a bounded engineering audit, not a claim that all national records were manually verified or that captured prices remain current after their source timestamps.
