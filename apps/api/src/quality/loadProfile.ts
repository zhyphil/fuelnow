export function localLoadDatabaseUrl(value: string): URL {
  const url = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Load checks require an explicit loopback PostgreSQL URL without overrides",
    );
  return url;
}
export function summarizeLoad(durations: readonly number[], elapsedMs: number) {
  if (
    !durations.length ||
    !Number.isFinite(elapsedMs) ||
    elapsedMs <= 0 ||
    durations.some((ms) => !Number.isFinite(ms) || ms < 0)
  )
    throw new Error("Invalid load measurements");
  const sorted = durations.toSorted((a, b) => a - b);
  const percentile = (p: number) =>
    Math.round(sorted[Math.ceil(sorted.length * p) - 1]! * 100) / 100;
  return {
    requests: durations.length,
    elapsedMs: Math.round(elapsedMs * 100) / 100,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    p99Ms: percentile(0.99),
    requestsPerSecond: Math.round(((durations.length * 1000) / elapsedMs) * 100) / 100,
  };
}
