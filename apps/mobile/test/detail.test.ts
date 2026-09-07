import { expect, it, vi } from "vitest";
import sample from "../../../docs/api/examples/service-point-detail.json";
import { ResourceController } from "../src/search/results";
import { detailAddress, detailRequest, validPointId } from "../src/search/detail";
import { createApiClient } from "../src/api/client";
import { resolveMobileConfig } from "../src/config/environment";
it("validates optional detail fuel without accepting arrays or arbitrary route input", () => {
  const id = sample.servicePoint.id;
  expect(detailRequest(id, undefined)).toEqual({ id });
  for (const fuelType of ["diesel", "sp95_e10", "e85"])
    expect(detailRequest(id, fuelType)).toEqual({ id, fuelType });
  for (const fuelType of ["", "unknown", ["diesel"], null, 1])
    expect(detailRequest(id, fuelType)).toBeNull();
  expect(detailRequest([id], "diesel")).toBeNull();
});
it("loads the canonical detail including multiple services without an origin", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify(sample)));
  const client = createApiClient(resolveMobileConfig(), fetcher);
  const controller = new ResourceController(client.servicePoint);
  await controller.run(sample.servicePoint.id);
  expect(controller.getSnapshot()).toEqual({ status: "ready", response: sample });
  expect(String(fetcher.mock.calls[0]![0])).not.toContain("latitude");
  controller.clear();
  expect(controller.getSnapshot()).toEqual({ status: "idle" });
});
it("rejects missing or unsafe IDs and handles absent structured addresses", () => {
  expect(validPointId(sample.servicePoint.id)).toBe(true);
  for (const id of [undefined, [sample.servicePoint.id], "../../secret", "not-an-id"])
    expect(validPointId(id)).toBe(false);
  expect(detailAddress(null)).toBeNull();
  expect(
    detailAddress({
      street: "Rue A",
      houseNumber: "12",
      locality: "Paris",
      postalCode: "75001",
      administrativeArea: null,
      countryCode: "FR",
      formatted: null,
    }),
  ).toBe("12 Rue A, 75001 Paris");
});
