export interface SyncReliabilityInput {
  maxAttempts?: string;
  retryBaseDelayMs?: string;
  retryMaxDelayMs?: string;
  retryJitterRatio?: string;
  staleAfterSeconds?: string;
}

export interface SyncReliabilityConfig {
  retryPolicy: {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    jitterRatio: number;
  };
  staleAfterMs: number;
}

const DEFAULTS = Object.freeze({
  maxAttempts: 3,
  retryBaseDelayMs: 1_000,
  retryMaxDelayMs: 60_000,
  retryJitterRatio: 0.2,
  staleAfterSeconds: 3_600,
});

function parseInteger(
  label: string,
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = value === undefined || value.trim() === "" ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} must be an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function parseRatio(value: string | undefined): number {
  const parsed =
    value === undefined || value.trim() === ""
      ? DEFAULTS.retryJitterRatio
      : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error("SOURCE_SYNC_RETRY_JITTER_RATIO must be between 0 and 1");
  }
  return parsed;
}

export function resolveSyncReliabilityConfig(
  input: SyncReliabilityInput = {},
): SyncReliabilityConfig {
  const maxAttempts = parseInteger(
    "SOURCE_SYNC_MAX_ATTEMPTS",
    input.maxAttempts,
    DEFAULTS.maxAttempts,
    1,
    20,
  );
  const baseDelayMs = parseInteger(
    "SOURCE_SYNC_RETRY_BASE_DELAY_MS",
    input.retryBaseDelayMs,
    DEFAULTS.retryBaseDelayMs,
    1,
    86_400_000,
  );
  const maxDelayMs = parseInteger(
    "SOURCE_SYNC_RETRY_MAX_DELAY_MS",
    input.retryMaxDelayMs,
    DEFAULTS.retryMaxDelayMs,
    baseDelayMs,
    86_400_000,
  );
  const staleAfterSeconds = parseInteger(
    "SOURCE_SYNC_STALE_AFTER_SECONDS",
    input.staleAfterSeconds,
    DEFAULTS.staleAfterSeconds,
    60,
    604_800,
  );

  return {
    retryPolicy: {
      maxAttempts,
      baseDelayMs,
      maxDelayMs,
      jitterRatio: parseRatio(input.retryJitterRatio),
    },
    staleAfterMs: staleAfterSeconds * 1_000,
  };
}
