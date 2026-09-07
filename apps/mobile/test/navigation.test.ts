import { expect, it, vi } from "vitest";
import { navigationUrl, openNavigation } from "../src/search/navigation";
const target = {
  id: "point",
  location: { latitude: 40.4, longitude: -3.7 },
  lifecycleStatus: "active",
};
it("never opens real navigation for a synthetic test station", async () => {
  const open = vi.fn();
  expect(await openNavigation({ ...target, synthetic: true }, "apple", open)).toBe(
    false,
  );
  expect(navigationUrl({ ...target, synthetic: true }, "google")).toBeNull();
  expect(open).not.toHaveBeenCalled();
});
it.each(["apple", "google"] as const)(
  "creates safe destination-only %s links with driving mode",
  (provider) => {
    const url = new URL(navigationUrl(target, provider)!);
    expect(url.protocol).toBe("https:");
    expect(url.searchParams.get(provider === "apple" ? "daddr" : "destination")).toBe(
      "40.4,-3.7",
    );
    expect(url.searchParams.has("origin")).toBe(false);
  },
);
it("refuses invalid or closed destinations without opening anything", async () => {
  const open = vi.fn();
  expect(
    await openNavigation(
      { ...target, lifecycleStatus: "permanently_closed" },
      "google",
      open,
    ),
  ).toBe(false);
  expect(
    navigationUrl({ ...target, location: { latitude: NaN, longitude: 2 } }, "apple"),
  ).toBeNull();
  expect(open).not.toHaveBeenCalled();
});
it("handles app/browser handoff success and failure without exposing raw errors", async () => {
  expect(
    await openNavigation(target, "google", vi.fn().mockResolvedValue(undefined)),
  ).toBe(true);
  expect(
    await openNavigation(
      target,
      "google",
      vi.fn().mockRejectedValue(new Error("private URL")),
    ),
  ).toBe(false);
});
