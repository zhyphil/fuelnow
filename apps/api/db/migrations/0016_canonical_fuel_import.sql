\set ON_ERROR_STOP on

BEGIN;

CREATE TABLE canonical_source_owners (
  service_point_id uuid PRIMARY KEY REFERENCES service_points(id) ON DELETE RESTRICT,
  source_id text NOT NULL REFERENCES data_sources(id) ON DELETE RESTRICT,
  source_record_id text NOT NULL,
  fetched_at timestamptz NOT NULL,
  projection jsonb NOT NULL,
  UNIQUE (source_id, source_record_id)
);

ALTER TABLE fuel_prices ADD CONSTRAINT fuel_prices_identity_unique
  UNIQUE (id, service_point_id, fuel_type);

ALTER TABLE fuel_offers
  ADD COLUMN price_snapshot_set boolean NOT NULL DEFAULT false,
  ADD COLUMN current_price_id bigint,
  ADD CONSTRAINT fuel_offers_current_price_fk
    FOREIGN KEY (current_price_id, service_point_id, fuel_type)
    REFERENCES fuel_prices(id, service_point_id, fuel_type),
  ADD CONSTRAINT fuel_offers_snapshot_pointer_check
    CHECK (price_snapshot_set OR current_price_id IS NULL);

INSERT INTO schema_migrations (version) VALUES ('0016_canonical_fuel_import');
COMMIT;
