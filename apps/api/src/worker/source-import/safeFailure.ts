const SAFE_CODES = new Set([
  "ERROR",
  "TYPEERROR",
  "RANGEERROR",
  "SYNTAXERROR",
  "ABORTERROR",
  "TIMEOUTERROR",
  "NETWORKERROR",
  "AGGREGATEERROR",
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
]);

/** Error names/messages are untrusted and may embed URLs, secrets or coordinates. */
export function safeFailureCode(value: unknown): string {
  return typeof value === "string" && SAFE_CODES.has(value.toUpperCase())
    ? value.toUpperCase()
    : "UNKNOWN_ERROR";
}

export function safeSourceFailure(error: unknown): { code: string; message: string } {
  return {
    code: safeFailureCode(error instanceof Error ? error.name : undefined),
    message: "Source import failed",
  };
}
