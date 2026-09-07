import type { NearbyPoint } from "./presentation";
export function validCoordinates(
  point: { latitude: number; longitude: number } | null | undefined,
) {
  return (
    !!point &&
    Number.isFinite(point.latitude) &&
    Math.abs(point.latitude) <= 90 &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.longitude) <= 180
  );
}
export function mapPoints(points: NearbyPoint[]) {
  return points.filter((point) => validCoordinates(point.location));
}
export function mapRegion(points: NearbyPoint[]) {
  const valid = mapPoints(points);
  if (valid.length === 0) return null;
  const latitudes = valid.map((point) => point.location.latitude),
    longitudes = valid.map((point) => point.location.longitude);
  const south = Math.min(...latitudes),
    north = Math.max(...latitudes),
    west = Math.min(...longitudes),
    east = Math.max(...longitudes);
  return {
    latitude: (south + north) / 2,
    longitude: (west + east) / 2,
    latitudeDelta: Math.max(0.02, (north - south) * 1.4),
    longitudeDelta: Math.max(0.02, (east - west) * 1.4),
  };
}
export function mapEnabled(
  platform: string,
  expoGo: boolean,
  androidConfigured: boolean,
) {
  return (
    platform === "ios" || (platform === "android" && (expoGo || androidConfigured))
  );
}
