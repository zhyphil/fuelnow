export const MAX_METRIC_INPUT_BYTES = 2 * 1024 * 1024;
const ROUTES = [
  "/v1/nearby",
  "/v1/service-points/:id",
  "/openapi.json",
  "other",
] as const;
type Route = (typeof ROUTES)[number];
interface Bucket {
  requests: number;
  serverErrors: number;
  clientErrors: number;
  rateLimited: number;
  durations: number[];
}
export interface ApiLogMetricOptions {
  now?: Date;
  windowSeconds?: number;
  minimumSamples?: number;
  serverErrorRateThreshold?: number;
  p95ThresholdMs?: number;
}
function newBucket(): Bucket {
  return {
    requests: 0,
    serverErrors: 0,
    clientErrors: 0,
    rateLimited: 0,
    durations: [],
  };
}
function summarize(bucket: Bucket) {
  const sorted = bucket.durations.slice().sort((a, b) => a - b);
  const percentile = (p: number) =>
    sorted.length ? sorted[Math.ceil(p * sorted.length) - 1]! : null;
  return {
    requests: bucket.requests,
    serverErrors: bucket.serverErrors,
    clientErrors: bucket.clientErrors,
    rateLimited: bucket.rateLimited,
    serverErrorRate: bucket.requests ? bucket.serverErrors / bucket.requests : null,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    p99Ms: percentile(0.99),
  };
}
export function summarizeApiLogs(
  input: string,
  {
    now = new Date(),
    windowSeconds = 300,
    minimumSamples = 20,
    serverErrorRateThreshold = 0.05,
    p95ThresholdMs = 1000,
  }: ApiLogMetricOptions = {},
) {
  if (
    !Number.isFinite(now.getTime()) ||
    !Number.isSafeInteger(windowSeconds) ||
    windowSeconds < 1 ||
    windowSeconds > 86400 ||
    !Number.isSafeInteger(minimumSamples) ||
    minimumSamples < 1 ||
    minimumSamples > 10000 ||
    !Number.isFinite(serverErrorRateThreshold) ||
    serverErrorRateThreshold <= 0 ||
    serverErrorRateThreshold > 1 ||
    !Number.isFinite(p95ThresholdMs) ||
    p95ThresholdMs < 1 ||
    p95ThresholdMs > 60000
  )
    throw new Error("Invalid API metrics options");
  if (Buffer.byteLength(input, "utf8") > MAX_METRIC_INPUT_BYTES)
    throw new Error("API metrics input exceeds safe limit");
  const lines = input.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length > 10000) throw new Error("Too many API metric log lines");
  const buckets = new Map<Route, Bucket>(ROUTES.map((route) => [route, newBucket()]));
  const total = newBucket();
  let invalidLines = 0,
    ignoredLines = 0,
    outsideWindow = 0;
  const end = now.getTime(),
    start = end - windowSeconds * 1000;
  for (const line of lines) {
    if (Buffer.byteLength(line, "utf8") > 16384) {
      invalidLines++;
      continue;
    }
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      invalidLines++;
      continue;
    }
    if (typeof value !== "object" || !value || Array.isArray(value)) {
      invalidLines++;
      continue;
    }
    const event = value as Record<string, unknown>;
    if (event.msg !== "API request completed") {
      ignoredLines++;
      continue;
    }
    if (
      typeof event.time !== "number" ||
      !Number.isFinite(event.time) ||
      typeof event.statusCode !== "number" ||
      !Number.isInteger(event.statusCode) ||
      event.statusCode < 100 ||
      event.statusCode > 599 ||
      typeof event.responseTimeMs !== "number" ||
      !Number.isFinite(event.responseTimeMs) ||
      event.responseTimeMs < 0 ||
      event.responseTimeMs > 3600000
    ) {
      invalidLines++;
      continue;
    }
    if (event.time < start || event.time > end) {
      outsideWindow++;
      continue;
    }
    const route = ROUTES.includes(event.route as Route)
      ? (event.route as Route)
      : "other";
    for (const bucket of [total, buckets.get(route)!]) {
      bucket.requests++;
      bucket.serverErrors += Number(event.statusCode >= 500);
      bucket.clientErrors += Number(event.statusCode >= 400 && event.statusCode < 500);
      bucket.rateLimited += Number(event.statusCode === 429);
      bucket.durations.push(event.responseTimeMs);
    }
  }
  const aggregate = summarize(total);
  const findings: string[] = [];
  if (aggregate.requests < minimumSamples) findings.push("insufficient_samples");
  if (invalidLines) findings.push("invalid_log_records");
  if (aggregate.rateLimited > 0) findings.push("rate_limiting_observed");
  if (aggregate.requests >= minimumSamples) {
    if ((aggregate.serverErrorRate ?? 0) >= serverErrorRateThreshold)
      findings.push("server_error_rate_high");
    if ((aggregate.p95Ms ?? 0) > p95ThresholdMs) findings.push("p95_latency_high");
  }
  const routes = ROUTES.map((route) => ({ route, ...summarize(buckets.get(route)!) }));
  const affectedRoutes = routes
    .filter(
      (row) =>
        row.requests >= minimumSamples &&
        ((row.serverErrorRate ?? 0) >= serverErrorRateThreshold ||
          (row.p95Ms ?? 0) > p95ThresholdMs),
    )
    .map((row) => row.route);
  if (affectedRoutes.length) findings.push("route_threshold_exceeded");
  return {
    scope: "bounded application-log sample; not an uptime or production SLA proof",
    windowStart: new Date(start).toISOString(),
    windowEnd: now.toISOString(),
    thresholds: { minimumSamples, serverErrorRateThreshold, p95ThresholdMs },
    aggregate,
    routes,
    affectedRoutes,
    invalidLines,
    ignoredLines,
    outsideWindow,
    findings,
    needsAttention: findings.length > 0,
    releaseAuthorized: false as const,
  };
}
