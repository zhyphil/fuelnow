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
  unattendedFuelPayment24Seven: boolean | null;
  raw: string;
}

export interface NormalizedPrice {
  amount: number;
  currency: "EUR";
  unit: "liter" | "kilogram";
  taxIncluded: boolean | null;
  membershipRequired: boolean | null;
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
  primarySourceId: string;
  sourceName: string;
  sourceUrl: string;
  sourcePublishedAt: string | null;
  sourceObservedAt: string | null;
  sourceUpdatedAt: string | null;
  sourceUpdatedAtBasis: "observed" | "published" | "unknown";
  fetchedAt: string;
  freshness: Freshness;
  confidence: Confidence;
  licenceName: string;
  licenceUrl: string;
}

export interface NormalizedServicePoint {
  id: string;
  sourceId: string;
  country: CountryCode;
  serviceTypes: ServiceType[];
  name: string | null;
  brand: string | null;
  latitude: number;
  longitude: number;
  address: StructuredAddress;
  timezone: "Europe/Paris" | "Europe/Madrid";
  openingHours: NormalizedOpeningHours | null;
  openingStatus: OpeningStatus;
  temporaryClosure: boolean | null;
  unattendedFuelPayment24Seven: boolean | null;
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

export interface SourceAdapter<TContext extends AdapterContext> {
  adapt(input: unknown, context: TContext): AdapterResult;
}
