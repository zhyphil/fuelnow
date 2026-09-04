import { describe, expect, it } from "vitest";

import {
  matchCanonicalServicePoint,
  selectCanonicalField,
  type CanonicalServicePointMatchCandidate,
  type ServicePointMatchSubject,
} from "../src/merge/matchServicePoint.js";

const incoming: ServicePointMatchSubject = {
  country: "FR",
  latitude: 43.6047,
  longitude: 1.4442,
  name: "Station République",
  brand: "Example Energy",
  address: {
    street: "Rue de la République",
    houseNumber: "10",
    postalCode: "31000",
    locality: "Toulouse",
  },
  trustedIdentifiers: [],
};

function candidate(
  overrides: Partial<CanonicalServicePointMatchCandidate> = {},
): CanonicalServicePointMatchCandidate {
  return {
    id: "candidate-a",
    ...incoming,
    latitude: 43.60471,
    longitude: 1.44421,
    ...overrides,
  };
}

describe("cross-source service-point matching", () => {
  it("matches a nearby exact address despite accents and punctuation", () => {
    const result = matchCanonicalServicePoint(incoming, [
      candidate({
        name: null,
        brand: null,
        address: {
          street: "RUE DE LA REPUBLIQUE",
          houseNumber: "10",
          postalCode: "31 000",
          locality: "TOULOUSE",
        },
      }),
    ]);

    expect(result.outcome).toBe("matched");
    if (result.outcome === "matched") {
      expect(result.servicePointId).toBe("candidate-a");
      expect(result.reasons).toContain("address_exact");
    }
  });

  it("never auto-merges on proximity alone", () => {
    const result = matchCanonicalServicePoint(
      {
        ...incoming,
        name: null,
        brand: null,
        address: { ...incoming.address, street: null },
      },
      [
        candidate({
          name: null,
          brand: null,
          address: { ...incoming.address, street: null },
        }),
      ],
    );

    expect(result.outcome).toBe("unmatched");
    expect(result.candidates[0]?.reasons).toContain(
      "proximity_without_strong_identity",
    );
  });

  it("rejects an otherwise close address with a conflicting house number", () => {
    const result = matchCanonicalServicePoint(incoming, [
      candidate({ address: { ...incoming.address, houseNumber: "12" } }),
    ]);

    expect(result.outcome).toBe("unmatched");
    expect(result.candidates[0]?.reasons).toContain("address_house_number_conflict");
  });

  it("matches a trusted shared identifier within its movement tolerance", () => {
    const result = matchCanonicalServicePoint(
      {
        ...incoming,
        address: { ...incoming.address, street: null },
        trustedIdentifiers: [{ scheme: "ocpi-evse", value: "FR*ABC*E123" }],
      },
      [
        candidate({
          latitude: 43.608,
          longitude: 1.4442,
          address: { ...incoming.address, street: null },
          trustedIdentifiers: [{ scheme: "OCPI EVSE", value: "fr abc e123" }],
        }),
      ],
    );

    expect(result.outcome).toBe("matched");
    if (result.outcome === "matched") {
      expect(result.reasons).toContain("trusted_identifier_exact");
    }
  });

  it("does not treat blank trusted identifier parts as identity", () => {
    const result = matchCanonicalServicePoint(
      {
        ...incoming,
        address: { ...incoming.address, street: null },
        trustedIdentifiers: [{ scheme: " ", value: " " }],
      },
      [
        candidate({
          address: { ...incoming.address, street: null },
          trustedIdentifiers: [{ scheme: "", value: "" }],
        }),
      ],
    );

    expect(result.outcome).toBe("unmatched");
  });

  it("does not merge across countries", () => {
    const result = matchCanonicalServicePoint(incoming, [candidate({ country: "ES" })]);

    expect(result.outcome).toBe("unmatched");
    expect(result.candidates[0]?.reasons).toEqual(["country_mismatch"]);
  });

  it("requires review when the two best eligible candidates are too close", () => {
    const result = matchCanonicalServicePoint(incoming, [
      candidate({ id: "candidate-a" }),
      candidate({ id: "candidate-b", latitude: 43.60472 }),
    ]);

    expect(result.outcome).toBe("review_required");
    if (result.outcome === "review_required") {
      expect(result.candidateServicePointIds).toEqual(["candidate-a", "candidate-b"]);
    }
  });
});

describe("canonical field selection", () => {
  const current = {
    value: "current",
    evidenceAt: "2026-09-04T00:10:00Z",
    confidenceScore: 80,
    sourceId: "source-b",
  };

  it("accepts newer evidence when confidence does not decrease", () => {
    const selected = selectCanonicalField(current, {
      ...current,
      value: "incoming",
      evidenceAt: "2026-09-04T00:20:00Z",
    });

    expect(selected.value).toBe("incoming");
  });

  it("keeps newer evidence when the incoming value is older or lower confidence", () => {
    expect(
      selectCanonicalField(current, {
        ...current,
        value: "older-high-confidence",
        evidenceAt: "2026-09-04T00:00:00Z",
        confidenceScore: 100,
      }).value,
    ).toBe("current");
    expect(
      selectCanonicalField(current, {
        ...current,
        value: "newer-low-confidence",
        evidenceAt: "2026-09-04T00:20:00Z",
        confidenceScore: 79,
      }).value,
    ).toBe("current");
  });

  it("fills an unknown current value and resolves exact ties deterministically", () => {
    expect(
      selectCanonicalField({ ...current, value: null }, { ...current, value: "known" })
        .value,
    ).toBe("known");
    expect(
      selectCanonicalField(current, {
        ...current,
        value: "tie-winner",
        sourceId: "source-a",
      }).value,
    ).toBe("tie-winner");
  });
});
