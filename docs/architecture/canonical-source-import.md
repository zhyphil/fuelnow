# Canonical source import

## Fuel projection — P5-QA-10a

`projectFuelSource` wraps the existing France/Spain adapters with canonical contract validation. A permanent namespace plus the country, source ID and original record ID generates a deterministic UUID v5. Name, coordinates and collection time are not identity inputs. No proximity-based merging is performed.

Source and licence attribution are retained. The score mapping (high 80, medium 60, low 20) is an engineering band, not a statistical probability. Collection time is never field verification time. Station field provenance remains undated when the source only dates prices. Individual fuel timestamps and EUR/litre versus EUR/kg units are retained. Future observations are rejected at the canonical boundary.

Weekly opening schedules remain schedules, not live open/closed observations. Fuel payment automation does not imply that air or wash facilities are open 24/7. Air/wash presence does not prove equipment operation, price, free access, or a particular wash type.

This step is a pure projection, not an import or a release approval. Transactional persistence, collection switches, current-source integration and native/manual verification remain separate checklist items.
