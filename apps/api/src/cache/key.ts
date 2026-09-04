import { createHash } from "node:crypto";

type CacheKeyValue =
  boolean | null | number | string | CacheKeyValue[] | { [key: string]: CacheKeyValue };

function canonicalize(value: CacheKeyValue): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Cache key numbers must be finite");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key]!)}`)
    .join(",")}}`;
}

export function createCacheKeyHash(namespace: string, key: CacheKeyValue): string {
  if (namespace.trim().length === 0 || namespace.length > 100) {
    throw new Error("Cache namespace must contain 1 to 100 characters");
  }

  return createHash("sha256")
    .update(namespace)
    .update("\0")
    .update(canonicalize(key))
    .digest("hex");
}
