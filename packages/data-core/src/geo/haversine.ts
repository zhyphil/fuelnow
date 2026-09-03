const EARTH_MEAN_RADIUS_M = 6_371_008.8;

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export function assertValidGeoPoint(point: GeoPoint, label = "point"): void {
  if (!Number.isFinite(point.latitude) || point.latitude < -90 || point.latitude > 90) {
    throw new RangeError(`${label}.latitude must be between -90 and 90`);
  }
  if (
    !Number.isFinite(point.longitude) ||
    point.longitude < -180 ||
    point.longitude > 180
  ) {
    throw new RangeError(`${label}.longitude must be between -180 and 180`);
  }
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceMeters(
  origin: GeoPoint,
  destination: GeoPoint,
): number {
  assertValidGeoPoint(origin, "origin");
  assertValidGeoPoint(destination, "destination");

  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);
  const latitudeDelta = destinationLatitude - originLatitude;
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const halfLatitude = Math.sin(latitudeDelta / 2);
  const halfLongitude = Math.sin(longitudeDelta / 2);
  const haversine =
    halfLatitude * halfLatitude +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      halfLongitude *
      halfLongitude;
  const angularDistance =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return EARTH_MEAN_RADIUS_M * angularDistance;
}
