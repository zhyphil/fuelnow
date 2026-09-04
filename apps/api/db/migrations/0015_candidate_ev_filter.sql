\set ON_ERROR_STOP on

BEGIN;

DROP FUNCTION search_service_point_candidates(
  double precision,
  double precision,
  integer,
  text,
  integer,
  text,
  text
);

CREATE FUNCTION search_service_point_candidates(
  p_longitude double precision,
  p_latitude double precision,
  p_radius_metres integer,
  p_service_type text,
  p_limit integer DEFAULT 200,
  p_country text DEFAULT NULL,
  p_fuel_type text DEFAULT NULL,
  p_connector_type text DEFAULT NULL,
  p_minimum_power_kw double precision DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  country text,
  name text,
  brand text,
  longitude double precision,
  latitude double precision,
  lifecycle_status text,
  opening_status text,
  opening_status_evaluated_at timestamptz,
  service_opening_status text,
  service_opening_status_evaluated_at timestamptz,
  temporary_closure boolean,
  straight_line_distance_m double precision
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  origin geography(Point, 4326);
BEGIN
  IF p_longitude IS NULL OR p_longitude NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'longitude must be between -180 and 180';
  END IF;
  IF p_latitude IS NULL OR p_latitude NOT BETWEEN -90 AND 90 THEN
    RAISE EXCEPTION 'latitude must be between -90 and 90';
  END IF;
  IF p_radius_metres IS NULL OR p_radius_metres NOT BETWEEN 1 AND 100000 THEN
    RAISE EXCEPTION 'radius must be between 1 and 100000 metres';
  END IF;
  IF p_service_type IS NULL OR p_service_type NOT IN (
    'fuel', 'charging', 'air', 'wash'
  ) THEN
    RAISE EXCEPTION 'unsupported service type %', p_service_type;
  END IF;
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'candidate limit must be between 1 and 500';
  END IF;
  IF p_country IS NOT NULL AND p_country NOT IN ('FR', 'ES') THEN
    RAISE EXCEPTION 'unsupported country %', p_country;
  END IF;
  IF p_fuel_type IS NOT NULL AND p_fuel_type NOT IN (
    'sp95', 'sp95_e10', 'sp98', 'e85', 'diesel',
    'premium_diesel', 'lpg', 'cng', 'lng'
  ) THEN
    RAISE EXCEPTION 'unsupported fuel type %', p_fuel_type;
  END IF;
  IF p_fuel_type IS NOT NULL AND p_service_type <> 'fuel' THEN
    RAISE EXCEPTION 'fuel type filter requires fuel service';
  END IF;
  IF p_connector_type IS NOT NULL AND p_connector_type NOT IN (
    'ccs_combo_2', 'type_2', 'type_2_attached', 'chademo',
    'domestic_socket', 'tesla_eu'
  ) THEN
    RAISE EXCEPTION 'unsupported selectable connector type %', p_connector_type;
  END IF;
  IF p_minimum_power_kw IS NOT NULL AND
     p_minimum_power_kw NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'minimum power must be between 1 and 1000 kW';
  END IF;
  IF (p_connector_type IS NOT NULL OR p_minimum_power_kw IS NOT NULL) AND
     p_service_type <> 'charging' THEN
    RAISE EXCEPTION 'EV connector filters require charging service';
  END IF;

  origin := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;

  RETURN QUERY
  SELECT
    point.id,
    point.country,
    point.name,
    point.brand,
    ST_X(point.location::geometry),
    ST_Y(point.location::geometry),
    point.lifecycle_status,
    point.opening_status,
    point.opening_status_evaluated_at,
    service.opening_status,
    service.opening_status_evaluated_at,
    point.temporary_closure,
    ST_Distance(point.location, origin)
  FROM service_points AS point
  JOIN service_point_services AS service
    ON service.service_point_id = point.id
    AND service.service_type = p_service_type
  WHERE point.lifecycle_status <> 'permanently_closed'
    AND (p_country IS NULL OR point.country = p_country)
    AND (
      p_fuel_type IS NULL OR EXISTS (
        SELECT 1
        FROM fuel_offers AS offer
        WHERE offer.service_point_id = point.id
          AND offer.fuel_type = p_fuel_type
          AND offer.unavailable_reason IS DISTINCT FROM 'permanent_non_offering'
      )
    )
    AND (
      (p_connector_type IS NULL AND p_minimum_power_kw IS NULL) OR EXISTS (
        SELECT 1
        FROM charging_evses AS evse
        JOIN charging_connectors AS connector ON connector.evse_id = evse.id
        WHERE evse.service_point_id = point.id
          AND connector.operational IS DISTINCT FROM false
          AND (p_connector_type IS NULL OR connector.connector_type = p_connector_type)
          AND (p_minimum_power_kw IS NULL OR connector.power_kw >= p_minimum_power_kw)
      )
    )
    AND ST_DWithin(point.location, origin, p_radius_metres)
  ORDER BY ST_Distance(point.location, origin), point.id
  LIMIT p_limit;
END
$function$;

INSERT INTO schema_migrations (version)
VALUES ('0015_candidate_ev_filter')
ON CONFLICT (version) DO NOTHING;

COMMIT;
