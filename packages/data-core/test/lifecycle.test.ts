import { describe, expect, it } from "vitest";

import {
  deriveFuelAvailability,
  deriveServicePointLifecycle,
  resolveSourceRecordLifecycle,
} from "../src/lifecycle/resolveLifecycle.js";

const active = {
  status: "active" as const,
  statusAt: "2026-09-04T00:00:00Z",
};

describe("source-record lifecycle", () => {
  it("marks a record missing only after omission from a complete snapshot", () => {
    expect(
      resolveSourceRecordLifecycle(active, {
        type: "omitted_from_complete_snapshot",
        effectiveAt: "2026-09-04T01:00:00Z",
      }).status,
    ).toBe("missing");
  });

  it("distinguishes explicit deletion from snapshot absence", () => {
    expect(
      resolveSourceRecordLifecycle(active, {
        type: "explicitly_deleted",
        effectiveAt: "2026-09-04T01:00:00Z",
      }).status,
    ).toBe("deleted");
  });

  it("reactivates a missing or deleted record when newer evidence sees it", () => {
    for (const status of ["missing", "deleted"] as const) {
      expect(
        resolveSourceRecordLifecycle(
          { status, statusAt: "2026-09-04T01:00:00Z" },
          { type: "seen", effectiveAt: "2026-09-04T02:00:00Z" },
        ).status,
      ).toBe("active");
    }
  });

  it("ignores stale events and keeps source withdrawal terminal", () => {
    expect(
      resolveSourceRecordLifecycle(
        { status: "deleted", statusAt: "2026-09-04T02:00:00Z" },
        { type: "seen", effectiveAt: "2026-09-04T01:00:00Z" },
      ).status,
    ).toBe("deleted");
    expect(
      resolveSourceRecordLifecycle(
        { status: "withdrawn", statusAt: "2026-09-04T02:00:00Z" },
        { type: "seen", effectiveAt: "2026-09-04T03:00:00Z" },
      ).status,
    ).toBe("withdrawn");
  });
});

describe("canonical lifecycle", () => {
  it("applies permanent closure before temporary closure and active evidence", () => {
    expect(
      deriveServicePointLifecycle({
        hasActiveSource: true,
        temporaryClosure: true,
        permanentClosure: true,
      }),
    ).toBe("permanently_closed");
    expect(
      deriveServicePointLifecycle({
        hasActiveSource: true,
        temporaryClosure: true,
        permanentClosure: false,
      }),
    ).toBe("temporarily_closed");
  });

  it("makes a point unverified when no active source remains", () => {
    expect(
      deriveServicePointLifecycle({
        hasActiveSource: false,
        temporaryClosure: false,
        permanentClosure: false,
      }),
    ).toBe("unverified");
  });
});

describe("Fuel stock lifecycle", () => {
  it("keeps unknown distinct from available and out of stock", () => {
    expect(deriveFuelAvailability("unknown")).toEqual({
      available: null,
      outOfStock: null,
      unavailableReason: null,
    });
  });

  it("maps temporary and permanent non-offering reasons explicitly", () => {
    expect(deriveFuelAvailability("temporary_shortage")).toEqual({
      available: false,
      outOfStock: true,
      unavailableReason: "temporary_shortage",
    });
    expect(deriveFuelAvailability("permanent_non_offering")).toEqual({
      available: false,
      outOfStock: true,
      unavailableReason: "permanent_non_offering",
    });
  });
});
