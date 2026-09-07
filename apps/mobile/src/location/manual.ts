// Reviewed city-centre anchors from ADR 0005. This is an offline city list,
// not geocoding, a device location or a service-point coordinate catalogue.
export const manualPlaces = [
  {
    id: "FR-PARIS",
    name: "Paris",
    country: "FR",
    latitude: 48.8566,
    longitude: 2.3522,
  },
  {
    id: "FR-TOULOUSE",
    name: "Toulouse",
    country: "FR",
    latitude: 43.6047,
    longitude: 1.4442,
  },
  {
    id: "FR-CARCASSONNE",
    name: "Carcassonne",
    country: "FR",
    latitude: 43.213,
    longitude: 2.3491,
  },
  {
    id: "FR-PERPIGNAN",
    name: "Perpignan",
    country: "FR",
    latitude: 42.6887,
    longitude: 2.8948,
  },
  {
    id: "ES-LA-JONQUERA",
    name: "La Jonquera",
    country: "ES",
    latitude: 42.4172,
    longitude: 2.8738,
  },
  {
    id: "ES-GIRONA",
    name: "Girona",
    country: "ES",
    latitude: 41.9794,
    longitude: 2.8214,
  },
  {
    id: "ES-BARCELONA",
    name: "Barcelona",
    country: "ES",
    latitude: 41.3874,
    longitude: 2.1686,
  },
  {
    id: "ES-MADRID",
    name: "Madrid",
    country: "ES",
    latitude: 40.4168,
    longitude: -3.7038,
  },
] as const;

export function findManualPlaces(query: string) {
  return manualPlaces.filter((place) =>
    `${place.name} ${place.country}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
}
function coordinate(text: string, limit: number): number | null {
  const value = text.trim().replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}
export function parseManualCoordinates(latitudeText: string, longitudeText: string) {
  const latitude = coordinate(latitudeText, 90),
    longitude = coordinate(longitudeText, 180);
  return latitude === null || longitude === null ? null : { latitude, longitude };
}
