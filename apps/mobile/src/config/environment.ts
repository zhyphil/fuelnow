export type MobileEnvironment = "development" | "test" | "production";

export interface MobileConfig {
  environment: MobileEnvironment;
  apiBaseUrl: string;
  requestTimeoutMs: number;
}

export function resolveMobileConfig(
  input: {
    environment?: string;
    apiBaseUrl?: string;
  } = {},
): MobileConfig {
  const environment = input.environment ?? "development";
  if (!["development", "test", "production"].includes(environment)) {
    throw new Error("Invalid mobile environment");
  }
  const address = input.apiBaseUrl?.trim();
  if (!address && environment === "production") {
    throw new Error("Production requires an explicit API URL");
  }
  const url = new URL(address || "http://localhost:3000");
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error(
      "API URL must be an HTTP(S) origin without credentials, path or query",
    );
  }
  if (environment === "production" && url.protocol !== "https:") {
    throw new Error("Production API requires HTTPS");
  }
  return {
    environment: environment as MobileEnvironment,
    apiBaseUrl: url.origin,
    requestTimeoutMs: 12_000,
  };
}
