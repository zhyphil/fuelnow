export type CountryCode = "FR" | "ES";

export type ServiceType = "fuel" | "charging" | "air" | "wash";

export type FuelType =
  | "sp95"
  | "sp95_e10"
  | "sp98"
  | "e85"
  | "diesel"
  | "premium_diesel"
  | "lpg"
  | "cng"
  | "lng";

export type Freshness = "live" | "recent" | "stale" | "unknown";

export type Confidence = "high" | "medium" | "low";

export type OpeningStatus =
  | "open"
  | "closed"
  | "closing_soon"
  | "opening_soon"
  | "unknown";

export interface StructuredAddress {
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  locality: string | null;
  administrativeArea: string | null;
  countryCode: CountryCode;
  formatted: string | null;
}

export interface OpeningInterval {
  opensAt: string;
  closesAt: string;
  spansFullDay: boolean;
}

export interface OpeningDay {
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  status: "open" | "closed" | "unknown";
  intervals: OpeningInterval[];
}

export interface NormalizedOpeningHours {
  parseStatus: "parsed" | "partial";
  days: OpeningDay[];
  siteSchedule24Seven: boolean;
  unattendedFuelPayment24Seven: boolean;
  raw: string;
}

export interface NormalizedPrice {
  amount: number;
  currency: "EUR";
  unit: "liter";
  taxIncluded: null;
  membershipRequired: null;
  sourceObservedAt: string | null;
  freshness: Freshness;
  confidence: Confidence;
}

export interface NormalizedFuel {
  fuelType: FuelType;
  sourceFuelId: string;
  sourceLabel: string;
  available: boolean | null;
  outOfStock: boolean | null;
  unavailableReason:
    | "temporary_shortage"
    | "permanent_non_offering"
    | "unknown"
    | null;
  price: NormalizedPrice | null;
  sourceObservedAt: string | null;
}

export interface AirCapability {
  present: true;
  price: null;
  workingStatus: "unknown";
  lastVerifiedAt: null;
  sourceLabel: "Station de gonflage";
}

export interface WashCapability {
  present: true;
  washTypes: ["unknown"];
  price: null;
  workingStatus: "unknown";
  lastVerifiedAt: null;
  sourceLabels: Array<"Lavage automatique" | "Lavage manuel">;
}

export interface SourceSummary {
  primarySourceId: "fr-fuel-realtime-v2";
  sourceName: "DGCCRF — Prix des carburants en France, Flux instantané v2";
  sourceUrl: string;
  sourceObservedAt: string | null;
  fetchedAt: string;
  freshness: Freshness;
  confidence: Confidence;
  licenceName: "Licence Ouverte 2.0 (Etalab)";
  licenceUrl: string;
}

export interface NormalizedServicePoint {
  id: string;
  sourceId: string;
  country: "FR";
  serviceTypes: ServiceType[];
  name: null;
  brand: null;
  latitude: number;
  longitude: number;
  address: StructuredAddress;
  timezone: "Europe/Paris";
  openingHours: NormalizedOpeningHours | null;
  openingStatus: OpeningStatus;
  temporaryClosure: null;
  unattendedFuelPayment24Seven: boolean;
  fuels: NormalizedFuel[];
  air: AirCapability | null;
  wash: WashCapability | null;
  sourceServices: string[];
  sourceSummary: SourceSummary;
  createdAt: string;
  updatedAt: string;
}

export type AdapterIssueSeverity = "warning" | "error";

export interface AdapterIssue {
  code: string;
  severity: AdapterIssueSeverity;
  field: string;
  message: string;
}

export interface AdapterResult {
  data: NormalizedServicePoint | null;
  issues: AdapterIssue[];
}

export interface AdapterContext {
  fetchedAt: string;
  existingCreatedAt?: string;
  sourceSyncHealthy?: boolean;
}
