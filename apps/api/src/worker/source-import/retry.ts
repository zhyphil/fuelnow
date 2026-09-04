import { setTimeout as sleep } from "node:timers/promises";

import {
  runMeasuredSourceImport,
  type MeasuredSourceImportOptions,
  type SyncFailureClassification,
  type SyncFailureDecision,
} from "./syncRun.js";
import type { IncrementalImportResult } from "./types.js";

export interface SyncRetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number;
}

export interface RetryableErrorShape {
  retryable?: boolean;
  status?: number;
  code?: string;
}

export interface RetryingSourceImportOptions extends Omit<
  MeasuredSourceImportOptions,
  "attemptNumber" | "decideFailure"
> {
  retryPolicy: SyncRetryPolicy;
  classifyFailure?: (error: unknown) => SyncFailureClassification;
  delay?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
  random?: () => number;
}

const TRANSIENT_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
]);

function errorShape(error: unknown): RetryableErrorShape {
  return typeof error === "object" && error !== null
    ? (error as RetryableErrorShape)
    : {};
}

export function classifySyncFailure(error: unknown): SyncFailureClassification {
  if (error instanceof Error && error.name === "AbortError") {
    return "cancelled";
  }

  const shape = errorShape(error);
  if (shape.retryable === true) return "transient";
  if (shape.retryable === false) return "permanent";

  if (
    shape.status === 408 ||
    shape.status === 425 ||
    shape.status === 429 ||
    (shape.status !== undefined && shape.status >= 500 && shape.status <= 599)
  ) {
    return "transient";
  }
  if (shape.status !== undefined && shape.status >= 400 && shape.status <= 499) {
    return "permanent";
  }

  if (shape.code !== undefined && TRANSIENT_ERROR_CODES.has(shape.code)) {
    return "transient";
  }
  if (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "NetworkError")
  ) {
    return "transient";
  }

  return "permanent";
}

export function validateSyncRetryPolicy(policy: SyncRetryPolicy): void {
  if (
    !Number.isSafeInteger(policy.maxAttempts) ||
    policy.maxAttempts < 1 ||
    policy.maxAttempts > 20
  ) {
    throw new Error("maxAttempts must be an integer between 1 and 20");
  }
  if (!Number.isSafeInteger(policy.baseDelayMs) || policy.baseDelayMs < 1) {
    throw new Error("baseDelayMs must be a positive safe integer");
  }
  if (
    !Number.isSafeInteger(policy.maxDelayMs) ||
    policy.maxDelayMs < policy.baseDelayMs
  ) {
    throw new Error("maxDelayMs must be a safe integer at least baseDelayMs");
  }
  if (
    !Number.isFinite(policy.jitterRatio) ||
    policy.jitterRatio < 0 ||
    policy.jitterRatio > 1
  ) {
    throw new Error("jitterRatio must be between 0 and 1");
  }
}

export function calculateRetryDelayMs(
  policy: SyncRetryPolicy,
  failedAttemptNumber: number,
  randomValue: number,
): number {
  validateSyncRetryPolicy(policy);
  if (!Number.isSafeInteger(failedAttemptNumber) || failedAttemptNumber < 1) {
    throw new Error("failedAttemptNumber must be a positive safe integer");
  }
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new Error("randomValue must be at least 0 and less than 1");
  }

  const exponentialDelay =
    policy.baseDelayMs * 2 ** Math.min(failedAttemptNumber - 1, 52);
  const cappedDelay = Math.min(policy.maxDelayMs, exponentialDelay);
  const jitterFactor = 1 + policy.jitterRatio * (2 * randomValue - 1);
  return Math.max(
    1,
    Math.min(policy.maxDelayMs, Math.round(cappedDelay * jitterFactor)),
  );
}

async function defaultDelay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  await sleep(milliseconds, undefined, signal === undefined ? {} : { signal });
}

export async function runSourceImportWithRetry({
  retryPolicy,
  classifyFailure = classifySyncFailure,
  delay = defaultDelay,
  random = Math.random,
  ...importOptions
}: RetryingSourceImportOptions): Promise<IncrementalImportResult> {
  validateSyncRetryPolicy(retryPolicy);

  for (
    let attemptNumber = 1;
    attemptNumber <= retryPolicy.maxAttempts;
    attemptNumber += 1
  ) {
    let sourceFailure: unknown;
    let delayBeforeNextAttempt: number | null = null;

    try {
      return await runMeasuredSourceImport({
        ...importOptions,
        attemptNumber,
        decideFailure(error, { completedAt }) {
          sourceFailure = error;
          const classification = classifyFailure(error);
          const shouldRetry =
            classification === "transient" && attemptNumber < retryPolicy.maxAttempts;
          delayBeforeNextAttempt = shouldRetry
            ? calculateRetryDelayMs(retryPolicy, attemptNumber, random())
            : null;

          const decision: SyncFailureDecision = {
            classification,
            maxAttempts: retryPolicy.maxAttempts,
            nextAttemptAt:
              delayBeforeNextAttempt === null
                ? null
                : new Date(
                    Date.parse(completedAt) + delayBeforeNextAttempt,
                  ).toISOString(),
          };
          return decision;
        },
      });
    } catch (error) {
      if (error !== sourceFailure || delayBeforeNextAttempt === null) {
        throw error;
      }
      await delay(delayBeforeNextAttempt, importOptions.signal);
    }
  }

  throw new Error("Sync retry loop exited unexpectedly");
}
