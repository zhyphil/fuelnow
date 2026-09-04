export interface RoutingConfigInput {
  monthlyElementBudget?: string;
  elementsPerSearchMax?: string;
  cacheTtlSeconds?: string;
}

export interface RoutingConfig {
  monthlyElementBudget: number;
  elementsPerSearchMax: number;
  cacheTtlSeconds: number;
  paidRoutingEnabled: boolean;
}

function integerSetting(
  label: string,
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const normalized = value?.trim();
  const parsed =
    normalized === undefined || normalized === "" ? fallback : Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} must be an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
}

export function resolveRoutingConfig(input: RoutingConfigInput = {}): RoutingConfig {
  const monthlyElementBudget = integerSetting(
    "MAPBOX_MONTHLY_ELEMENT_BUDGET",
    input.monthlyElementBudget,
    0,
    0,
    1_000_000_000,
  );
  const elementsPerSearchMax = integerSetting(
    "MAPBOX_ELEMENTS_PER_SEARCH_MAX",
    input.elementsPerSearchMax,
    9,
    1,
    9,
  );
  const cacheTtlSeconds = integerSetting(
    "ROUTE_CACHE_TTL_SECONDS",
    input.cacheTtlSeconds,
    300,
    1,
    900,
  );

  return Object.freeze({
    monthlyElementBudget,
    elementsPerSearchMax,
    cacheTtlSeconds,
    paidRoutingEnabled: monthlyElementBudget > 0,
  });
}
