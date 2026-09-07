import { afterEach, describe, expect, it, vi } from "vitest";
import sample from "../../../docs/api/examples/nearby-fuel-cheapest.json";
import detailSample from "../../../docs/api/examples/service-point-detail.json";
import { ApiFailure, createApiClient } from "../src/api/client";
import { resolveMobileConfig } from "../src/config/environment";

const config = resolveMobileConfig({
  environment: "test",
  apiBaseUrl: "https://api.example.invalid",
});
const query = {
  latitude: 43.6,
  longitude: 1.44,
  service: "fuel",
  fuelType: "diesel",
  sort: "cheapest",
} as const;
afterEach(() => vi.useRealTimers());

describe("mobile API boundary", () => {
  it("loads canonical detail and treats a missing point as a non-retryable failure", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(detailSample)))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ requestId: "req-404", code: "service_point_not_found" }),
          { status: 404 },
        ),
      );
    const client = createApiClient(config, fetcher);
    const id = detailSample.servicePoint.id;
    expect(await client.servicePoint(id)).toEqual(detailSample);
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      `https://api.example.invalid/v1/service-points/${id}`,
    );
    await expect(client.servicePoint(id)).rejects.toMatchObject({
      kind: "http",
      status: 404,
      retryable: false,
    });
  });
  it("encodes filters and returns the committed API example without altering unknown data", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(sample)));
    const result = await createApiClient(config, fetcher).nearby(query);
    expect(result).toEqual(sample);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, options] = fetcher.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://api.example.invalid/v1/nearby?latitude=43.6&longitude=1.44&service=fuel&fuelType=diesel&sort=cheapest",
    );
    expect(options?.credentials).toBe("omit");
  });

  it("reports rate limits with a safe request ID and does not expose the upstream message", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          requestId: "req-123",
          code: "rate_limit_exceeded",
          message: "private diagnostic",
        }),
        { status: 429 },
      ),
    );
    const error = await createApiClient(config, fetcher)
      .nearby(query)
      .catch((value: unknown) => value);
    expect(error).toMatchObject({
      kind: "http",
      status: 429,
      requestId: "req-123",
      retryable: true,
    });
    expect(String(error)).not.toContain("private diagnostic");
  });

  it("keeps network failures free of request URLs or coordinates", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("failed https://host/?latitude=43.6"));
    const error = await createApiClient(config, fetcher)
      .nearby(query)
      .catch((value: unknown) => value);
    expect(error).toBeInstanceOf(ApiFailure);
    expect(error).toMatchObject({ kind: "network", retryable: true });
    expect(String(error)).not.toContain("43.6");
  });

  it.each([
    "<html>proxy failure</html>",
    "null",
    "{}",
    JSON.stringify({ ...sample, resultCount: 9 }),
  ])("rejects malformed success envelopes: %s", async (body) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body));
    await expect(createApiClient(config, fetcher).nearby(query)).rejects.toMatchObject({
      kind: "invalid_response",
    });
  });

  it("does not start a request that was already cancelled", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const controller = new AbortController();
    controller.abort();
    await expect(
      createApiClient(config, fetcher).nearby(query, controller.signal),
    ).rejects.toMatchObject({ kind: "cancelled", retryable: false });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(["timeout", "cancelled"] as const)(
    "aborts pending work on %s and clears timers",
    async (kind) => {
      vi.useFakeTimers();
      const controller = new AbortController();
      const fetcher = vi.fn<typeof fetch>().mockImplementation(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            options?.signal?.addEventListener(
              "abort",
              () => reject(new Error("aborted")),
              { once: true },
            );
          }),
      );
      const pending = createApiClient(config, fetcher).nearby(query, controller.signal);
      const assertion = expect(pending).rejects.toMatchObject({ kind });
      if (kind === "timeout")
        await vi.advanceTimersByTimeAsync(config.requestTimeoutMs);
      else controller.abort();
      await assertion;
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("rejects invalid detail IDs before transport", () => {
    const fetcher = vi.fn<typeof fetch>();
    expect(() => createApiClient(config, fetcher).servicePoint("../private")).toThrow(
      "Invalid service point ID",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("mobile environment", () => {
  it("allows local development and requires explicit HTTPS for production", () => {
    expect(resolveMobileConfig().apiBaseUrl).toBe("http://localhost:3000");
    expect(() => resolveMobileConfig({ environment: "production" })).toThrow();
    expect(() =>
      resolveMobileConfig({
        environment: "production",
        apiBaseUrl: "http://example.invalid",
      }),
    ).toThrow();
    expect(
      resolveMobileConfig({
        environment: "production",
        apiBaseUrl: "https://example.invalid/",
      }).apiBaseUrl,
    ).toBe("https://example.invalid");
  });
  it.each([
    "file:///private",
    "https://user:secret@host.invalid",
    "https://host.invalid/?token=secret",
    "https://host.invalid/v1",
    "https://host.invalid/#secret",
  ])("rejects unsafe origin %s", (apiBaseUrl) => {
    expect(() => resolveMobileConfig({ apiBaseUrl })).toThrow();
  });
});
